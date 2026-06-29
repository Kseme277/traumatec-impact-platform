import { apiFetch } from "./client";

export {
  clearGuidesHandoffTicket,
  readGuidesHandoffTicket,
  storeGuidesHandoffTicket,
} from "../lib/guidesHandoffStorage";

export interface GuidesHandoffPrepare {
  handoff_ticket: string;
  expires_in: number;
  email: string;
  role: string;
  company_id: string | null;
  company_slug: string;
  web_url: string;
  proxy_web_url: string;
  handoff_url: string;
  public_url: string;
  admin_url: string;
}

export interface GuidesHandoffSession {
  access_token: string;
  email: string;
  role: string;
  member_role?: string;
  redirect: string;
  company_slug: string;
}

/** Prépare un handoff sécurisé — le JWT GuideHub reste côté serveur jusqu'à consommation. */
export async function prepareGuidesHandoff(token: string): Promise<GuidesHandoffPrepare> {
  return apiFetch<GuidesHandoffPrepare>("/v1/guides/handoff", token, { method: "POST" });
}

/** @deprecated Utiliser prepareGuidesHandoff */
export async function fetchGuidesSession(token: string): Promise<GuidesHandoffPrepare> {
  return apiFetch<GuidesHandoffPrepare>("/v1/guides/session", token);
}

/** Échange le ticket opaque contre le JWT GuideHub (endpoint public, sans auth TIP). */
export async function consumeGuidesHandoff(ticket: string): Promise<GuidesHandoffSession> {
  const response = await fetch("/api/v1/guides/handoff/consume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify({ ticket }),
  });
  if (!response.ok) {
    throw new Error("Ticket handoff expiré ou déjà utilisé.");
  }
  const data = (await response.json()) as GuidesHandoffSession;
  if (!data?.access_token) {
    throw new Error("Réponse handoff invalide.");
  }
  return data;
}

export function buildGuidesHandoffPageUrl(proxyWebUrl: string): string {
  const base = proxyWebUrl.replace(/\/$/, "");
  return `${base}/guidehub-handoff.html`;
}
