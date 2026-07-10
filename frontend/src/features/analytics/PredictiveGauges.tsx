import { useEffect, useMemo, useState } from "react";
import { Loader2, TrendingUp, AlertTriangle, Search } from "lucide-react";
import { predictEvent } from "../../api/analytics";
import { ApiError } from "../../api/client";
import { fetchEvents } from "../../api/events";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import {
  buildSortSelectOptions,
  DEFAULT_EVENT_SORT,
  DEFAULT_EVENT_SORT_DIR,
  parseSortOption,
  sortOptionValue,
  type EventSortField,
} from "../events/eventSort";
import { useTranslation } from "../../i18n/useTranslation";
import { useTipSWR } from "../../lib/swr";

const STORAGE_KEY = "tip.dashboard.eventId";

function riskLevel(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function GaugeBar({
  label,
  value,
  max,
  unit,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  tone: "brand" | "warning" | "danger";
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barClass =
    tone === "danger"
      ? "bg-error-500"
      : tone === "warning"
        ? "bg-warning-500"
        : "bg-brand-500";

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-white/90">
          {value}
          {unit}
        </p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface PredictiveGaugesProps {
  selectedEventId?: string;
  onSelectedEventIdChange?: (id: string) => void;
}

export default function PredictiveGauges({
  selectedEventId: controlledId,
  onSelectedEventIdChange,
}: PredictiveGaugesProps = {}) {
  const { t } = useTranslation();
  const [internalId, setInternalId] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const selectedId = controlledId !== undefined ? controlledId : internalId;
  const setSelectedId = (id: string) => {
    if (onSelectedEventIdChange) onSelectedEventIdChange(id);
    else setInternalId(id);
  };
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<EventSortField>(DEFAULT_EVENT_SORT);
  const [sortDir, setSortDir] = useState(DEFAULT_EVENT_SORT_DIR);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
  } = useTipSWR(
    ["analytics-events", sortBy, sortDir, search] as const,
    async (token) =>
      fetchEvents(token, {
        sort_by: sortBy,
        sort_dir: sortDir,
        page: 1,
        page_size: 500,
        ...(search ? { q: search } : {}),
      }),
  );

  const events = eventsData?.items ?? [];
  const isLoadingEvents = eventsLoading && !eventsData;

  useEffect(() => {
    if (!eventsData) return;
    const items = eventsData.items;
    const stored = localStorage.getItem(STORAGE_KEY);
    const pick =
      (stored && items.some((e) => e.id === stored) ? stored : null) ??
      (controlledId && items.some((e) => e.id === controlledId) ? controlledId : null) ??
      (items.length > 0 ? items[0].id : "");
    if (pick) setSelectedId(pick);
  }, [eventsData, controlledId]);

  const {
    data: prediction,
    isLoading: isPredicting,
    error: predictError,
  } = useTipSWR(
    selectedId ? (["analytics-predict", selectedId] as const) : null,
    (token) => predictEvent(token, { event_id: selectedId }),
  );

  useEffect(() => {
    if (!selectedId) return;
    localStorage.setItem(STORAGE_KEY, selectedId);
  }, [selectedId]);

  const sortOptions = useMemo(() => buildSortSelectOptions(t), [t]);

  const filteredEvents = events;

  const eventOptions = useMemo(
    () =>
      filteredEvents.map((event) => ({
        value: event.id,
        label: `${event.title} — ${event.project_number}`,
      })),
    [filteredEvents],
  );

  useEffect(() => {
    if (!selectedId || filteredEvents.some((e) => e.id === selectedId)) return;
    if (filteredEvents.length > 0) setSelectedId(filteredEvents[0].id);
  }, [filteredEvents, selectedId]);

  const riskScore = prediction?.risk_score ?? null;
  const participants = prediction?.predicted_participants ?? null;
  const error = eventsError
    ? t("analytics.loadEventsError")
    : predictError
      ? predictError instanceof ApiError
        ? predictError.message
        : t("analytics.predictError")
      : null;

  const level = riskScore !== null ? riskLevel(riskScore) : null;
  const riskLabel =
    level === "high"
      ? t("analytics.riskHigh")
      : level === "medium"
        ? t("analytics.riskMedium")
        : level === "low"
          ? t("analytics.riskLow")
          : "—";

  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
      data-tour="dashboard-predictive"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            <TrendingUp className="size-5 text-brand-500" />
            {t("analytics.title")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("analytics.subtitle")}</p>
        </div>
        {isPredicting && !prediction && <Loader2 className="size-5 animate-spin text-brand-500" />}
      </div>

      <div className="mb-5 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("analytics.eventsSearchPlaceholder")}
            className="pl-10"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            {t("analytics.selectEvent")}
          </label>
          <Select
            options={eventOptions}
            value={selectedId}
            onChange={(value) => setSelectedId(value)}
            placeholder={isLoadingEvents ? t("common.loading") : t("analytics.noEvent")}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            {t("events.sortBy")}
          </label>
          <Select
            options={sortOptions}
            value={sortOptionValue(sortBy, sortDir)}
            onChange={(value) => {
              const parsed = parseSortOption(value);
              setSortBy(parsed.field);
              setSortDir(parsed.dir);
            }}
          />
        </div>
        <p className="sm:col-span-2 text-xs text-gray-500 dark:text-gray-400">
          {filteredEvents.length} {t("analytics.eventsCount")}
        </p>
      </div>

      {error && (
        <p className="mb-4 flex items-center gap-2 text-sm text-error-600 dark:text-error-400">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      {riskScore !== null && participants !== null && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <GaugeBar
              label={t("analytics.budgetRisk")}
              value={riskScore}
              max={100}
              unit="%"
              tone={level === "high" ? "danger" : level === "medium" ? "warning" : "brand"}
            />
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {t("analytics.riskLabel")} : <span className="font-medium text-gray-800 dark:text-white/90">{riskLabel}</span>
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <GaugeBar
              label={t("analytics.expectedParticipants")}
              value={participants}
              max={Math.max(participants * 1.5, 80)}
              unit={` ${t("analytics.people")}`}
              tone="brand"
            />
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{t("analytics.participantsHint")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
