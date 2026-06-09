import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import type { CorrelationPoint } from "../../api/analytics";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { usePagination } from "../../hooks/usePagination";
import { useTranslation } from "../../i18n/useTranslation";
import { formatChfFull } from "./chartFormat";

type MlSortField =
  | "event_title"
  | "amount_chf"
  | "risk_score"
  | "predicted_participants"
  | "city"
  | "country";

type MlSortDir = "asc" | "desc";

function nextDir(field: MlSortField, currentField: MlSortField, currentDir: MlSortDir): MlSortDir {
  if (field !== currentField) {
    return field === "amount_chf" || field === "risk_score" || field === "predicted_participants" ? "desc" : "asc";
  }
  return currentDir === "asc" ? "desc" : "asc";
}

function SortIcon({ field, sortBy, sortDir }: { field: MlSortField; sortBy: MlSortField; sortDir: MlSortDir }) {
  if (sortBy !== field) return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />;
  return sortDir === "asc" ? (
    <ArrowUp className="size-3.5 text-brand-500" aria-hidden />
  ) : (
    <ArrowDown className="size-3.5 text-brand-500" aria-hidden />
  );
}

function matchesSearch(item: CorrelationPoint, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.event_title,
    item.city,
    item.country,
    item.preparation_theme,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function compareItems(a: CorrelationPoint, b: CorrelationPoint, field: MlSortField, dir: MlSortDir): number {
  const sign = dir === "asc" ? 1 : -1;
  const str = (v: string | null | undefined) => (v ?? "").toLocaleLowerCase();
  const num = (v: number | null | undefined) => v ?? -Infinity;

  switch (field) {
    case "event_title":
      return sign * str(a.event_title).localeCompare(str(b.event_title));
    case "city":
      return sign * str(a.city).localeCompare(str(b.city));
    case "country":
      return sign * str(a.country).localeCompare(str(b.country));
    case "amount_chf":
      return sign * (num(a.amount_chf) - num(b.amount_chf));
    case "risk_score":
      return sign * (num(a.risk_score) - num(b.risk_score));
    case "predicted_participants":
      return sign * (num(a.predicted_participants) - num(b.predicted_participants));
    default:
      return 0;
  }
}

interface MlEventsTableProps {
  items: CorrelationPoint[];
  selectedEventId?: string;
  onSelectEvent: (eventId: string) => void;
}

export default function MlEventsTable({ items, selectedEventId, onSelectEvent }: MlEventsTableProps) {
  const { t, localeTag } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<MlSortField>("risk_score");
  const [sortDir, setSortDir] = useState<MlSortDir>("desc");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const sortOptions = useMemo(
    () => [
      { value: "risk_score:desc", label: t("analytics.sortRiskDesc") },
      { value: "risk_score:asc", label: t("analytics.sortRiskAsc") },
      { value: "amount_chf:desc", label: t("analytics.sortBudgetDesc") },
      { value: "amount_chf:asc", label: t("analytics.sortBudgetAsc") },
      { value: "predicted_participants:desc", label: t("analytics.sortParticipantsDesc") },
      { value: "predicted_participants:asc", label: t("analytics.sortParticipantsAsc") },
      { value: "event_title:asc", label: t("analytics.sortTitleAsc") },
      { value: "city:asc", label: t("analytics.sortCityAsc") },
    ],
    [t],
  );

  const filtered = useMemo(
    () => items.filter((item) => matchesSearch(item, search)).sort((a, b) => compareItems(a, b, sortBy, sortDir)),
    [items, search, sortBy, sortDir],
  );

  const paginationKey = `${search}|${sortBy}|${sortDir}|${filtered.length}`;
  const { paginatedItems, page, setPage, totalPages, rangeStart, rangeEnd, totalItems } = usePagination(
    filtered,
    10,
    paginationKey,
  );

  const handleSort = (field: MlSortField) => {
    setSortDir((prev) => nextDir(field, sortBy, prev));
    setSortBy(field);
  };

  const columns: { key: MlSortField; label: string }[] = [
    { key: "event_title", label: t("analytics.tableEvent") },
    { key: "amount_chf", label: t("analytics.corrBudgetChf") },
    { key: "risk_score", label: t("analytics.budgetRiskPct") },
    { key: "predicted_participants", label: t("analytics.participantsCount") },
    { key: "city", label: t("analytics.tableCity") },
  ];

  return (
    <ComponentCard title={t("analytics.eventsTableTitle")} desc={t("analytics.eventsTableDesc")}>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("analytics.eventsSearchPlaceholder")}
            className="pl-10"
          />
        </div>
        <Select
          options={sortOptions}
          value={`${sortBy}:${sortDir}`}
          onChange={(value) => {
            const [field, dir] = value.split(":") as [MlSortField, MlSortDir];
            setSortBy(field);
            setSortDir(dir === "asc" ? "asc" : "desc");
          }}
        />
        <p className="flex items-center text-xs text-gray-500 dark:text-gray-400 sm:justify-end">
          {totalItems} {t("analytics.eventsCount")}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{t("analytics.eventsTableEmpty")}</p>
      ) : (
        <>
          <div className="-mx-2 overflow-x-auto sm:-mx-4">
            <Table className="min-w-[760px] w-full">
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      isHeader
                      className="px-3 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className="inline-flex items-center gap-1.5 transition hover:text-brand-500 dark:hover:text-brand-400"
                      >
                        <span>{column.label}</span>
                        <SortIcon field={column.key} sortBy={sortBy} sortDir={sortDir} />
                      </button>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {paginatedItems.map((item) => {
                  const isSelected = item.event_id === selectedEventId;
                  return (
                    <TableRow
                      key={item.event_id}
                      onClick={() => onSelectEvent(item.event_id)}
                      className={`cursor-pointer transition hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
                        isSelected ? "bg-brand-50/80 dark:bg-brand-500/10" : ""
                      }`}
                    >
                      <TableCell className="px-3 py-3 text-start">
                        <span className="block max-w-[220px] truncate font-medium text-gray-800 dark:text-white/90" title={item.event_title}>
                          {item.event_title}
                        </span>
                        {item.preparation_theme && (
                          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">{item.preparation_theme}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-start text-theme-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatChfFull(item.amount_chf, localeTag)}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-start text-theme-sm whitespace-nowrap">
                        <span
                          className={
                            item.risk_score >= 70
                              ? "font-medium text-error-600 dark:text-error-400"
                              : item.risk_score >= 40
                                ? "font-medium text-warning-600 dark:text-warning-400"
                                : "text-gray-700 dark:text-gray-300"
                          }
                        >
                          {item.risk_score}%
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-start text-theme-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {item.predicted_participants}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                        <span className="block truncate max-w-[140px]" title={[item.city, item.country].filter(Boolean).join(", ")}>
                          {[item.city, item.country].filter(Boolean).join(", ") || "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>
                {rangeStart}–{rangeEnd} / {totalItems}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-white/5"
                >
                  {t("common.previous")}
                </button>
                <span>
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-white/5"
                >
                  {t("common.next")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </ComponentCard>
  );
}
