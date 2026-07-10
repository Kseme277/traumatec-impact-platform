import { useEffect, useMemo, useState } from "react";
import { useEvents } from "./useEvents";
import type { EvenementFilters, EventSortDir, EventSortField } from "./types";

/** Taille max API pour les sélecteurs (Open ≈ 350). */
export const EVENT_SELECTOR_PAGE_SIZE = 500;

export type UseSelectableEventsOptions = {
  projectStatus?: string;
  upcoming?: boolean;
  /** Recherche texte (debounce côté hook). */
  search?: string;
  /** Thème TIP pour filtre API (operatory | pbo | iec). */
  preparationTheme?: string;
  sortBy?: EventSortField;
  sortDir?: EventSortDir;
  pageSize?: number;
  debounceMs?: number;
};

/**
 * Charge une liste d'événements pour sélecteurs / tables de choix,
 * avec recherche serveur et pagination large (évite les payloads 8 Mo).
 */
export function useSelectableEvents(options: UseSelectableEventsOptions = {}) {
  const {
    projectStatus,
    upcoming,
    search = "",
    preparationTheme,
    sortBy = "start_date",
    sortDir = "asc",
    pageSize = EVENT_SELECTOR_PAGE_SIZE,
    debounceMs = 300,
  } = options;

  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), debounceMs);
    return () => window.clearTimeout(timer);
  }, [search, debounceMs]);

  const filters: EvenementFilters = useMemo(
    () => ({
      project_status: projectStatus || undefined,
      upcoming: upcoming || undefined,
      q: debouncedSearch || undefined,
      preparation_theme: preparationTheme || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
      page: 1,
      page_size: pageSize,
    }),
    [projectStatus, upcoming, debouncedSearch, preparationTheme, sortBy, sortDir, pageSize],
  );

  const { events, total, isLoading, loadEvent } = useEvents({ filters });

  return {
    events,
    total,
    isLoading,
    loadEvent,
    filters,
    debouncedSearch,
  };
}
