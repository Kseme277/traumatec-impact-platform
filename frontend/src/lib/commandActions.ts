import { predictEvent } from "../api/analytics";
import { runAuditExport } from "../api/audit";
import { runPackageGeneration } from "../api/docgen";
import { closeEvent, fetchEvent, fetchEvents, updateEvent } from "../api/events";
import { runStorageGc } from "../api/storageGc";
import { checkInvitationEmail, createUser, fetchAllUsers, resendInvitation, toggleUserStatus } from "../api/users";
import { ApiError } from "../api/client";
import { eventMatchesSearch, isGeneratableEvent } from "../features/events/eventDates";
import { suggestPreparationTheme } from "../features/events/themeOptions";
import type { Evenement } from "../features/events/types";
import type { Utilisateur } from "../features/auth/types";
import type { CommandIntent } from "./commandParser";
import type { useAuth } from "@clerk/clerk-react";

type GetTokenFn = ReturnType<typeof useAuth>["getToken"];

export type CommandActionResult = {
  success: boolean;
  message: string;
  detail?: string;
};

function scoreEvent(event: Evenement, query: string): number {
  const q = query.toLowerCase();
  let score = 0;
  if (event.title.toLowerCase().includes(q)) score += 4;
  if (event.city?.toLowerCase().includes(q)) score += 3;
  if (event.country?.toLowerCase().includes(q)) score += 2;
  if (event.project_number.toLowerCase().includes(q)) score += 2;
  if (eventMatchesSearch(event, query)) score += 1;
  return score;
}

export function rankEvents(events: Evenement[], query: string): Evenement[] {
  return [...events]
    .filter((event) => eventMatchesSearch(event, query))
    .sort((a, b) => scoreEvent(b, query) - scoreEvent(a, query));
}

export function rankUsers(users: Utilisateur[], query: string): Utilisateur[] {
  const q = query.toLowerCase();
  const parts = q.split(/\s+/).filter(Boolean);
  return users
    .filter((user) => {
      const haystack = `${user.prenom} ${user.nom} ${user.email}`.toLowerCase();
      if (parts.length === 0) return false;
      return parts.every(
        (part) =>
          haystack.includes(part) ||
          user.prenom.toLowerCase().includes(part) ||
          user.nom.toLowerCase().includes(part),
      );
    })
    .sort((a, b) => {
      const aName = `${a.prenom} ${a.nom}`.toLowerCase();
      const bName = `${b.prenom} ${b.nom}`.toLowerCase();
      const aExact = aName.includes(q) ? 1 : 0;
      const bExact = bName.includes(q) ? 1 : 0;
      return bExact - aExact;
    });
}

function hasResponsibleContact(event: Evenement): boolean {
  const meta = event.metadata_json;
  const email = String(event.responsible_email ?? meta?.responsible_email ?? "").trim();
  const phone = String(event.responsible_phone ?? meta?.responsible_phone ?? "").trim();
  return Boolean(email && phone);
}

async function ensureEventReadyForGeneration(
  getToken: GetTokenFn,
  event: Evenement,
): Promise<{ event: Evenement; error?: string }> {
  if (!isGeneratableEvent(event)) {
    return {
      event,
      error: "Cet événement n'est pas éligible (dates passées ou statut incompatible).",
    };
  }

  let current = event;

  if (!current.preparation_theme) {
    const token = await getToken();
    const detailed = await fetchEvent(token, event.id);
    const theme = suggestPreparationTheme(detailed);
    if (!theme) {
      return {
        event: detailed,
        error: "Thème de préparation manquant. Définissez Operatory, PBO ou IEC sur la fiche événement.",
      };
    }
    current = await updateEvent(token, event.id, { preparation_theme: theme });
  }

  if (!hasResponsibleContact(current)) {
    return {
      event: current,
      error:
        "Courriel et téléphone du responsable manquants. Renseignez-les sur la page Génération documents.",
    };
  }

  return { event: current };
}

export async function searchEventsForCommand(getToken: GetTokenFn, query: string): Promise<Evenement[]> {
  const token = await getToken();
  const response = await fetchEvents(token, { q: query, upcoming: true });
  const ranked = rankEvents(response.items, query);
  if (ranked.length > 0) return ranked.slice(0, 5);
  const fallback = await fetchEvents(token, { q: query });
  return rankEvents(fallback.items, query).slice(0, 5);
}

export async function searchUsersForCommand(getToken: GetTokenFn, query: string): Promise<Utilisateur[]> {
  const token = await getToken();
  if (!token) return [];
  const users = await fetchAllUsers(token);
  return rankUsers(users, query).slice(0, 5);
}

export async function runGeneratePackageCommand(
  getToken: GetTokenFn,
  event: Evenement,
  onProgress?: (message: string) => void,
): Promise<CommandActionResult> {
  try {
    const { event: readyEvent, error } = await ensureEventReadyForGeneration(getToken, event);
    if (error) {
      return { success: false, message: error };
    }

    onProgress?.(`Génération lancée pour « ${readyEvent.title} »…`);

    const job = await runPackageGeneration(getToken, readyEvent.id, (current) => {
      const lastLog = current.logs?.[current.logs.length - 1];
      if (lastLog?.message) {
        onProgress?.(lastLog.message);
      }
    });

    if (job.status === "completed") {
      return {
        success: true,
        message: `Paquet généré pour « ${readyEvent.title} ».`,
        detail: `${job.certificate_count} document(s) — ${job.zip_filename ?? "paquet.zip"}`,
      };
    }

    return {
      success: false,
      message: job.error_message ?? "La génération a échoué.",
    };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Génération impossible.";
    return { success: false, message };
  }
}

