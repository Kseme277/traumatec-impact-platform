import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import HelpTipAlert from "../components/common/HelpTipAlert";
import { useAuth } from "@clerk/clerk-react";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import SpinnerLoader from "../components/common/SpinnerLoader";
import TipAnimatedLogo from "../components/brand/TipAnimatedLogo";
import Label from "../components/form/Label";
import Button from "../components/ui/button/Button";
import Badge from "../components/ui/badge/Badge";
import { fetchEvent, updateEvent } from "../api/events";
import { fetchPackageBundles, fetchTemplates } from "../api/catalog";
import type { PackageBundle, PackageTemplate } from "../features/documents/types";
import { templateDisplayName } from "../features/documents/types";
import DocumentFileManagerTable from "../features/documents/DocumentFileManagerTable";
import { documentRoleLabel } from "../features/documents/documentRoleLabel";
import {
  effectiveListDays,
  filterTemplatesByPackageDuration,
} from "../features/documents/templateDurationFilter";
import { useEvents } from "../features/events/useEvents";
import type { Evenement, PreparationTheme } from "../features/events/types";
import { statusColor, statusLabel, themeLabel } from "../features/events/types";
import {
  formatEventDateRange,
  isGeneratableEvent,
} from "../features/events/eventDates";
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
  canEditPackageFiles,
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
import { isEventPackageApproved } from "../features/documents/eventWorkflowUi";
import { getCentralRejectComment, getRemarksJob } from "../features/documents/workflowRemarks";
import Select from "../components/form/Select";

