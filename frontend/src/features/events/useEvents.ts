import { useAuth } from "@clerk/clerk-react";
import { useCallback, useRef, useState } from "react";
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

export function useEvents() {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<Evenement[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<DashboardEventStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportJobProgress | null>(null);
  const statsRequestId = useRef(0);

  const loadEvents = useCallback(
    async (filters: EvenementFilters = {}) => {
      setIsLoading(true);
      try {
        const token = await getApiToken(getToken);
        const response = await fetchEvents(token, filters);
        setEvents(response.items);
        setTotal(response.total);
      } catch (err) {
        setEvents([]);
        setTotal(0);
        await showError(
          "Chargement impossible",
          err instanceof ApiError ? err.message : "Erreur réseau",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [getToken],
  );

  const loadStats = useCallback(async () => {
    const requestId = ++statsRequestId.current;
    setIsStatsLoading(true);
    try {
      const token = await getApiToken(getToken);
      if (!token) {
        if (requestId === statsRequestId.current) {
          setStats(null);
        }
        return;
      }
      const response = await fetchEventStats(token);
      if (requestId === statsRequestId.current) {
        setStats(response);
      }
    } catch (err) {
      if (requestId === statsRequestId.current) {
        setStats(null);
      }
      await showError(
        "Statistiques indisponibles",
        err instanceof ApiError
          ? err.message
          : "Impossible de charger le tableau de bord. Vérifiez le service events.",
      );
    } finally {
      if (requestId === statsRequestId.current) {
        setIsStatsLoading(false);
      }
    }
  }, [getToken]);

  const loadEvent = useCallback(
    async (eventId: string) => {
      const token = await getApiToken(getToken);
      return fetchEvent(token, eventId);
    },
    [getToken],
  );

  const create = useCallback(
    async (payload: EvenementPayload) => {
      setIsSubmitting(true);
      try {
        const token = await getApiToken(getToken);
        const event = await createEvent(token, payload);
        await showSuccess("Événement créé");
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
    [getToken],
  );

  const update = useCallback(
    async (eventId: string, payload: Partial<EvenementPayload>) => {
      setIsSubmitting(true);
      try {
        const token = await getApiToken(getToken);
        const event = await updateEvent(token, eventId, payload);
        await showSuccess("Événement mis à jour");
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
    [getToken],
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
        return true;
      } catch (err) {
        await showError(
          "Clôture impossible",
          err instanceof ApiError ? err.message : "Erreur réseau",
        );
        return false;
      }
    },
    [getToken],
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
        return true;
      } catch (err) {
        await showError(
          "Suppression impossible",
          err instanceof ApiError ? err.message : "Erreur réseau",
        );
        return false;
      }
    },
    [getToken],
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
    [getToken],
  );

  return {
    events,
    total,
    stats,
    isLoading,
    isStatsLoading,
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
