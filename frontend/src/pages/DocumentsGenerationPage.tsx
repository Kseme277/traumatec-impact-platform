import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import AuthLoadingScreen from "../components/auth/AuthLoadingScreen";
import TipAnimatedLogo from "../components/brand/TipAnimatedLogo";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import Button from "../components/ui/button/Button";
import Badge from "../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { fetchEvent, updateEvent } from "../api/events";
import { fetchPackageBundles, fetchTemplates } from "../api/catalog";
import type { PackageBundle, PackageTemplate } from "../features/documents/types";
import { templateFileExtension } from "../features/documents/templateFileExtension";
import {
  effectiveListDays,
  filterTemplatesByPackageDuration,
} from "../features/documents/templateDurationFilter";
import { useEvents } from "../features/events/useEvents";
import type { Evenement, EvenementFilters, PreparationTheme } from "../features/events/types";
import { statusColor, statusLabel, themeLabel } from "../features/events/types";
import {
  distinctEventTypeFilterOptions,
  eventMatchesEventTypeFilter,
  eventMatchesSearch,
  formatEventDateRange,
  isGeneratableEvent,
  isUpcomingEvent,
} from "../features/events/eventDates";
import { isEventOpen } from "../features/events/projectStatus";
import type { PackageCandidate } from "../features/events/types";
import {
  inferActivityKind,
  isPreparationTheme,
  packageTypeLabel,
  suggestPreparationTheme,
  themeFormOptionsForEvent,
} from "../features/events/themeOptions";
import {
  downloadGenerationZip,
  fetchGenerationHistory,
  runPackageGeneration,
} from "../api/docgen";
import { submitPackage } from "../api/workflow";
import { workflowStatusLabel } from "../features/auth/types";
import { ApiError } from "../api/client";
import { getApiToken } from "../lib/clerkToken";
import GenerationLogPanel from "../features/documents/GenerationLogPanel";
import type { GenerationJob } from "../features/documents/types";
import { jobStatusColor, jobStatusLabel } from "../features/documents/types";
import { useTranslation } from "../i18n/useTranslation";
import { showError, showSuccess } from "../lib/swal";
import PackageDueEventsPanel from "../features/events/PackageDueEventsPanel";
import { needsPackageGenerationHighlight } from "../features/events/packageGenerationUrgency";

function contactFromEvent(event: Evenement | null): { email: string; phone: string } {
  if (!event) return { email: "", phone: "" };
  const meta = event.metadata_json;
  return {
    email: String(event.responsible_email ?? meta?.responsible_email ?? "").trim(),
    phone: String(event.responsible_phone ?? meta?.responsible_phone ?? "").trim(),
  };
}

function isValidResponsibleEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function eventOptionLabel(event: Evenement): string {
  const dates = formatEventDateRange(event);
  const shortTitle = event.title.length > 36 ? `${event.title.slice(0, 36)}…` : event.title;
  const pkgCode = event.inferred_package?.package_type;
  const activity = pkgCode
    ? (event.inferred_package?.package_label || pkgCode)
    : (event.event_type || "");
  const parts = [event.project_number];
  if (activity) parts.push(activity);
  parts.push(shortTitle, dates);
  return parts.join(" — ");
}