export default function DocumentsGenerationDetailPage() {
  const { t } = useTranslation();
  const { eventId: selectedEventId = "" } = useParams();
  const navigate = useNavigate();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [themeDraft, setThemeDraft] = useState<PreparationTheme | "">("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [history, setHistory] = useState<GenerationJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [eventDetail, setEventDetail] = useState<Evenement | null>(null);
  const [eventPackageFiles, setEventPackageFiles] = useState<PackageTemplate[]>([]);
  const [eventPackageBundle, setEventPackageBundle] = useState<PackageBundle | null>(null);
  const [packagePreviewLoading, setPackagePreviewLoading] = useState(false);
  const [reviewers, setReviewers] = useState<Utilisateur[]>([]);
  const [submitReviewerId, setSubmitReviewerId] = useState("");
  const [fileReviews, setFileReviews] = useState<WorkflowFileReview[]>([]);
  const [fileReviewsLoading, setFileReviewsLoading] = useState(false);
  const [centralRemark, setCentralRemark] = useState<string | null>(null);

  const { update, isSubmitting } = useEvents();

  const refreshEventDetail = useCallback(async () => {
    if (!selectedEventId) return null;
    const token = await getApiToken(getToken);
    const detail = await fetchEvent(token, selectedEventId);
    setEventDetail(detail);
    return detail;
  }, [getToken, selectedEventId]);

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

        if (isEventPackageApproved(detail)) {
          navigate("/documents/generation", { replace: true });
          return;
        }

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
  }, [getToken, isLoaded, isSignedIn, navigate, selectedEventId]);

  const selectedEvent = eventDetail;
  const isLoading = Boolean(selectedEventId) && !eventDetail && isLoaded && isSignedIn && packagePreviewLoading;

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
      const remarksJob = getRemarksJob(rows);
      setActiveJob(remarksJob ?? getLatestCompletedJob(rows));
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
    const remarksJob = getRemarksJob(history);
    if (!remarksJob || remarksJob.status !== "completed") {
      setFileReviews([]);
      setCentralRemark(null);
      return;
    }
    setFileReviewsLoading(true);
    try {
      const token = await getApiToken(getToken);
      const state = await fetchWorkflowState(token, remarksJob.id);
      setFileReviews(state.files);
      setCentralRemark(getCentralRejectComment(state.history));
    } catch {
      setFileReviews([]);
      setCentralRemark(null);
    } finally {
      setFileReviewsLoading(false);
    }
  }, [getToken, history]);

  useEffect(() => {
    void loadFileReviews();
  }, [loadFileReviews]);

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
  const remarksJob = useMemo(() => getRemarksJob(history), [history]);
  const workflowJob = remarksJob ?? activeJob ?? getLatestCompletedJob(history);
  const canCorrectFiles = Boolean(workflowJob && canEditPackageFiles(workflowJob));
  const canSubmitForReview = Boolean(workflowJob && canSubmitPackageWorkflow(workflowJob));
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
      await refreshEventDetail();
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
        await refreshEventDetail();
        return updated;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : t("profile.saveFailed");
        await showError(t("common.error"), message);
        return null;
      }
    }
    const updated = await update(selectedEvent.id, { preparation_theme: themeDraft });
    if (updated) {
      setEventDetail(updated);
      await refreshEventDetail();
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
    return (
      <>
        <PageMeta title={`${t("documents.generationTitle")} | TIP`} description={t("documents.generationMeta")} />
        <AdminBreadcrumb
          pageTitle={t("documents.generationTitle")}
          crumbs={[
            { label: t("nav.documents"), to: "/documents/templates" },
            { label: t("nav.generation"), to: "/documents/generation" },
          ]}
        />
        <SpinnerLoader message={t("documents.loadingReady")} />
      </>
    );
  }

  if (!selectedEventId || !selectedEvent) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-gray-500">{t("events.notFound")}</p>
        <Link to="/documents/generation" className="mt-4 inline-block text-sm text-brand-500 hover:underline">
          {t("documents.backToGenerationList")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={`${t("documents.generationTitle")} | TIP`}
        description={t("documents.generationMeta")}
      />
      <AdminBreadcrumb
        pageTitle={selectedEvent.project_number ?? t("documents.generationTitle")}
        crumbs={[
          { label: t("nav.documents"), to: "/documents/templates" },
          { label: t("nav.generation"), to: "/documents/generation" },
        ]}
      />

      <div className="mb-6">
        <Link to="/documents/generation">
          <Button size="sm" variant="outline" startIcon={<ArrowLeft className="size-4" />}>
            {t("documents.backToGenerationList")}
          </Button>
        </Link>
      </div>

      <ComponentCard className="mb-6" desc={t("ux.safeModeDesc")}>
        <GenerationProcessGuide
          hasEvent
          eventReady={Boolean(selectedIsGeneratable && !needsEventData)}
          hasCompletedJob={Boolean(getLatestCompletedJob(history))}
          workflowStatus={latestPackageWorkflow}
        />
      </ComponentCard>

      <div className="space-y-6">
        <ComponentCard title={t("documents.launchGeneration")} desc={t("documents.launchGenerationDesc")}>
          <div className="space-y-6">
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
                  <div className="mt-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {t("documents.eventPackageFiles")} ({eventPackageFiles.length})
                      </p>
                    </div>
                    <DocumentFileManagerTable
                      rows={eventPackageFiles.map((file) => ({
                        id: file.id,
                        name: templateDisplayName(file),
                        filePath: file.file_path,
                        subtitle: documentRoleLabel(file.document_type, t),
                        category: documentRoleLabel(file.document_type, t),
                        modifiedAt: file.created_at,
                      }))}
                    />
                  </div>
                ) : inferredPackage ? (
                  <p className="mt-3 text-sm text-warning-600 dark:text-warning-400">
                    {t("documents.noEventPackageFiles")}
                  </p>
                ) : null}
              </div>

            {selectedIsGeneratable && needsEventData && (
              <HelpTipAlert
                variant="warning"
                title={t("events.readinessTitle")}
                message={`${t("events.readinessDesc")} ${readinessIssues.join(" · ")}`}
                linkHref={`/evenements/${selectedEvent.id}/modifier`}
                linkText={t("events.editEventLink")}
              />
            )}

            {hasCompletedPackage(history) && latestPackageWorkflow ? (
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
          </div>
        </ComponentCard>

        {hasCompletedPackage(history) ? (
          <ComponentCard title={t("documents.fileRemarksTitle")} desc={t("documents.fileRemarksDesc")}>
            {fileReviewsLoading ? (
              <p className="text-sm text-gray-500">{t("common.loading")}</p>
            ) : (
              <PackageFileRemarksPanel
                files={fileReviews}
                workflowStatus={latestPackageWorkflow}
                centralRemark={centralRemark}
                jobId={workflowJob?.id ?? null}
                canEdit={canCorrectFiles}
                onFileCorrected={() => void loadFileReviews()}
              />
            )}
          </ComponentCard>
        ) : null}

        {workflowJob && canSubmitForReview ? (
          <ComponentCard title={t("workflow.submitForReview")} desc={t("workflow.selectReviewer")}>
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
              <Button size="sm" onClick={() => void handleSubmit(workflowJob)}>
                {t("workflow.submitForReview")}
              </Button>
            </div>
          </ComponentCard>
        ) : null}

        <ComponentCard title={t("documents.history")} desc={t("documents.historyDesc")}>
          <GenerationHistoryPanel
            jobs={history}
            loading={historyLoading}
            eventId={selectedEventId}
            onDownload={(job) => void handleDownload(job)}
          />
        </ComponentCard>
      </div>
    </>
  );
}