export async function runToggleUserCommand(
  getToken: GetTokenFn,
  user: Utilisateur,
  intent: Extract<CommandIntent, { type: "block_user" | "unblock_user" }>,
): Promise<CommandActionResult> {
  const token = await getToken();
  if (!token) {
    return { success: false, message: "Session expirée." };
  }

  const wantsBlock = intent.type === "block_user";
  if (wantsBlock && !user.est_actif) {
    return {
      success: true,
      message: `Le compte de ${user.prenom} ${user.nom} est déjà désactivé.`,
    };
  }
  if (!wantsBlock && user.est_actif) {
    return {
      success: true,
      message: `Le compte de ${user.prenom} ${user.nom} est déjà actif.`,
    };
  }

  try {
    const result = await toggleUserStatus(token, user.id);
    return {
      success: true,
      message: result.message,
      detail: `${user.prenom} ${user.nom} — ${result.est_actif ? "actif" : "désactivé"}`,
    };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Action impossible.";
    return { success: false, message };
  }
}

export async function runCreateUserCommand(
  getToken: GetTokenFn,
  payload: { prenom: string; nom: string; email: string; role: "preparateur" | "administrateur" },
): Promise<CommandActionResult> {
  const token = await getToken();
  if (!token) {
    return { success: false, message: "Session expirée." };
  }

  try {
    const check = await checkInvitationEmail(token, payload.email);
    if (!check.can_create && !check.clerk_exists) {
      return { success: false, message: check.message ?? "Impossible de créer cet utilisateur." };
    }

    const result = await createUser(token, {
      email: check.suggested_email ?? payload.email,
      prenom: payload.prenom,
      nom: payload.nom,
      role: payload.role,
    });

    const inviteHint = result.invitation_sent
      ? "Invitation envoyée par email."
      : result.invitation_hint ?? "Compte créé.";

    return {
      success: true,
      message: `Utilisateur ${result.prenom} ${result.nom} créé.`,
      detail: `${result.email} — ${inviteHint}`,
    };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Création impossible.";
    return { success: false, message };
  }
}

export async function runResendInvitationCommand(
  getToken: GetTokenFn,
  user: Utilisateur,
): Promise<CommandActionResult> {
  const token = await getToken();
  if (!token) {
    return { success: false, message: "Session expirée." };
  }

  try {
    const result = await resendInvitation(token, user.id);
    return {
      success: true,
      message: result.message,
      detail: `${user.prenom} ${user.nom} — ${user.email}`,
    };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Renvoi impossible.";
    return { success: false, message };
  }
}

export async function runCloseEventCommand(
  getToken: GetTokenFn,
  event: Evenement,
): Promise<CommandActionResult> {
  const token = await getToken();
  if (!token) {
    return { success: false, message: "Session expirée." };
  }

  try {
    await closeEvent(token, event.id);
    return {
      success: true,
      message: `Événement « ${event.title} » clôturé.`,
      detail: event.project_number,
    };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Clôture impossible.";
    return { success: false, message };
  }
}

export async function runStorageGcCommand(
  getToken: GetTokenFn,
  purgeAll: boolean,
): Promise<CommandActionResult> {
  const token = await getToken();
  if (!token) {
    return { success: false, message: "Session expirée." };
  }

  try {
    const result = await runStorageGc(token, { purgeAll });
    const purged = result.stats.jobs_purged ?? 0;
    const deleted = result.stats.objects_deleted ?? 0;
    return {
      success: true,
      message: result.message,
      detail: `${purged} génération(s), ${deleted} fichier(s) MinIO supprimé(s).`,
    };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Nettoyage impossible.";
    return { success: false, message };
  }
}

export async function runAuditExportCommand(getToken: GetTokenFn): Promise<CommandActionResult> {
  const token = await getToken();
  if (!token) {
    return { success: false, message: "Session expirée." };
  }

  try {
    const result = await runAuditExport(token);
    return {
      success: true,
      message: "Export d'audit généré.",
      detail: `${result.record_count ?? 0} entrée(s) exportée(s).`,
    };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Export impossible.";
    return { success: false, message };
  }
}

export async function runAnalyzeBudgetCommand(
  getToken: GetTokenFn,
  event: Evenement,
): Promise<CommandActionResult> {
  const token = await getToken();
  if (!token) {
    return { success: false, message: "Session expirée." };
  }

  try {
    const result = await predictEvent(token, { event_id: event.id });
    const risk =
      result.risk_score >= 70 ? "élevé" : result.risk_score >= 40 ? "modéré" : "faible";
    return {
      success: true,
      message: `Analyse — ${event.title}`,
      detail: [
        `Risque d'incohérence budgétaire : ${risk} (${result.risk_score}%)`,
        `Participants attendus : ${result.predicted_participants} personnes`,
      ].join("\n"),
    };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Analyse impossible.";
    return { success: false, message };
  }
}

export async function listUpcomingEvents(getToken: GetTokenFn): Promise<CommandActionResult> {
  const token = await getToken();
  try {
    const response = await fetchEvents(token, { upcoming: true });
    if (response.items.length === 0) {
      return { success: true, message: "Aucun événement à venir." };
    }
    const lines = response.items.slice(0, 8).map((event) => {
      const place = [event.city, event.country].filter(Boolean).join(", ");
      return `• ${event.title}${place ? ` (${place})` : ""} — ${event.project_number}`;
    });
    return {
      success: true,
      message: `${response.total} événement(s) à venir :`,
      detail: lines.join("\n"),
    };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Liste impossible.";
    return { success: false, message };
  }
}
