import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { FileArchive } from "lucide-react";
import HelpTipAlert from "../components/common/HelpTipAlert";
import GuidedEmptyState from "../components/common/GuidedEmptyState";
import { useAuth } from "@clerk/clerk-react";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import AuthLoadingScreen from "../components/auth/AuthLoadingScreen";
import TipAnimatedLogo from "../components/brand/TipAnimatedLogo";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";
import Badge from "../components/ui/badge/Badge";
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
import { validateEventForGeneration } from "../features/events/eventGenerationReadiness";
import {
  canStartPackageGeneration,
  canSubmitPackageWorkflow,
  getLatestCompletedJob,
  hasCompletedPackage,
  isEventGenerationLocked,
  isWorkflowInReview,
  isWorkflowRejected,
  latestWorkflowStatus,
} from "../features/documents/eventPackageLock";
import { workflowStatusLabel } from "../features/auth/types";
import {
  downloadGenerationZip,
  fetchGenerationHistory,
  runPackageGeneration,
} from "../api/docgen";
import { submitPackage, fetchUsersByRole, fetchWorkflowState } from "../api/workflow";
import type { WorkflowFileReview } from "../api/workflow";
import type { Utilisateur } from "../features/auth/types";
import { ApiError } from "../api/client";
import { getApiToken } from "../lib/clerkToken";
import GenerationHistoryPanel from "../features/documents/GenerationHistoryPanel";
import GenerationProcessGuide from "../features/documents/GenerationProcessGuide";
import WorkflowStatusStepper from "../features/documents/WorkflowStatusStepper";
import GenerationLogPanel from "../features/documents/GenerationLogPanel";
import type { GenerationJob } from "../features/documents/types";
import { jobStatusColor, jobStatusLabel } from "../features/documents/types";
import { useTranslation } from "../i18n/useTranslation";
import { confirmAction, showError, showSuccess } from "../lib/swal";
import PackageFileRemarksPanel from "../features/documents/PackageFileRemarksPanel";
import { eventSelectLabelSuffix, isEventPackageApproved } from "../features/documents/eventWorkflowUi";
import { needsPackageGenerationHighlight } from "../features/events/packageGenerationUrgency";
import PackageDueEventsPanel from "../features/events/PackageDueEventsPanel";
import Select from "../components/form/Select";

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
  const { t } = useTranslation();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [searchParams] = useSearchParams();
  const { events, isLoading, loadEvents, update, isSubmitting } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [themeDraft, setThemeDraft] = useState<PreparationTheme | "">("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [history, setHistory] = useState<GenerationJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [eventDetail, setEventDetail] = useState<Evenement | null>(null);
  const [eventPackageFiles, setEventPackageFiles] = useState<PackageTemplate[]>([]);
  const [eventPackageBundle, setEventPackageBundle] = useState<PackageBundle | null>(null);
  const [packagePreviewLoading, setPackagePreviewLoading] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [reviewers, setReviewers] = useState<Utilisateur[]>([]);
  const [submitReviewerId, setSubmitReviewerId] = useState("");
  const [fileReviews, setFileReviews] = useState<WorkflowFileReview[]>([]);
  const [fileReviewsLoading, setFileReviewsLoading] = useState(false);

  const generationEventFilters = useMemo<EvenementFilters>(
    () => ({ upcoming: true, project_status: "Open" }),
    [],
  );

  useEffect(() => {
    void loadEvents(generationEventFilters);
  }, [generationEventFilters, loadEvents]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void (async () => {
      try {
        const token = await getApiToken(getToken);
        const users = await fetchUsersByRole(token, "controle_procedure");
        setReviewers(users);
      } catch {
        setReviewers([]);
      }
    })();
  }, [getToken, isLoaded, isSignedIn]);

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

  const selectableEvents = useMemo(
    () =>
      events
        .filter((event) => isUpcomingEvent(event) && isEventOpen(event.project_status))
        .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? "")),
    [events],
  );

  const eventTypeOptions = useMemo(
    () => distinctEventTypeFilterOptions(selectableEvents),
    [selectableEvents],
  );

  useEffect(() => {
    if (!eventTypeFilter) return;
    if (!eventTypeOptions.some((option) => option.value === eventTypeFilter)) {
      setEventTypeFilter("");
    }
  }, [eventTypeFilter, eventTypeOptions]);

  const filteredSelectableEvents = useMemo(() => {
    return selectableEvents.filter((event) => {
      if (!eventMatchesEventTypeFilter(event, eventTypeFilter)) return false;
      return eventMatchesSearch(event, eventSearchQuery);
    });
  }, [eventSearchQuery, eventTypeFilter, selectableEvents]);

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

  const selectedEvent = selectableEvents.find((event) => event.id === selectedEventId)
    ?? events.find((event) => event.id === selectedEventId);
  const selectedEventApproved = selectedEvent ? isEventPackageApproved(selectedEvent) : false;

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
      setActiveJob(getLatestCompletedJob(rows));
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [getToken, selectedEventId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const loadFileReviews = useCallback(async () => {
    const latest = getLatestCompletedJob(history);
    if (!latest || latest.status !== "completed") {
      setFileReviews([]);
      return;
    }
    setFileReviewsLoading(true);
    try {
      const token = await getApiToken(getToken);
      const state = await fetchWorkflowState(token, latest.id);
      setFileReviews(state.files);
    } catch {
      setFileReviews([]);
    } finally {
      setFileReviewsLoading(false);
    }
  }, [getToken, history]);

  useEffect(() => {
    void loadFileReviews();
  }, [loadFileReviews]);

  const eventOptions = useMemo(
    () =>
      filteredSelectableEvents.map((event) => ({
        value: event.id,
        label: `${eventOptionLabel(event)}${eventSelectLabelSuffix(event, t("documents.eventValidatedSuffix"))}`,
        disabled: isEventPackageApproved(event),
      })),
    [filteredSelectableEvents, t],
  );

  const selectedIsGeneratable = selectedEvent ? isGeneratableEvent(selectedEvent) : false;
  const inferredPackage = eventDetail?.inferred_package ?? selectedEvent?.inferred_package ?? null;
  const packageCandidates = inferredPackage?.package_candidates ?? [];
  const isFacultyEvent = selectedEvent ? inferActivityKind(selectedEvent) === "faculty" : false;
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
  const readinessSource = eventDetail ?? selectedEvent ?? null;
  const readinessIssues = useMemo(
    () => (readinessSource ? validateEventForGeneration(readinessSource, t) : []),
    [readinessSource, t],
  );
  const needsEventData = Boolean(selectedEvent && selectedIsGeneratable && readinessIssues.length > 0);
  const generationLocked = isEventGenerationLocked(history);
  const latestPackageWorkflow = latestWorkflowStatus(history);
  const canGenerate = canStartPackageGeneration(history);
  const workflowInReview = isWorkflowInReview(latestPackageWorkflow);
  const workflowRejected = isWorkflowRejected(latestPackageWorkflow);
  const themeSelectOptions = useMemo(() => {
    if (!selectedEvent) return [];
    return themeFormOptionsForEvent(selectedEvent, t).filter((opt) => opt.value !== "");
  }, [selectedEvent, t]);

  const applyPackageCandidate = async (candidate: PackageCandidate) => {
    if (!selectedEvent) return;
    const confirmed = await confirmAction({
      title: t("confirm.saveThemeTitle"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;
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

    const eventForReadiness = eventDetail ?? selectedEvent;
    const issues = validateEventForGeneration(eventForReadiness, t);
    if (issues.length > 0) {
      await showError(t("events.readinessTitle"), issues.join("\n"));
      return;
    }

    if (generationLocked) {
      await showError(t("documents.packageApprovedTitle"), t("documents.packageApprovedDesc"));
      return;
    }
    if (!canGenerate) {
      await showError(
        t("documents.generationBlockedTitle"),
        workflowRejected
          ? t("documents.generationBlockedRejectedDesc")
          : workflowInReview
            ? t("documents.packageInReviewDesc")
            : t("documents.generationBlockedDesc"),
      );
      return;
    }

    const confirmed = await confirmAction({
      title: t("confirm.generateTitle"),
      text: t("confirm.generateText"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
      icon: "question",
    });
    if (!confirmed.isConfirmed) return;

    let eventForGeneration = eventForReadiness;

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

    await runGeneration(eventForGeneration);
  };

  const handleSaveThemeOnly = async () => {
    const confirmed = await confirmAction({
      title: t("confirm.saveThemeTitle"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;
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

  const canSubmitWorkflow = (job: GenerationJob) => canSubmitPackageWorkflow(job);

  const handleSubmit = async (job: GenerationJob) => {
    const reviewerId = Number(submitReviewerId);
    if (!reviewerId) {
      await showError(t("common.error"), t("workflow.selectReviewer"));
      return;
    }
    const reviewer = reviewers.find((user) => user.id === reviewerId);
    const confirmed = await confirmAction({
      title: t("confirm.submitWorkflowTitle"),
      text: t("confirm.submitWorkflowText").replace(
        "{reviewer}",
        reviewer ? `${reviewer.prenom} ${reviewer.nom}` : String(reviewerId),
      ),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;
    try {
      const token = await getApiToken(getToken);
      const { workflow } = await submitPackage(token, job.id, reviewerId);
      setActiveJob({ ...job, workflow_status: workflow.workflow_status });
      await showSuccess(t("workflow.submitted"));
      if (selectedEventId) {
        const token2 = await getApiToken(getToken);
        setHistory(await fetchGenerationHistory(token2, selectedEventId));
      }
    } catch (err) {
      await showError(t("common.error"), err instanceof ApiError ? err.message : t("common.error"));
    }
  };

  const reviewerOptions = reviewers.map((user) => ({
    value: String(user.id),
    label: `${user.prenom} ${user.nom}`,
  }));

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

      <ComponentCard title={t("ux.safeModeTitle")} desc={t("ux.safeModeDesc")} className="mb-6">
        <GenerationProcessGuide
          hasEvent={Boolean(selectedEvent)}
          eventReady={Boolean(selectedEvent && selectedIsGeneratable && !needsEventData)}
          hasCompletedJob={Boolean(getLatestCompletedJob(history))}
          workflowStatus={latestPackageWorkflow}
        />
      </ComponentCard>

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
                {selectableEvents.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {filteredSelectableEvents.length} / {selectableEvents.length}{" "}
                    {t("documents.eventsShown")}
                  </p>
                )}
              </div>
              {generatableEvents.length === 0 && (
                <>
                  <GuidedEmptyState
                    icon={FileArchive}
                    title={t("documents.noEligible")}
                    message={t("ux.noEventsDesc")}
                  >
                    <Link to="/evenements">
                      <Button size="sm" variant="outline">{t("documents.eventList")}</Button>
                    </Link>
                  </GuidedEmptyState>
                  {excludedReady.length > 0 ? (
                    <div className="mt-4">
                      <HelpTipAlert
                        variant="warning"
                        title={t("documents.notEligibleError")}
                        message={t("ux.eventsExcludedHint").replace("{count}", String(excludedReady.length))}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {selectedEvent && (
              <div
                className={`rounded-xl border p-4 transition-opacity ${
                  selectedEventApproved
                    ? "border-gray-200 bg-gray-100/80 opacity-60 dark:border-gray-700 dark:bg-gray-900/40"
                    : "border-gray-100 dark:border-gray-800"
                }`}
              >
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
                  <Badge color={selectedEventApproved ? "success" : statusColor(selectedEvent.status)} size="sm">
                    {selectedEventApproved
                      ? t("documents.eventValidatedBadge")
                      : statusLabel(selectedEvent.status, t)}
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

            {selectedEvent && selectedIsGeneratable && needsEventData && (
              <HelpTipAlert
                variant="warning"
                title={t("events.readinessTitle")}
                message={`${t("events.readinessDesc")} ${readinessIssues.join(" · ")}`}
                linkHref={`/evenements/${selectedEvent.id}/modifier`}
                linkText={t("events.editEventLink")}
              />
            )}

            {selectedEvent && hasCompletedPackage(history) && latestPackageWorkflow ? (
              <HelpTipAlert
                variant={
                  generationLocked
                    ? "success"
                    : workflowRejected
                      ? "error"
                      : workflowInReview
                        ? "warning"
                        : "info"
                }
                title={
                  generationLocked
                    ? t("documents.packageApprovedTitle")
                    : workflowRejected
                      ? t("documents.packageRejectedTitle")
                      : workflowInReview
                        ? t("documents.packageInReviewTitle")
                        : t("documents.existingPackageTitle")
                }
                message={
                  generationLocked
                    ? t("documents.packageApprovedDesc")
                    : workflowRejected
                      ? t("documents.packageRejectedDesc")
                      : workflowInReview
                        ? t("documents.packageInReviewDesc")
                        : workflowStatusLabel(latestPackageWorkflow, t)
                }
              />
            ) : null}

            {showThemePanel && !themeInferenceLoading && (
              <HelpTipAlert
                variant="warning"
                title={t("documents.themeRequiredTitle")}
                message={t("documents.themeRequiredDesc")}
              />
            )}

            {showThemePanel && themeInferenceLoading ? (
              <div
                className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <TipAnimatedLogo size="xs" iconOnly animate className="shrink-0" />
                <span>{t("documents.loadingThemeSuggestion")}</span>
              </div>
            ) : showThemePanel ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">
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
            ) : null}

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
                  generationLocked ||
                  !canGenerate ||
                  !selectedEvent ||
                  !selectedIsGeneratable ||
                  needsEventData ||
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

            {activeJob?.workflow_status ? (
              <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                <WorkflowStatusStepper status={activeJob.workflow_status} />
              </div>
            ) : null}

            {selectedEventId && hasCompletedPackage(history) ? (
              <ComponentCard
                title={t("documents.fileRemarksTitle")}
                desc={t("documents.fileRemarksDesc")}
              >
                {fileReviewsLoading ? (
                  <p className="text-sm text-gray-500">{t("common.loading")}</p>
                ) : (
                  <PackageFileRemarksPanel
                    files={fileReviews}
                    workflowStatus={latestPackageWorkflow}
                  />
                )}
              </ComponentCard>
            ) : null}

            {activeJob && canSubmitWorkflow(activeJob) ? (
              <ComponentCard
                title={t("workflow.submitForReview")}
                desc={t("workflow.selectReviewer")}
              >
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  <div className="min-w-[220px] flex-1">
                    <Label>{t("workflow.assignReviewer")}</Label>
                    <Select
                      options={[
                        { value: "", label: t("workflow.selectReviewerPlaceholder") },
                        ...reviewerOptions,
                      ]}
                      value={submitReviewerId}
                      onChange={setSubmitReviewerId}
                    />
                  </div>
                  <Button size="sm" onClick={() => void handleSubmit(activeJob)}>
                    {t("workflow.submitForReview")}
                  </Button>
                </div>
              </ComponentCard>
            ) : null}
          </div>
        </ComponentCard>

        <ComponentCard title={t("documents.history")} desc={t("documents.historyDesc")}>
          {!selectedEventId ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("documents.selectEvent")}</p>
          ) : (
            <GenerationHistoryPanel
              jobs={history}
              loading={historyLoading}
              eventId={selectedEventId}
              onDownload={(job) => void handleDownload(job)}
            />
          )}
        </ComponentCard>
      </div>
    </>
  );
}
