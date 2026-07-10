import { useAuth } from "@clerk/clerk-react";
import { useCallback, useState } from "react";
import { getApiToken } from "../../lib/clerkToken";
import {
  closeEvent,
  createEvent,
  deleteEvent,
  fetchEvent,
  fetchEvents,
  fetchEventStats,
  importAnnualPlan,
  updateEvent,
} from "../../api/events";
import { ApiError } from "../../api/client";
import type {
  DashboardEventStats,
  Evenement,
  EvenementFilters,
  EvenementPayload,
  ImportJobProgress,
  ImportResult,
} from "./types";
import { confirmAction, showError, showSuccess } from "../../lib/swal";
import { revalidateTipKeys, useTipSWR } from "../../lib/swr";

export type UseEventsOptions = {
  /** Active le chargement SWR de la liste (clé = filters). */
  filters?: EvenementFilters;
  /** Charge les stats dashboard. */
  withStats?: boolean;
};

export function useEvents(options: UseEventsOptions = {}) {
  const { getToken } = useAuth();
  const { filters, withStats = false } = options;
  const withList = filters !== undefined;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportJobProgress | null>(null);

  const listQuery = useTipSWR(
    withList ? (["events", filters] as const) : null,
    async (token) => fetchEvents(token, filters ?? {}),
    {
      onError: async (err) => {
        await showError(
          "Chargement impossible",
          err instanceof ApiError ? err.message : "Erreur réseau",
        );
      },
    },
  );

  const statsQuery = useTipSWR(
    withStats ? (["event-stats"] as const) : null,
    async (token) => {
      if (!token) return null;
      return fetchEventStats(token);
    },
    {
      onError: async (err) => {
        await showError(
          "Statistiques indisponibles",
          err instanceof ApiError
            ? err.message
            : "Impossible de charger le tableau de bord. Vérifiez le service events.",
        );
      },
    },
  );

  const loadEvents = useCallback(async (_filters?: EvenementFilters) => {
    if (_filters !== undefined) {
      await revalidateTipKeys("events");
      return;
    }
    await listQuery.mutate();
  }, [listQuery]);

  const loadStats = useCallback(async () => {
    await statsQuery.mutate();
  }, [statsQuery]);

  const loadEvent = useCallback(
    async (eventId: string) => {
      const token = await getApiToken(getToken);
      return fetchEvent(token, eventId);
    },
    [getToken],
  );

  const invalidateEvents = useCallback(async () => {
    await revalidateTipKeys("events", "event-stats", "event");
  }, []);

  const create = useCallback(
    async (payload: EvenementPayload) => {
      setIsSubmitting(true);
      try {
        const token = await getApiToken(getToken);
        const event = await createEvent(token, payload);
        await showSuccess("Événement créé");
        await invalidateEvents();
        return event;
      } catch (err) {
        await showError(
          "Création impossible",
          err instanceof ApiError ? err.message : "Erreur réseau",
        );
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [getToken, invalidateEvents],
  );

  const update = useCallback(
    async (eventId: string, payload: Partial<EvenementPayload>) => {
      setIsSubmitting(true);
      try {
        const token = await getApiToken(getToken);
        const event = await updateEvent(token, eventId, payload);
        await showSuccess("Événement mis à jour");
        await invalidateEvents();
        return event;
      } catch (err) {
        await showError(
          "Mise à jour impossible",
          err instanceof ApiError ? err.message : "Erreur réseau",
        );
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [getToken, invalidateEvents],
  );

  const close = useCallback(
    async (event: Evenement) => {
      const result = await confirmAction({
        title: "Clôturer l'événement ?",
        text: `"${event.title}" sera marqué comme clôturé (généré).`,
        confirmText: "Clôturer",
        icon: "warning",
      });
      if (!result.isConfirmed) return false;

      try {
        const token = await getApiToken(getToken);
        await closeEvent(token, event.id);
        await showSuccess("Événement clôturé");
        await invalidateEvents();
        return true;
      } catch (err) {
        await showError(
          "Clôture impossible",
          err instanceof ApiError ? err.message : "Erreur réseau",
        );
        return false;
      }
    },
    [getToken, invalidateEvents],
  );

  const remove = useCallback(
    async (event: Evenement) => {
      const result = await confirmAction({
        title: "Supprimer l'événement ?",
        text: `"${event.title}" sera définitivement supprimé.`,
        confirmText: "Supprimer",
        icon: "warning",
      });
      if (!result.isConfirmed) return false;

      try {
        const token = await getApiToken(getToken);
        await deleteEvent(token, event.id);
        await showSuccess("Événement supprimé");
        await invalidateEvents();
        return true;
      } catch (err) {
        await showError(
          "Suppression impossible",
          err instanceof ApiError ? err.message : "Erreur réseau",
        );
        return false;
      }
    },
    [getToken, invalidateEvents],
  );

  const importExcel = useCallback(
    async (file: File): Promise<ImportResult | null> => {
      setIsSubmitting(true);
      setImportProgress({
        job_id: "",
        status: "pending",
        phase: "upload",
        processed: 0,
        total: 0,
        percent: 0,
        message: "Envoi du fichier…",
        filename: file.name,
        result: null,
        error: null,
      });
      try {
        const result = await importAnnualPlan(getToken, file, setImportProgress);
        await invalidateEvents();
        return result;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error && err.message.includes("fetch")
              ? "Impossible de contacter le serveur. Vérifiez que nginx et le service events sont démarrés."
              : err instanceof Error
                ? err.message
                : "Erreur réseau";
        await showError("Import impossible", message);
        return null;
      } finally {
        setIsSubmitting(false);
        setImportProgress(null);
      }
    },
    [getToken, invalidateEvents],
  );

  return {
    events: listQuery.data?.items ?? [],
    total: listQuery.data?.total ?? 0,
    stats: (statsQuery.data ?? null) as DashboardEventStats | null,
    isLoading: withList && listQuery.isLoading && !listQuery.data,
    isStatsLoading: withStats && statsQuery.isLoading && !statsQuery.data,
    isSubmitting,
    importProgress,
    loadEvents,
    loadStats,
    loadEvent,
    create,
    update,
    close,
    remove,
    importExcel,
  };
}