export default function DocumentsGenerationPage() {
  const { t, localeTag } = useTranslation();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [searchParams] = useSearchParams();
  const { events, isLoading, loadEvents, update, isSubmitting } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [themeDraft, setThemeDraft] = useState<PreparationTheme | "">("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [history, setHistory] = useState<GenerationJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistoryJobId, setExpandedHistoryJobId] = useState<string | null>(null);
  const [eventDetail, setEventDetail] = useState<Evenement | null>(null);
  const [eventPackageFiles, setEventPackageFiles] = useState<PackageTemplate[]>([]);
  const [eventPackageBundle, setEventPackageBundle] = useState<PackageBundle | null>(null);
  const [packagePreviewLoading, setPackagePreviewLoading] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [responsibleEmail, setResponsibleEmail] = useState("");
  const [responsiblePhone, setResponsiblePhone] = useState("");

  const generationEventFilters = useMemo<EvenementFilters>(
    () => ({ upcoming: true, project_status: "Open" }),
    [],
  );

  useEffect(() => {
    void loadEvents(generationEventFilters);
  }, [generationEventFilters, loadEvents]);

  useEffect(() => {
    const eventId = searchParams.get("event");
    if (eventId) {
      setSelectedEventId(eventId);
    }
  }, [searchParams]);

  const packageDueEvents = useMemo(
    () => events.filter(needsPackageGenerationHighlight),
    [events],
  );

  useEffect(() => {
    if (!selectedEventId) {
      setResponsibleEmail("");
      setResponsiblePhone("");
      return;
    }
    const source = eventDetail ?? events.find((event) => event.id === selectedEventId) ?? null;
    const contact = contactFromEvent(source);
    setResponsibleEmail(contact.email);
    setResponsiblePhone(contact.phone);
  }, [selectedEventId, eventDetail, events]);

  useEffect(() => {
    if (!selectedEventId || !isLoaded || !isSignedIn) {
      setEventDetail(null);
      setEventPackageFiles([]);
      setEventPackageBundle(null);
      return;
    }

    let cancelled = false;
    setPackagePreviewLoading(true);

    void (async () => {
      try {
        const token = await getApiToken(getToken);
        const detail = await fetchEvent(token, selectedEventId);
        if (cancelled) return;
        setEventDetail(detail);

        const packageType = detail.inferred_package?.package_type;
        if (!packageType) {
          setEventPackageFiles([]);
          setEventPackageBundle(null);
          return;
        }

        const bundles = await fetchPackageBundles(token, packageType);
        const active = bundles.find((b) => b.is_active) ?? null;
        if (cancelled) return;
        setEventPackageBundle(active);

        const files = await fetchTemplates(
          token,
          active ? { bundleId: active.id } : { packageType },
        );
        if (!cancelled) {
          const maxDays = effectiveListDays(
            detail.inferred_package?.duration_days ?? 1,
            detail.inferred_package?.expected_package_days ?? 3,
          );
          setEventPackageFiles(filterTemplatesByPackageDuration(files, maxDays));
        }
      } catch {
        if (!cancelled) {
          setEventDetail(null);
          setEventPackageFiles([]);
          setEventPackageBundle(null);
        }
      } finally {
        if (!cancelled) {
          setPackagePreviewLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, selectedEventId]);

  const generatableEvents = useMemo(
    () => events.filter(isGeneratableEvent).sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? "")),
    [events],
  );

  const eventTypeOptions = useMemo(
    () => distinctEventTypeFilterOptions(generatableEvents),
    [generatableEvents],
  );

  useEffect(() => {
    if (!eventTypeFilter) return;
    if (!eventTypeOptions.some((option) => option.value === eventTypeFilter)) {
      setEventTypeFilter("");
    }
  }, [eventTypeFilter, eventTypeOptions]);

  const filteredGeneratableEvents = useMemo(() => {
    return generatableEvents.filter((event) => {
      if (!eventMatchesEventTypeFilter(event, eventTypeFilter)) return false;
      return eventMatchesSearch(event, eventSearchQuery);
    });
  }, [eventSearchQuery, eventTypeFilter, generatableEvents]);

  const excludedReady = useMemo(
    () => events.filter((e) => !isGeneratableEvent(e) && (e.end_date || e.start_date)),
    [events],
  );

  const selectedEvent = generatableEvents.find((event) => event.id === selectedEventId)
    ?? events.find((event) => event.id === selectedEventId);

  const themeSourceEvent = eventDetail ?? selectedEvent;

  const themeInferenceLoading = Boolean(
    selectedEventId
    && packagePreviewLoading
    && selectedEvent
    && !selectedEvent.preparation_theme,
  );

  useEffect(() => {
    if (!selectedEventId) {
      setThemeDraft("");
      setActiveJob(null);
      setExpandedHistoryJobId(null);
      return;
    }

    if (selectedEvent?.preparation_theme && isPreparationTheme(selectedEvent.preparation_theme)) {
      setThemeDraft(selectedEvent.preparation_theme);
    } else if (themeInferenceLoading) {
      setThemeDraft("");
    } else if (themeSourceEvent) {
      setThemeDraft(suggestPreparationTheme(themeSourceEvent));
    } else {
      setThemeDraft("");
    }

    setActiveJob(null);
    setExpandedHistoryJobId(null);
  }, [
    selectedEventId,
    selectedEvent?.preparation_theme,
    themeInferenceLoading,
    themeSourceEvent,
  ]);

  const loadHistory = useCallback(async () => {
    if (!selectedEventId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const token = await getApiToken(getToken);
      const rows = await fetchGenerationHistory(token, selectedEventId);
      setHistory(rows);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [getToken, selectedEventId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const eventOptions = useMemo(
    () =>
      filteredGeneratableEvents.map((event) => ({
        value: event.id,
        label: eventOptionLabel(event),
      })),
    [filteredGeneratableEvents],
  );

  const selectedIsGeneratable = selectedEvent ? isGeneratableEvent(selectedEvent) : false;
  const inferredPackage = eventDetail?.inferred_package ?? selectedEvent?.inferred_package ?? null;
  const packageCandidates = inferredPackage?.package_candidates ?? [];
  const isFacultyEvent = selectedEvent ? inferActivityKind(selectedEvent) === "faculty" : false;
  const suggestedTheme = themeSourceEvent ? suggestPreparationTheme(themeSourceEvent) : "";
  const effectiveTheme =
    selectedEvent?.preparation_theme
    ?? (isPreparationTheme(themeDraft) ? themeDraft : null);
  const showThemePanel = Boolean(
    selectedEvent && selectedIsGeneratable && !selectedEvent.preparation_theme,
  );
  const needsTheme = Boolean(
    showThemePanel
    && !themeInferenceLoading
    && !isFacultyEvent
    && !isPreparationTheme(themeDraft)
    && packageCandidates.length === 0,
  );
  const needsContact = Boolean(
    selectedEvent && selectedIsGeneratable && (!responsibleEmail.trim() || !responsiblePhone.trim()),
  );
  const contactEmailInvalid = Boolean(responsibleEmail.trim() && !isValidResponsibleEmail(responsibleEmail));
  const themeSelectOptions = useMemo(() => {
    if (!selectedEvent) return [];
    return themeFormOptionsForEvent(selectedEvent, t).filter((opt) => opt.value !== "");
  }, [selectedEvent, t]);

  const applyPackageCandidate = async (candidate: PackageCandidate) => {
    if (!selectedEvent) return;
    const override = candidate.package_type === "NONOP_C" ? "NONOP_C" : null;
    const updated = await update(selectedEvent.id, {
      preparation_theme: (candidate.preparation_theme as PreparationTheme | null) || null,
      package_type_override: override,
    });
    if (updated) {
      setEventDetail(updated);
      if (candidate.preparation_theme && isPreparationTheme(candidate.preparation_theme)) {
        setThemeDraft(candidate.preparation_theme);
      }
      await loadEvents(generationEventFilters);
    }
  };

  const classifierLabel = (classifier?: string | null): string => {
    if (classifier === "nvidia") return t("documents.classifierNvidia");
    return t("documents.classifierRules");
  };

  const saveResponsibleContact = async (): Promise<Evenement | null> => {
    if (!selectedEvent) return null;

    const email = responsibleEmail.trim();
    const phone = responsiblePhone.trim();

    if (!email || !phone) {
      await showError(t("documents.responsibleContactRequiredTitle"), t("documents.responsibleContactRequiredDesc"));
      return null;
    }
    if (!isValidResponsibleEmail(email)) {
      await showError(t("documents.responsibleEmailInvalidTitle"), t("documents.responsibleEmailInvalidDesc"));
      return null;
    }

    const existing = contactFromEvent(selectedEvent);
    if (existing.email === email && existing.phone === phone) {
      return selectedEvent;
    }

    try {
      const token = await getApiToken(getToken);
      const updated = await updateEvent(token, selectedEvent.id, {
        responsible_email: email,
        responsible_phone: phone,
      });
      setEventDetail(updated);
      await loadEvents(generationEventFilters);
      return updated;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("profile.saveFailed");
      await showError(t("common.error"), message);
      return null;
    }
  };

  const saveTheme = async (options?: { quiet?: boolean }): Promise<Evenement | null> => {
    if (!selectedEvent) return null;
    if (!isPreparationTheme(themeDraft)) {
      await showError(t("documents.themeRequiredTitle"), t("documents.themeRequiredError"));
      return null;
    }
    if (options?.quiet) {
      try {
        const token = await getApiToken(getToken);
        const updated = await updateEvent(token, selectedEvent.id, {
          preparation_theme: themeDraft,
        });
        await loadEvents(generationEventFilters);
        return updated;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : t("profile.saveFailed");
        await showError(t("common.error"), message);
        return null;
      }
    }
    const updated = await update(selectedEvent.id, { preparation_theme: themeDraft });
    if (updated) {
      await loadEvents(generationEventFilters);
    }
    return updated;
  };

  const runGeneration = async (event: Evenement) => {
    if (!isGeneratableEvent(event)) {
      await showError(t("documents.notEligibleError"), t("documents.notEligibleErrorDesc"));
      return;
    }

    setIsGenerating(true);
    setActiveJob(null);
    try {
      const job = await runPackageGeneration(getToken, event.id, setActiveJob);
      setActiveJob(job);
      await loadHistory();

      if (job.status === "completed") {
        await showSuccess(
          t("documents.packageGenerated"),
          `${job.certificate_count} programme(s) — ZIP : ${job.zip_filename ?? "paquet.zip"}.`,
        );
      } else {
        await showError(t("documents.generationFailed"), job.error_message ?? t("documents.unknownError"));
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 401
            ? err.message || t("documents.sessionExpired")
            : err.message
          : t("documents.generationImpossible");
      await showError(t("common.error"), message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!isLoaded || !isSignedIn) {
      await showError(t("documents.signInRequired"), t("documents.signInRequiredDesc"));
      return;
    }

    if (!selectedEvent) {
      await showError(t("documents.selectionRequired"), t("documents.selectionRequiredDesc"));
      return;
    }

    let eventForGeneration = selectedEvent;

    const canGenerateWithoutTheme =
      isFacultyEvent
      || eventForGeneration.inferred_package?.package_type === "FET";
    if (!eventForGeneration.preparation_theme && !canGenerateWithoutTheme) {
      const updated = await saveTheme({ quiet: true });
      if (!updated?.preparation_theme) {
        return;
      }
      eventForGeneration = updated;
    }

    const withContact = await saveResponsibleContact();
    if (!withContact) {
      return;
    }
    eventForGeneration = withContact;

    await runGeneration(eventForGeneration);
  };

  const handleSaveThemeOnly = async () => {
    const updated = await saveTheme();
    if (updated?.preparation_theme) {
      await showSuccess(t("documents.themeSaved"), themeLabel(updated.preparation_theme));
    }
  };

  const handleDownload = async (job: GenerationJob) => {
    try {
      const token = await getApiToken(getToken);
      await downloadGenerationZip(token, job.id, job.zip_filename ?? "paquet.zip");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("documents.downloadFailed");
      await showError(t("common.error"), message);
    }
  };

  const canSubmitWorkflow = (job: GenerationJob) =>
    job.status === "completed" &&
    (!job.workflow_status ||
      job.workflow_status === "generated" ||
      job.workflow_status === "procedure_rejected" ||
      job.workflow_status === "validator_rejected");

  const handleSubmit = async (job: GenerationJob) => {
    try {
      const token = await getApiToken(getToken);
      const { workflow } = await submitPackage(token, job.id);
      setActiveJob({ ...job, workflow_status: workflow.workflow_status });
      await showSuccess("Paquet soumis pour contrôle procédure");
      if (selectedEventId) {
        const token2 = await getApiToken(getToken);
        setHistory(await fetchGenerationHistory(token2, selectedEventId));
      }
    } catch (err) {
      await showError(t("common.error"), err instanceof Error ? err.message : t("common.error"));
    }
  };

  if (isLoading) {
    return <AuthLoadingScreen message={t("documents.loadingReady")} />;
  }

  return (
    <>
      <PageMeta
        title={`${t("documents.generationTitle")} | TIP`}
        description={t("documents.generationMeta")}
      />
      <AdminBreadcrumb
        pageTitle={t("documents.generationTitle")}
        crumbs={[
          { label: t("nav.documents"), to: "/documents/templates" },
          { label: t("nav.templates"), to: "/documents/templates" },
        ]}
      />

      <PackageDueEventsPanel events={packageDueEvents} className="mb-6" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ComponentCard
          title={t("documents.launchGeneration")}
          desc={t("documents.launchGenerationDesc")}
          className="xl:col-span-2"
        >
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t("documents.searchEvent")}</Label>
                  <Input
                    value={eventSearchQuery}
                    onChange={(e) => setEventSearchQuery(e.target.value)}
                    placeholder={t("documents.searchEventPlaceholder")}
                  />
                </div>
                <div>
                  <Label>{t("documents.filterEventType")}</Label>
                  <Select
                    placeholder={t("documents.allEventTypes")}
                    options={eventTypeOptions}
                    value={eventTypeFilter}
                    onChange={(value) => setEventTypeFilter(value)}
                  />
                </div>
              </div>
              <div>
                <Label>{t("documents.upcomingReady")}</Label>
                <Select
                  placeholder={t("documents.chooseEvent")}
                  options={eventOptions}
                  value={selectedEventId}
                  onChange={(value) => setSelectedEventId(value)}
                />
                {generatableEvents.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {filteredGeneratableEvents.length} / {generatableEvents.length}{" "}
                    {t("documents.eventsShown")}
                  </p>
                )}
              </div>
              {generatableEvents.length === 0 && (
                <div className="mt-2 space-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <p>{t("documents.noEligible")}</p>
                  {excludedReady.length > 0 && (
                    <ul className="list-inside list-disc">
                      {excludedReady.slice(0, 5).map((e) => (
                        <li key={e.id}>
                          {e.project_number} —{" "}
                          {!isEventOpen(e.project_status)
                            ? t("documents.projectNotOpen")
                            : !e.start_date && !e.end_date
                              ? t("documents.missingDates")
                              : !isUpcomingEvent(e)
                                ? t("documents.pastDates")
                                : t("documents.notReady")}
                          {" · "}
                          <Link to={`/evenements/${e.id}/modifier`} className="text-brand-500 hover:underline">
                            {t("common.edit")}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p>
                    <Link to="/evenements" className="text-brand-500 hover:underline">
                      {t("documents.eventList")}
                    </Link>
                  </p>
                </div>
              )}
            </div>

            {selectedEvent && (
              <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white/90">{selectedEvent.title}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {selectedEvent.project_number} ·{" "}
                      {[selectedEvent.city, selectedEvent.country].filter(Boolean).join(", ")}
                    </p>
                    <p className="mt-1 text-sm font-medium text-brand-600 dark:text-brand-400">
                      {formatEventDateRange(selectedEvent)}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {effectiveTheme ? themeLabel(effectiveTheme) : t("documents.themeRequired")}
                    </p>
                  </div>
                  <Badge color={statusColor(selectedEvent.status)} size="sm">
                    {statusLabel(selectedEvent.status, t)}
                  </Badge>
                </div>
                {!selectedIsGeneratable && (
                  <p className="mt-3 text-sm text-warning-600 dark:text-warning-400">
                    {t("documents.notEligible")}
                  </p>
                )}

                {inferredPackage && (
                  <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/30 p-3 dark:border-brand-500/20 dark:bg-brand-500/5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {t("events.inferredPackage")} : {packageTypeLabel(inferredPackage.package_type, t)} ({inferredPackage.package_type})
                      </p>
                      <Badge color={inferredPackage.classifier === "nvidia" ? "primary" : "light"} size="sm">
                        {classifierLabel(inferredPackage.classifier)}
                      </Badge>
                      {inferredPackage.confidence != null && inferredPackage.classifier === "nvidia" && (
                        <span className="text-xs text-gray-500">
                          {Math.round(inferredPackage.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {inferredPackage.activity_label} ·{" "}
                      {inferredPackage.expected_package_days}{" "}
                      {inferredPackage.expected_package_days > 1 ? t("documents.days") : t("documents.day")}
                      {inferredPackage.expected_package_days !== inferredPackage.duration_days && (
                        <span>
                          {" "}
                          ({t("documents.eventCalendarDays")}: {inferredPackage.duration_days})
                        </span>
                      )}
                      {eventPackageBundle ? ` · v${eventPackageBundle.version}` : ""}
                    </p>
                    <Link
                      to={`/documents/templates?type=${inferredPackage.package_type}`}
                      className="mt-2 inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {t("documents.viewEventPackage")}
                    </Link>
                  </div>
                )}

                {packagePreviewLoading ? (
                  <p className="mt-3 text-sm text-gray-500">{t("documents.loadingEventPackage")}</p>
                ) : eventPackageFiles.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {t("documents.eventPackageFiles")} ({eventPackageFiles.length})
                    </p>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-gray-600 dark:text-gray-300">
                      {eventPackageFiles.map((file) => (
                        <li key={file.id} className="truncate" title={file.name}>
                          {file.name}
                          <span className="ml-1 text-gray-400">· {templateFileExtension(file.file_path)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : inferredPackage ? (
                  <p className="mt-3 text-sm text-warning-600 dark:text-warning-400">
                    {t("documents.noEventPackageFiles")}
                  </p>
                ) : null}
              </div>
            )}

            {selectedEvent && selectedIsGeneratable && (
              <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {t("documents.responsibleContactTitle")}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t("documents.responsibleContactDesc")}
                </p>
                {selectedEvent.responsible_person && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {t("events.responsible")} :{" "}
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {selectedEvent.responsible_person}
                    </span>
                  </p>
                )}
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>
                      {t("events.responsibleEmail")} <span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      value={responsibleEmail}
                      onChange={(e) => setResponsibleEmail(e.target.value)}
                      placeholder="responsable@exemple.org"
                    />
                    {contactEmailInvalid && (
                      <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                        {t("documents.responsibleEmailInvalidDesc")}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>
                      {t("events.responsiblePhone")} <span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="tel"
                      value={responsiblePhone}
                      onChange={(e) => setResponsiblePhone(e.target.value)}
                      placeholder="+221 77 000 00 00"
                    />
                  </div>
                </div>
              </div>
            )}

            {showThemePanel && (
              <div className="rounded-xl border border-warning-200 bg-warning-50/80 p-4 dark:border-warning-500/30 dark:bg-warning-500/10">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {t("documents.themeRequiredTitle")}
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {t("documents.themeRequiredDesc")}
                </p>
                {themeInferenceLoading ? (
                  <div
                    className="mt-4 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400"
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <TipAnimatedLogo size="xs" iconOnly animate className="shrink-0" />
                    <span>{t("documents.loadingThemeSuggestion")}</span>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {t("events.suggestThemePick")}
                      {inferredPackage?.classifier === "nvidia" && (
                        <span className="ml-1 text-xs text-brand-500">
                          ({t("documents.classifierNvidia")})
                        </span>
                      )}
                    </p>
                    {packageCandidates.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {packageCandidates.map((candidate) => (
                          <Button
                            key={candidate.package_type}
                            size="sm"
                            variant={candidate.suggested ? "primary" : "outline"}
                            disabled={isSubmitting}
                            onClick={() => void applyPackageCandidate(candidate)}
                          >
                            {packageTypeLabel(candidate.package_type, t)}
                            {candidate.suggested ? ` (${t("events.suggestedPackage")})` : ""}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 max-w-md">
                        <Label>{t("events.theme")}</Label>
                        <Select
                          placeholder={t("events.chooseTheme")}
                          options={isFacultyEvent ? [] : themeSelectOptions}
                          value={themeDraft}
                          onChange={(value) => setThemeDraft(value as PreparationTheme | "")}
                        />
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button
                            size="sm"
                            disabled={isSubmitting || (!isFacultyEvent && !isPreparationTheme(themeDraft))}
                            onClick={() => void handleSaveThemeOnly()}
                          >
                            {isSubmitting ? t("common.saving") : t("documents.saveTheme")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeJob && (
              <div className="space-y-3">
                <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 dark:border-brand-500/20 dark:bg-brand-500/10">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">{t("documents.jobRunning")}</p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    <span className="mr-2 inline-block">
                      <Badge color={jobStatusColor(activeJob.status)} size="sm">
                        {jobStatusLabel(activeJob.status, t)}
                      </Badge>
                    </span>
                    {activeJob.error_message ?? ""}
                  </p>
                </div>
                <GenerationLogPanel
                  logs={activeJob.logs ?? []}
                  maxHeightClass={isGenerating ? "max-h-72" : "max-h-48"}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6 dark:border-gray-800">
              <Button
                size="sm"
                disabled={
                  isGenerating ||
                  themeInferenceLoading ||
                  !selectedEvent ||
                  !selectedIsGeneratable ||
                  needsContact ||
                  contactEmailInvalid ||
                  (showThemePanel && needsTheme)
                }
                onClick={() => void handleGenerate()}
              >
                {isGenerating
                  ? t("documents.generating")
                  : needsTheme
                    ? t("documents.saveThemeAndGenerate")
                    : t("documents.generateZip")}
              </Button>
              {activeJob?.status === "completed" && activeJob.zip_available !== false && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleDownload(activeJob)}
                >
                  {t("documents.downloadZip")}
                </Button>
              )}
              {activeJob && canSubmitWorkflow(activeJob) ? (
                <Button size="sm" onClick={() => void handleSubmit(activeJob)}>
                  Soumettre pour contrôle
                </Button>
              ) : null}
              {activeJob?.workflow_status ? (
                <Badge color="info" size="sm">
                  {workflowStatusLabel(activeJob.workflow_status)}
                </Badge>
              ) : null}
              {activeJob?.status === "completed" && activeJob.zip_available === false && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t("documents.zipExpired")}
                </span>
              )}
              {selectedEvent && (
                <Link to={`/evenements/${selectedEvent.id}/modifier`}>
                  <Button size="sm" variant="outline">
                    {t("documents.editEvent")}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title={t("documents.history")} desc={t("documents.historyDesc")}>
          {!selectedEventId ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("documents.selectEvent")}</p>
          ) : historyLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("documents.noGeneration")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader className="px-2 py-2 text-xs">
                      {t("common.status")}
                    </TableCell>
                    <TableCell isHeader className="px-2 py-2 text-xs">
                      {t("common.date")}
                    </TableCell>
                    <TableCell isHeader className="px-2 py-2 text-xs">
                      {t("common.file")}
                    </TableCell>
                    <TableCell isHeader className="px-2 py-2 text-xs text-right">
                      {t("documents.generationLogs")}
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((job) => (
                    <Fragment key={job.id}>
                      <TableRow>
                        <TableCell className="px-2 py-2">
                          <div className="flex flex-col gap-1">
                            <Badge color={jobStatusColor(job.status)} size="sm">
                              {jobStatusLabel(job.status, t)}
                            </Badge>
                            {job.workflow_status ? (
                              <Badge color="light" size="sm">
                                {workflowStatusLabel(job.workflow_status)}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-2 text-xs text-gray-500">
                          {new Date(job.created_at).toLocaleString(localeTag)}
                        </TableCell>
                        <TableCell className="px-2 py-2 text-right">
                          {job.status === "completed" && job.zip_available !== false && (
                            <button
                              type="button"
                              className="text-xs font-medium text-brand-500 hover:underline"
                              onClick={() => void handleDownload(job)}
                            >
                              ZIP
                            </button>
                          )}
                          {job.status === "completed" && job.zip_available === false && (
                            <span className="text-xs text-gray-400">{t("documents.zipExpiredShort")}</span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-2 text-right">
                          {(job.logs?.length ?? 0) > 0 && (
                            <button
                              type="button"
                              className="text-xs font-medium text-brand-500 hover:underline"
                              onClick={() =>
                                setExpandedHistoryJobId((current) =>
                                  current === job.id ? null : job.id,
                                )
                              }
                            >
                              {expandedHistoryJobId === job.id
                                ? t("documents.hideLogs")
                                : t("documents.viewLogs")}
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedHistoryJobId === job.id && (job.logs?.length ?? 0) > 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="px-2 py-2">
                            <GenerationLogPanel logs={job.logs ?? []} maxHeightClass="max-h-48" />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ComponentCard>
      </div>
    </>
  );
}
