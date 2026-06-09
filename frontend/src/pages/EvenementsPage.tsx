import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import {
  CalenderIcon,
  CheckCircleIcon,
  CloseIcon,
  ListIcon,
} from "../icons";
import EventStatCard from "../features/events/EventStatCard";
import EvenementsTable from "../features/events/EvenementsTable";
import EventsDashboardCalendar from "../features/events/EventsDashboardCalendar";
import EventsImportModal from "../features/events/EventsImportModal";
import ProjectStatusLegend from "../features/events/ProjectStatusLegend";
import { useEvents } from "../features/events/useEvents";
import { useModal } from "../hooks/useModal";
import type { EvenementFilters } from "../features/events/types";
import {
  buildSortSelectOptions,
  DEFAULT_EVENT_SORT,
  DEFAULT_EVENT_SORT_DIR,
  nextSortDir,
  parseSortOption,
  sortOptionValue,
  type EventSortField,
} from "../features/events/eventSort";
import { isEventOpen, normalizeProjectStatus, getProjectStatusFilterOptions } from "../features/events/projectStatus";
import { useTipAuth } from "../context/TipAuthContext";
import { useTranslation } from "../i18n/useTranslation";
import DataTablePagination from "../components/common/DataTablePagination";
import TableLoader from "../components/common/TableLoader";
import { usePagination } from "../hooks/usePagination";
import { showSuccess } from "../lib/swal";

export default function EvenementsPage() {
  const { t, localeTag } = useTranslation();
  const { isAdmin } = useTipAuth();
  const importModal = useModal();
  const {
    events,
    total,
    stats,
    isLoading,
    isStatsLoading,
    isSubmitting,
    importProgress,
    loadEvents,
    loadStats,
    close,
    remove,
    importExcel,
  } = useEvents();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [projectStatus, setProjectStatus] = useState("");
  const [country, setCountry] = useState("");
  const [sortBy, setSortBy] = useState<EventSortField>(DEFAULT_EVENT_SORT);
  const [sortDir, setSortDir] = useState(DEFAULT_EVENT_SORT_DIR);

  const statusFilterOptions = useMemo(() => getProjectStatusFilterOptions(t), [t]);
  const sortOptions = useMemo(() => buildSortSelectOptions(t), [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const filters: EvenementFilters = useMemo(
    () => ({
      q: search || undefined,
      project_status: projectStatus || undefined,
      country: country.trim() || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
    }),
    [search, projectStatus, country, sortBy, sortDir],
  );

  const handleSort = useCallback((field: EventSortField) => {
    setSortDir((prevDir) => nextSortDir(sortBy, field, prevDir));
    setSortBy(field);
  }, [sortBy]);

  const handleSortSelect = useCallback((value: string) => {
    const parsed = parseSortOption(value);
    setSortBy(parsed.field);
    setSortDir(parsed.dir);
  }, []);

  useEffect(() => {
    void loadEvents(filters);
  }, [loadEvents, filters]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const paginationKey = `${search}|${projectStatus}|${country}|${sortBy}|${sortDir}|${events.length}`;
  const {
    paginatedItems,
    page,
    setPage,
    totalPages,
    totalItems,
    rangeStart,
    rangeEnd,
  } = usePagination(events, 10, paginationKey);

  const openCount = events.filter((event) => isEventOpen(event.project_status)).length;
  const closedCount = events.filter(
    (event) => normalizeProjectStatus(event.project_status) === "Closed",
  ).length;
  const cancelledCount = events.filter(
    (event) => normalizeProjectStatus(event.project_status) === "Cancelled",
  ).length;

  const handleImport = async (file: File) => {
    const result = await importExcel(file);
    importModal.closeModal();
    if (result) {
      await loadEvents(filters);
      await showSuccess(
        t("events.importDone"),
        `${result.imported_count.toLocaleString(localeTag)} ${t("events.importDoneDesc")}`,
      );
    }
  };

  const handleClose = async (event: Parameters<typeof close>[0]) => {
    const ok = await close(event);
    if (ok) await loadEvents(filters);
  };

  const handleDelete = async (event: Parameters<typeof remove>[0]) => {
    const ok = await remove(event);
    if (ok) await loadEvents(filters);
  };

  return (
    <>
      <PageMeta
        title={`${t("events.title")} | ${t("common.appName")}`}
        description={t("events.listDesc")}
      />
      <AdminBreadcrumb pageTitle={t("events.title")} crumbs={[{ label: t("nav.home"), to: "/" }]} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <EventStatCard
          label={t("events.totalEvents")}
          value={isLoading ? "—" : total}
          icon={<ListIcon className="size-6 text-brand-500 dark:text-brand-400" />}
          iconBgClassName="bg-brand-50 dark:bg-brand-500/15"
        />
        <EventStatCard
          label={t("events.open")}
          value={isLoading ? "—" : openCount}
          icon={<CalenderIcon className="size-6 text-warning-600 dark:text-warning-500" />}
          iconBgClassName="bg-warning-50 dark:bg-warning-500/15"
        />
        <EventStatCard
          label={t("events.closed")}
          value={isLoading ? "—" : closedCount}
          icon={<CheckCircleIcon className="size-6 text-success-600 dark:text-success-500" />}
          iconBgClassName="bg-success-50 dark:bg-success-500/15"
        />
        <EventStatCard
          label={t("events.cancelled")}
          value={isLoading ? "—" : cancelledCount}
          icon={<CloseIcon className="size-6 text-error-600 dark:text-error-500" />}
          iconBgClassName="bg-error-50 dark:bg-error-500/15"
        />
      </div>

      <div className="mb-6">
        <EventsDashboardCalendar
          calendar={stats?.calendar ?? []}
          calendarYear={stats?.calendar_year}
          isLoading={isStatsLoading}
        />
      </div>

      <ComponentCard title={t("events.list")} desc={t("events.listDesc")}>
        <ProjectStatusLegend />

        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 flex-1">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("events.searchPlaceholder")}
                className="pl-10"
              />
            </div>
            <Select
              options={statusFilterOptions}
              value={projectStatus}
              onChange={setProjectStatus}
            />
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={t("events.filterCountry")}
            />
            <Select
              options={sortOptions}
              value={sortOptionValue(sortBy, sortDir)}
              onChange={handleSortSelect}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={importModal.openModal}>
                {t("events.importExcel")}
              </Button>
            )}
            <Link to="/evenements/nouveau">
              <Button size="sm">{t("events.addEvent")}</Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <TableLoader message={t("events.loadingList")} />
        ) : (
          <>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              {totalItems} {t("events.resultsCount")}
              {search ? ` · ${t("events.searchActive")}` : ""}
            </p>
            <EvenementsTable
              events={paginatedItems}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              onClose={handleClose}
              onDelete={handleDelete}
              showAdminActions={isAdmin}
            />
            <DataTablePagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPageChange={setPage}
            />
          </>
        )}
      </ComponentCard>

      {isAdmin && (
        <EventsImportModal
          isOpen={importModal.isOpen}
          onClose={importModal.closeModal}
          isSubmitting={isSubmitting}
          importProgress={importProgress}
          onImport={handleImport}
        />
      )}
    </>
  );
}
