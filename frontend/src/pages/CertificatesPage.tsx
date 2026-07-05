import { useAuth } from "@clerk/clerk-react";
import { Download, Eye, Loader2, Sparkles, Upload, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import DataTablePagination from "../components/common/DataTablePagination";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import Button from "../components/ui/button/Button";
import Badge from "../components/ui/badge/Badge";
import {
  type CertificateEditorConfig,
  type CertificateGeneration,
  type CertificateRoleFilter,
  type Participant,
  type ParticipantStats,
  downloadCertificateGeneration,
  downloadParticipantImportTemplate,
  fetchCertificateEditorConfig,
  fetchCertificateGenerations,
  fetchCertificateTitleSuggestion,
  fetchParticipantStats,
  fetchParticipants,
  generateCertificates,
  importParticipants,
} from "../api/participants";
import CertificateGenerationProgressBar, {
  type CertificateGenerationProgress,
} from "../features/certificates/CertificateGenerationProgressBar";
import OnlyOfficeEditor from "../features/documents/OnlyOfficeEditor";
import { fetchPackageTypes } from "../api/catalog";
import {
  eventPackageTypeCode,
  FALLBACK_PACKAGE_TYPES,
  mergePackageCatalog,
  packageTypeFilterOptions,
  type EventPackageTypeCatalog,
} from "../features/documents/eventPackageTypes";
import { eventMatchesSearch, formatEventDateRange } from "../features/events/eventDates";
import { isEventOpen } from "../features/events/projectStatus";
import { useEvents } from "../features/events/useEvents";
import type { Evenement, EvenementFilters } from "../features/events/types";
import { ApiError } from "../api/client";
import { getApiToken } from "../lib/clerkToken";
import { useTranslation } from "../i18n/useTranslation";
import { showError, showSuccess, showWarning } from "../lib/swal";

function eventOptionLabel(event: Evenement): string {
  const dates = formatEventDateRange(event);
  const shortTitle = event.title.length > 40 ? `${event.title.slice(0, 40)}…` : event.title;
  return [event.project_number, shortTitle, dates].filter(Boolean).join(" — ");
}

export default function CertificatesPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { t, localeTag } = useTranslation();
  const { events, loadEvents, loadEvent } = useEvents();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  const urlEventId = searchParams.get("event") ?? "";
  const [selectedEventId, setSelectedEventId] = useState(urlEventId);
  const [pinnedEvent, setPinnedEvent] = useState<Evenement | null>(null);
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [packageCatalog, setPackageCatalog] = useState<EventPackageTypeCatalog>(FALLBACK_PACKAGE_TYPES);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [listTotalPages, setListTotalPages] = useState(1);
  const [participantSearchInput, setParticipantSearchInput] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const LIST_PAGE_SIZE = 10;
  const [stats, setStats] = useState<ParticipantStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState<CertificateGenerationProgress | null>(null);
  const genProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [certificateTitle, setCertificateTitle] = useState("");
  const [isTitleLoading, setIsTitleLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState<CertificateRoleFilter>("all");
  const [generations, setGenerations] = useState<CertificateGeneration[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editorConfig, setEditorConfig] = useState<CertificateEditorConfig | null>(null);
  const [isEditorLoading, setIsEditorLoading] = useState(false);

  const certificateEventFilters = useMemo<EvenementFilters>(
    () => ({ project_status: "Open" }),
    [],
  );

  useEffect(() => {
    void loadEvents(certificateEventFilters);
  }, [certificateEventFilters, loadEvents]);

  useEffect(() => {
    if (!urlEventId) {
      setPinnedEvent(null);
      return;
    }
    setSelectedEventId(urlEventId);
    let cancelled = false;
    void (async () => {
      try {
        const event = await loadEvent(urlEventId);
        if (!cancelled) setPinnedEvent(event);
      } catch {
        if (!cancelled) setPinnedEvent(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [urlEventId, loadEvent]);

  const openEvents = useMemo(
    () =>
      events
        .filter((event) => isEventOpen(event.project_status))
        .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? "")),
    [events],
  );

  useEffect(() => {
    void (async () => {
      try {
        const token = await getApiToken(getToken);
        const types = await fetchPackageTypes(token);
        setPackageCatalog(mergePackageCatalog(types));
      } catch {
        setPackageCatalog(FALLBACK_PACKAGE_TYPES);
      }
    })();
  }, [getToken]);

  const eventTypeOptions = useMemo(
    () => packageTypeFilterOptions(packageCatalog, t),
    [packageCatalog, t],
  );

  const filteredEvents = useMemo(
    () =>
      openEvents.filter((event) => {
        if (eventTypeFilter) {
          if (eventPackageTypeCode(event) !== eventTypeFilter) return false;
        }
        return eventMatchesSearch(event, eventSearchQuery);
      }),
    [eventSearchQuery, eventTypeFilter, openEvents],
  );

  const selectedEvent = useMemo(() => {
    if (pinnedEvent?.id === selectedEventId) return pinnedEvent;
    return events.find((event) => event.id === selectedEventId) ?? pinnedEvent;
  }, [pinnedEvent, events, selectedEventId]);

  const eventOptions = useMemo(() => {
    const list =
      selectedEvent && !filteredEvents.some((event) => event.id === selectedEvent.id)
        ? [selectedEvent, ...filteredEvents]
        : filteredEvents;
    return list.map((event) => ({
      value: event.id,
      label: eventOptionLabel(event),
    }));
  }, [filteredEvents, selectedEvent]);

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    const fromList = events.find((event) => event.id === eventId) ?? null;
    if (fromList) setPinnedEvent(fromList);
    if (eventId) setSearchParams({ event: eventId });
    else setSearchParams({});
  };

  useEffect(() => {
    setListPage(1);
    setParticipantSearchInput("");
    setParticipantSearch("");
    setCertificateTitle("");
  }, [selectedEventId]);

  const loadCertificateTitle = useCallback(
    async (refresh = false) => {
      if (!selectedEventId || !isLoaded || !isSignedIn) return;
      if (!stats?.source_event_title) {
        setCertificateTitle("");
        return;
      }
      setIsTitleLoading(true);
      try {
        const token = await getApiToken(getToken);
        if (!token) return;
        const suggestion = await fetchCertificateTitleSuggestion(token, selectedEventId, refresh);
        setCertificateTitle(suggestion.title_suggested);
      } catch (err) {
        const fallback =
          stats.certificate_title_formatted?.trim() ||
          stats.source_event_title?.trim() ||
          "";
        if (fallback) setCertificateTitle(fallback);
        if (refresh) {
          await showError(
            t("participants.titleFormatError"),
            err instanceof Error ? err.message : "",
          );
        }
      } finally {
        setIsTitleLoading(false);
      }
    },
    [getToken, isLoaded, isSignedIn, selectedEventId, stats, t],
  );

  useEffect(() => {
    if (!stats?.source_event_title) {
      setCertificateTitle("");
      return;
    }
    const formatted = stats.certificate_title_formatted?.trim();
    if (formatted) {
      setCertificateTitle(formatted);
      return;
    }
    setCertificateTitle(stats.source_event_title.trim());
  }, [stats?.source_event_title, stats?.certificate_title_formatted]);

  useEffect(() => {
    const timer = window.setTimeout(() => setParticipantSearch(participantSearchInput), 300);
    return () => window.clearTimeout(timer);
  }, [participantSearchInput]);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
    if (!selectedEventId || !isLoaded || !isSignedIn) {
      setParticipants([]);
      setListTotal(0);
      setListTotalPages(1);
      setStats(null);
      setGenerations([]);
      return;
    }
    setIsLoading(true);
    try {
      const token = await getApiToken(getToken);
      if (!token) {
        if (options?.silent) return;
        throw new ApiError(t("documents.sessionExpired"), 401);
      }

      const [listResult, statsResult, generationsResult] = await Promise.allSettled([
        fetchParticipants(token, selectedEventId, {
          page: listPage,
          page_size: LIST_PAGE_SIZE,
          q: participantSearch,
        }),
        fetchParticipantStats(token, selectedEventId),
        fetchCertificateGenerations(token, selectedEventId),
      ]);

      if (listResult.status === "fulfilled") {
        setParticipants(listResult.value.items);
        setListTotal(listResult.value.total);
        setListTotalPages(listResult.value.total_pages);
      } else {
        setParticipants([]);
        setListTotal(0);
        setListTotalPages(1);
        if (!options?.silent) {
          throw listResult.reason;
        }
      }

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value);
      } else {
        setStats(null);
      }

      if (generationsResult.status === "fulfilled") {
        setGenerations(generationsResult.value.items);
      } else {
        setGenerations([]);
      }
    } catch (err) {
      if (options?.silent) return;
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("participants.loadError");
      await showError(t("participants.loadError"), message);
    } finally {
      setIsLoading(false);
    }
    },
    [getToken, isLoaded, isSignedIn, listPage, participantSearch, selectedEventId, t],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleImport = async (file: File) => {
    if (!selectedEventId) return;
    setIsImporting(true);
    try {
      const token = await getApiToken(getToken);
      if (!token) {
        throw new ApiError(t("documents.sessionExpired"), 401);
      }
      const result = await importParticipants(token, selectedEventId, file);
      let successDetail = `${result.imported_count} ${t("participants.importedLabel")}`;
      if (result.duplicate_in_file_count > 0) {
        successDetail += `\n${t("participants.duplicatesSkipped").replace("{count}", String(result.duplicate_in_file_count))}`;
      }
      if (result.already_in_event_count > 0) {
        successDetail += `\n${t("participants.alreadyInEventSkipped").replace("{count}", String(result.already_in_event_count))}`;
      }
      if (result.known_from_other_events_count > 0) {
        successDetail += `\n${t("participants.knownFromOtherEvents").replace("{count}", String(result.known_from_other_events_count))}`;
      }
      await showSuccess(t("participants.importSuccess"), successDetail);
      setListPage(1);
      if (result.warnings.length > 0) {
        await showWarning(t("participants.importWarnings"), result.warnings.join("\n"));
      }
      await refresh();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "";
      await showError(t("participants.importError"), message);
    } finally {
      setIsImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const stopGenProgressTimer = () => {
    if (genProgressTimerRef.current) {
      clearInterval(genProgressTimerRef.current);
      genProgressTimerRef.current = null;
    }
  };

  useEffect(() => () => stopGenProgressTimer(), []);

  const handleGenerate = async () => {
    if (!selectedEventId) return;
    setIsGenerating(true);
    const participantCount = stats?.total ?? 0;
    stopGenProgressTimer();
    setGenProgress({
      phase: "preparing",
      percent: 5,
      message: t("participants.genMsgPreparing"),
      certificateCount: participantCount,
    });

    try {
      let token = await getApiToken(getToken);
      if (!token) {
        throw new ApiError(t("documents.sessionExpired"), 401);
      }
      if (!certificateTitle.trim()) {
        throw new ApiError(t("participants.titleRequired"), 422);
      }

      setGenProgress({
        phase: "generating",
        percent: 12,
        message: t("participants.genMsgGenerating"),
        certificateCount: participantCount,
      });
      let tickPercent = 12;
      genProgressTimerRef.current = setInterval(() => {
        tickPercent = Math.min(tickPercent + 3, 85);
        setGenProgress((prev) =>
          prev
            ? {
                ...prev,
                phase: "generating",
                percent: tickPercent,
                message: t("participants.genMsgGenerating"),
              }
            : null,
        );
      }, 900);

      const result = await generateCertificates(
        token,
        selectedEventId,
        roleFilter,
        certificateTitle,
      );
      stopGenProgressTimer();

      setGenProgress({
        phase: "uploading",
        percent: 90,
        message: t("participants.genMsgUploading"),
        certificateCount: result.certificate_count,
      });

      token = await getApiToken(getToken);
      if (!token) {
        throw new ApiError(t("documents.sessionExpired"), 401);
      }

      setGenProgress({
        phase: "downloading",
        percent: 96,
        message: t("participants.genMsgDownloading"),
        certificateCount: result.certificate_count,
      });
      await downloadCertificateGeneration(token, result.id, result.filename);

      setGenProgress({
        phase: "completed",
        percent: 100,
        message: t("participants.genMsgCompleted"),
        certificateCount: result.certificate_count,
      });

      await showSuccess(
        t("participants.generateSuccess"),
        `${result.certificate_count} ${t("participants.certificatesLabel")}`,
      );
      void refresh({ silent: true });
    } catch (err) {
      stopGenProgressTimer();
      setGenProgress({
        phase: "failed",
        percent: 0,
        message:
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : t("participants.generateError"),
        certificateCount: participantCount,
      });
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("participants.generateError");
      await showError(t("participants.generateError"), message);
    } finally {
      setIsGenerating(false);
      window.setTimeout(() => {
        setGenProgress((prev) => (prev?.phase === "completed" ? null : prev));
      }, 4000);
    }
  };

  const handlePreview = async (generation: CertificateGeneration) => {
    setPreviewId(generation.id);
    setEditorConfig(null);
    setIsEditorLoading(true);
    try {
      const token = await getApiToken(getToken);
      if (!token) {
        throw new ApiError(t("documents.sessionExpired"), 401);
      }
      const config = await fetchCertificateEditorConfig(token, generation.id);
      setEditorConfig(config);
    } catch (err) {
      await showError(t("participants.previewError"), err instanceof Error ? err.message : "");
      setPreviewId(null);
    } finally {
      setIsEditorLoading(false);
    }
  };

  const handleDownloadGeneration = async (generation: CertificateGeneration) => {
    try {
      const token = await getApiToken(getToken);
      if (!token) {
        throw new ApiError(t("documents.sessionExpired"), 401);
      }
      await downloadCertificateGeneration(token, generation.id, generation.filename);
    } catch (err) {
      await showError(t("common.download"), err instanceof Error ? err.message : "");
    }
  };

  return (
    <>
      <PageMeta title={t("participants.pageTitle")} description={t("participants.pageDesc")} />
      <AdminBreadcrumb pageTitle={t("nav.certificates")} crumbs={[]} />

      <p className="mb-6 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{t("participants.pageDesc")}</p>

      <ComponentCard title={t("participants.selectEventTitle")} desc={t("participants.selectEventDesc")}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("participants.searchEvent")}</Label>
              <Input
                value={eventSearchQuery}
                onChange={(e) => setEventSearchQuery(e.target.value)}
                placeholder={t("participants.searchEventPlaceholder")}
              />
            </div>
            <div>
              <Label>{t("participants.filterActivity")}</Label>
              <Select
                placeholder={t("participants.allActivities")}
                options={eventTypeOptions}
                value={eventTypeFilter}
                onChange={setEventTypeFilter}
              />
            </div>
          </div>
          <div className="max-w-2xl">
            <Label>{t("participants.selectEventLabel")}</Label>
            <Select
              placeholder={t("participants.selectEventPlaceholder")}
              options={eventOptions}
              value={selectedEventId}
              onChange={handleEventChange}
            />
            {openEvents.length > 0 && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {filteredEvents.length} / {openEvents.length} {t("participants.eventsShown")}
              </p>
            )}
          </div>
        </div>
        {selectedEvent && (
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{selectedEvent.title}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {selectedEvent.project_number} · {formatEventDateRange(selectedEvent)}
              {selectedEvent.city || selectedEvent.country
                ? ` · ${[selectedEvent.city, selectedEvent.country].filter(Boolean).join(", ")}`
                : ""}
            </p>
            <Link
              to={`/evenements/${selectedEvent.id}`}
              className="mt-2 inline-block text-xs text-brand-500 hover:underline"
            >
              {t("participants.backToEvent")}
            </Link>
          </div>
        )}
      </ComponentCard>

      {!selectedEventId ? (
        <ComponentCard className="mt-6" title={t("participants.listTitle")} desc={t("participants.selectEventHint")}>
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            <Users className="size-8 opacity-40" />
            <p>{t("participants.selectEventHint")}</p>
          </div>
        </ComponentCard>
      ) : (
        <>
          <div className="mb-6 mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={t("participants.metricTotal")} value={stats?.total ?? 0} />
            <MetricCard label={t("participants.metricParticipants")} value={stats?.participants ?? 0} />
            <MetricCard label={t("participants.metricEnseignants")} value={stats?.enseignants ?? 0} />
            <MetricCard label={t("participants.metricEmails")} value={stats?.with_email ?? 0} />
          </div>

          <ComponentCard title={t("participants.importTitle")} desc={t("participants.importDesc")}>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              aria-label={t("participants.importButton")}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImport(file);
              }}
            />
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                startIcon={isImporting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                disabled={isImporting}
                onClick={() => fileRef.current?.click()}
              >
                {isImporting ? t("participants.importing") : t("participants.importButton")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                startIcon={<Download className="size-4" />}
                disabled={isImporting}
                onClick={() =>
                  void (async () => {
                    const token = await getApiToken(getToken);
                    await downloadParticipantImportTemplate(token);
                  })()
                }
              >
                {t("imports.downloadParticipantsTemplate")}
              </Button>
              {stats?.last_imported_at && (
                <p className="self-center text-xs text-gray-500 dark:text-gray-400">
                  {t("participants.lastImport")} : {new Date(stats.last_imported_at).toLocaleString()}
                </p>
              )}
            </div>
            {stats?.source_event_title && (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                {t("participants.sourceEvent")} : {stats.source_event_title}
              </p>
            )}
          </ComponentCard>

          <ComponentCard
            className="mt-6"
            title={t("participants.generateTitle")}
            desc={t("participants.generateDesc")}
          >
            <div className="mb-4 max-w-3xl space-y-2">
              <Label>{t("participants.certificateTitleLabel")}</Label>
              <TextArea
                rows={3}
                value={certificateTitle}
                onChange={setCertificateTitle}
                placeholder={t("participants.certificateTitlePlaceholder")}
                disabled={isTitleLoading || !stats?.source_event_title}
                hint={
                  stats?.source_event_title
                    ? `${t("participants.sourceEvent")} : ${stats.source_event_title}`
                    : t("participants.certificateTitleHintNoImport")
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isTitleLoading || !stats?.source_event_title}
                  startIcon={
                    isTitleLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )
                  }
                  onClick={() => void loadCertificateTitle(true)}
                >
                  {isTitleLoading ? t("participants.titleFormatting") : t("participants.titleFormatAi")}
                </Button>
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {(["all", "participant", "enseignant"] as CertificateRoleFilter[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFilter(role)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    roleFilter === role
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300"
                  }`}
                >
                  {t(`participants.roleFilter.${role}`)}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              startIcon={isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              disabled={
                isGenerating ||
                (stats?.total ?? 0) === 0 ||
                !certificateTitle.trim() ||
                isTitleLoading
              }
              onClick={() => void handleGenerate()}
            >
              {isGenerating ? t("participants.generating") : t("participants.generateButton")}
            </Button>
            {genProgress && (
              <CertificateGenerationProgressBar progress={genProgress} />
            )}
          </ComponentCard>

          <ComponentCard
            className="mt-6"
            title={t("participants.historyTitle")}
            desc={t("participants.historyDesc")}
          >
            {generations.length === 0 ? (
              <p className="py-6 text-sm text-gray-500 dark:text-gray-400">{t("participants.historyEmpty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 dark:border-gray-800">
                      <th className="px-3 py-2">{t("audit.created")}</th>
                      <th className="px-3 py-2">{t("participants.historyBy")}</th>
                      <th className="px-3 py-2">{t("participants.colRole")}</th>
                      <th className="px-3 py-2">{t("participants.historyCount")}</th>
                      <th className="px-3 py-2">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generations.map((gen) => (
                      <tr key={gen.id} className="border-b border-gray-50 dark:border-gray-800/80">
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-400">
                          {new Date(gen.created_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-gray-800 dark:text-white/90">
                          {gen.requested_by_name ?? `#${gen.requested_by_id}`}
                        </td>
                        <td className="px-3 py-2">
                          <Badge size="sm" color="light">
                            {t(`participants.roleFilter.${gen.role_filter as CertificateRoleFilter}`)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">{gen.certificate_count}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => void handlePreview(gen)}>
                              <Eye className="mr-1 size-4" />
                              {t("participants.preview")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void handleDownloadGeneration(gen)}>
                              <Download className="mr-1 size-4" />
                              {t("common.download")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {previewId && (
              <div className="mt-6 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
                  <p className="text-sm font-medium">{t("participants.previewTitle")}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPreviewId(null);
                      setEditorConfig(null);
                    }}
                  >
                    {t("documents.closeEditor")}
                  </Button>
                </div>
                <div className="min-h-[400px] p-3">
                  {isEditorLoading ? (
                    <p className="text-sm text-gray-500">{t("documents.onlyofficeLoading")}</p>
                  ) : (
                    <OnlyOfficeEditor
                      editorConfig={editorConfig}
                      className="min-h-[480px]"
                      autoFullscreen
                      onClose={() => {
                        setPreviewId(null);
                        setEditorConfig(null);
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </ComponentCard>

          <ComponentCard className="mt-6" title={t("participants.listTitle")} desc={t("participants.listDesc")}>
            <div className="mb-4 max-w-md">
              <Label>{t("participants.searchParticipant")}</Label>
              <Input
                value={participantSearchInput}
                onChange={(e) => {
                  setParticipantSearchInput(e.target.value);
                  setListPage(1);
                }}
                placeholder={t("participants.searchParticipantPlaceholder")}
              />
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
                <Loader2 className="size-4 animate-spin" />
                {t("common.loading")}
              </div>
            ) : listTotal === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                <Users className="size-8 opacity-40" />
                <p>{participantSearch ? t("participants.searchEmpty") : t("participants.empty")}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 dark:border-gray-800">
                        <th className="px-3 py-2">{t("participants.colName")}</th>
                        <th className="px-3 py-2">{t("participants.colRole")}</th>
                        <th className="px-3 py-2">{t("participants.colHospital")}</th>
                        <th className="px-3 py-2">{t("participants.colEmail")}</th>
                        <th className="px-3 py-2">{t("participants.colStatut")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((p) => (
                        <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800/80">
                          <td className="px-3 py-2 font-medium text-gray-800 dark:text-white/90">
                            <Link
                              to={`/certificats/participants/${p.id}?event=${selectedEventId}`}
                              className="text-brand-500 hover:underline"
                            >
                              {p.full_name}
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <Badge size="sm" color={p.certificate_role === "enseignant" ? "warning" : "primary"}>
                              {p.certificate_role === "enseignant"
                                ? t("participants.roleEnseignant")
                                : t("participants.roleParticipant")}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{p.hospital ?? "—"}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{p.email ?? "—"}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{p.statut ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <DataTablePagination
                  page={listPage}
                  totalPages={listTotalPages}
                  totalItems={listTotal}
                  rangeStart={listTotal === 0 ? 0 : (listPage - 1) * LIST_PAGE_SIZE + 1}
                  rangeEnd={Math.min(listPage * LIST_PAGE_SIZE, listTotal)}
                  onPageChange={setListPage}
                />
              </>
            )}
          </ComponentCard>
        </>
      )}
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{value.toLocaleString()}</p>
    </div>
  );
}
