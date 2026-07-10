import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles } from "lucide-react";
import { fetchAuditEvents } from "../../api/audit";
import { fetchEvents } from "../../api/events";
import { fetchAllUsers } from "../../api/users";
import { filterSearchEntries, SEARCH_ENTRIES, type SearchEntry } from "../../config/searchIndex";
import { useCommandAssistant } from "../../context/CommandAssistantContext";
import { useTipAuth } from "../../context/TipAuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import { useTipSWR } from "../../lib/swr";

interface SearchResult extends SearchEntry {
  kind: "page" | "event" | "user" | "audit";
}

function isMacPlatform() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { isAdmin, hasRole } = useTipAuth();
  const { openWithMessage } = useCommandAssistant();
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const pageResults = useMemo(
    () =>
      filterSearchEntries(query, SEARCH_ENTRIES, { adminOnly: isAdmin, hasRole }).map((entry) => ({
        ...entry,
        kind: "page" as const,
      })),
    [query, isAdmin, hasRole],
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (!isOpen || trimmed.length < 2) {
      setDebouncedQuery("");
      return;
    }
    const timeout = window.setTimeout(() => setDebouncedQuery(trimmed), 250);
    return () => window.clearTimeout(timeout);
  }, [isOpen, query]);

  const searchKey =
    isOpen && debouncedQuery.length >= 2
      ? (["global-search", debouncedQuery, isAdmin] as const)
      : null;

  const { data: dynamicResults = [], isLoading: isSearching } = useTipSWR(
    searchKey,
    async (token) => {
      const needle = debouncedQuery.toLowerCase();
      const next: SearchResult[] = [];

      const eventsResponse = await fetchEvents(token, {
        q: debouncedQuery,
        page: 1,
        page_size: 10,
      });
      for (const event of eventsResponse.items.slice(0, 5)) {
        next.push({
          id: `event-${event.id}`,
          title: event.title,
          subtitle: `${event.project_number} · ${event.city ?? ""} ${event.country ?? ""}`.trim(),
          path: `/evenements/${event.id}`,
          category: t("search.categoryEvent"),
          keywords: [],
          kind: "event",
        });
      }

      if (isAdmin && token) {
        const users = await fetchAllUsers(token);
        for (const user of users) {
          const haystack = `${user.prenom} ${user.nom} ${user.email} ${user.role}`.toLowerCase();
          if (!haystack.includes(needle)) continue;
          next.push({
            id: `user-${user.id}`,
            title: `${user.prenom} ${user.nom}`,
            subtitle: `${user.email} · ${user.role}`,
            path: `/admin/utilisateurs/${user.id}`,
            category: t("search.categoryUser"),
            keywords: [],
            kind: "user",
          });
          if (next.filter((r) => r.kind === "user").length >= 5) break;
        }

        const logsResponse = await fetchAuditEvents(token, { q: debouncedQuery, page_size: 5 });
        for (const log of logsResponse.items) {
          next.push({
            id: `audit-${log.id}`,
            title: log.action,
            subtitle:
              [log.actor_name, log.entity_type, log.entity_id].filter(Boolean).join(" · ") ||
              log.created_at,
            path: "/admin/audit",
            category: t("search.categoryAudit"),
            keywords: [],
            kind: "audit",
          });
        }
      }

      return next;
    },
  );

  const results = useMemo(() => [...pageResults, ...dynamicResults], [pageResults, dynamicResults]);

  const openPalette = useCallback(() => {
    setIsOpen(true);
    setSelectedIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const closePalette = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setDebouncedQuery("");
    setSelectedIndex(0);
  }, []);

  const goTo = useCallback(
    (result: SearchResult) => {
      closePalette();
      navigate(result.path);
    },
    [closePalette, navigate],
  );

  const askAssistant = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    closePalette();
    openWithMessage(trimmed);
  }, [closePalette, openWithMessage, query]);

  const trimmedQuery = query.trim();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (isOpen) {
          closePalette();
        } else {
          openPalette();
        }
        return;
      }

      if (!isOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closePalette();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === "Enter" && results[selectedIndex]) {
        event.preventDefault();
        goTo(results[selectedIndex]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closePalette, goTo, isOpen, openPalette, results, selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results.length]);

  const shortcutLabel = isMacPlatform() ? "⌘K" : "Ctrl+K";
  const showSearching = Boolean(searchKey) && isSearching && dynamicResults.length === 0;

  return (
    <>
      <div className="hidden lg:block">
        <button
          type="button"
          onClick={openPalette}
          className="group relative flex h-11 w-full min-w-[280px] items-center rounded-lg border border-gray-200 bg-transparent px-12 text-left text-sm text-gray-400 shadow-theme-xs transition hover:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/30 dark:hover:border-brand-800 xl:w-[430px]"
        >
          <span className="absolute left-4 top-1/2 -translate-y-1/2">
            <svg className="fill-gray-500 dark:fill-gray-400" width="20" height="20" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
              />
            </svg>
          </span>
          {t("search.placeholder")}
          <span className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
            {shortcutLabel}
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-99999 flex items-start justify-center bg-gray-900/50 px-4 pt-24 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("search.dialogLabel")}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="border-b border-gray-100 p-4 dark:border-gray-800">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search.inputPlaceholder")}
                className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white/90"
              />
            </div>

            <div className="max-h-[420px] overflow-y-auto p-2">
              {trimmedQuery.length >= 2 && (
                <button
                  type="button"
                  onClick={askAssistant}
                  className="mb-2 flex w-full items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/80 px-4 py-3 text-left transition hover:bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10 dark:hover:bg-brand-500/15"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-brand-500 text-white">
                    <Sparkles className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-brand-700 dark:text-brand-300">
                      {t("assistant.askFromSearch").replace("{query}", trimmedQuery)}
                    </span>
                    <span className="mt-0.5 block text-xs text-brand-600/80 dark:text-brand-200/70">
                      {t("assistant.subtitle")}
                    </span>
                  </span>
                </button>
              )}

              {results.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {showSearching ? t("search.loading") : t("search.noResults")}
                </p>
              ) : (
                <ul className="space-y-1">
                  {results.map((result, index) => (
                    <li key={result.id}>
                      <button
                        type="button"
                        onClick={() => goTo(result)}
                        className={`flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition ${
                          index === selectedIndex
                            ? "bg-brand-50 dark:bg-brand-500/10"
                            : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                        }`}
                      >
                        <span className="mt-0.5 rounded-md bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-white/5 dark:text-gray-400">
                          {result.category}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                            {result.title}
                          </span>
                          {result.subtitle && (
                            <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
                              {result.subtitle}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <span>{t("search.hints")}</span>
              <span>{shortcutLabel}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
