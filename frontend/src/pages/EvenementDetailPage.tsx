import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import AuthLoadingScreen from "../components/auth/AuthLoadingScreen";
import Button from "../components/ui/button/Button";
import Badge from "../components/ui/badge/Badge";
import { useEvents } from "../features/events/useEvents";
import type { Evenement } from "../features/events/types";
import type { PackageCandidate, PreparationTheme } from "../features/events/types";
import { themeLabel } from "../features/events/types";
import { packageTypeLabel } from "../features/events/themeOptions";
import { formatDateRangeFr } from "../features/events/eventDates";
import ProjectStatusBadge from "../features/events/ProjectStatusBadge";
import { isEventFinished, isEventOpen } from "../features/events/projectStatus";
import { useTipAuth } from "../context/TipAuthContext";
import { useTranslation } from "../i18n/useTranslation";
import { fetchGenerationHistory, downloadGenerationZip } from "../api/docgen";
import { getApiToken } from "../lib/clerkToken";
import GenerationHistoryPanel from "../features/documents/GenerationHistoryPanel";
import { getApprovedGenerationJob } from "../features/documents/eventPackageLock";
import { isEventPackageApproved } from "../features/documents/eventWorkflowUi";
import type { GenerationJob } from "../features/documents/types";
import { ApiError } from "../api/client";
import { showError } from "../lib/swal";

function DetailRow({
  label,
  children,
  multiline = false,
}: {
  label: string;
  children: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-gray-100 py-4 last:border-0 dark:border-gray-800 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="shrink-0 text-theme-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <div
        className={`min-w-0 text-theme-sm text-gray-800 dark:text-white/90 ${
          multiline ? "break-words sm:max-w-[68%] sm:text-right" : "sm:text-right"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function EvenementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { isAdmin } = useTipAuth();
  const { t } = useTranslation();
  const { loadEvent, close, remove, update } = useEvents();
  const [event, setEvent] = useState<Evenement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [generationHistory, setGenerationHistory] = useState<GenerationJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    void loadEvent(id)
      .then(setEvent)
      .catch(() => setEvent(null))
      .finally(() => setIsLoading(false));
  }, [id, loadEvent]);

  useEffect(() => {
    if (!id) return;
    setHistoryLoading(true);
    void (async () => {
      try {
        const token = await getApiToken(getToken);
        setGenerationHistory(await fetchGenerationHistory(token, id));
      } catch {
        setGenerationHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [getToken, id]);

  const handleDownloadJob = async (job: GenerationJob) => {
    try {
      const token = await getApiToken(getToken);
      await downloadGenerationZip(token, job.id, job.zip_filename ?? "paquet.zip");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("documents.downloadFailed");
      await showError(t("common.error"), message);
    }
  };

  const approvedJob = useMemo(
    () => getApprovedGenerationJob(generationHistory),
    [generationHistory],
  );

  if (isLoading) {
    return <AuthLoadingScreen message={t("events.loading")} />;
  }

  if (!event) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-gray-500">{t("events.notFound")}</p>
        <Link to="/evenements" className="mt-4 inline-block text-sm text-brand-500 hover:underline">
          {t("events.backToList")}
        </Link>
      </div>
    );
  }

  const handleClose = async () => {
    const ok = await close(event);
    if (ok) {
      const refreshed = await loadEvent(event.id);
      setEvent(refreshed);
    }
  };

  const handleDelete = async () => {
    const ok = await remove(event);
    if (ok) navigate("/evenements");
  };

  const packageApproved = isEventPackageApproved(event) || approvedJob !== null;
  const canDownloadValidatedPackage = Boolean(
    approvedJob && approvedJob.zip_available !== false,
  );

  return (
    <>
      <PageMeta title={`${event.title} | TIP`} description="Fiche événement Traumatec" />
      <AdminBreadcrumb
        pageTitle={event.title}
        crumbs={[{ label: t("nav.events"), to: "/evenements" }]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ComponentCard title={t("events.detail")} desc={t("events.detailDesc")} className="xl:col-span-2">
          <DetailRow label={t("events.project")}>{event.project_number}</DetailRow>
          <DetailRow label={t("events.eventTitle")} multiline>
            {event.title}
          </DetailRow>
          <DetailRow label={t("events.activity")}>{event.event_type ?? "—"}</DetailRow>
          <DetailRow label={t("events.responsible")}>{event.responsible_person ?? "—"}</DetailRow>
          <DetailRow label={t("events.responsibleEmail")}>
            {(event.metadata_json?.responsible_email as string | undefined) ?? "—"}
          </DetailRow>
          <DetailRow label={t("events.responsiblePhone")}>
            {(event.metadata_json?.responsible_phone as string | undefined) ?? "—"}
          </DetailRow>
          <DetailRow label={t("events.status")}>
            <ProjectStatusBadge projectStatus={event.project_status} />
          </DetailRow>
          <DetailRow label={t("events.theme")}>
            {event.inferred_package?.activity_kind === "faculty"
              ? t("events.facultyNoTheme")
              : themeLabel(event.preparation_theme, t)}
          </DetailRow>
          {event.inferred_package && (
            <DetailRow label={t("events.inferredPackage")}>
              <span className="inline-flex flex-wrap items-center gap-2">
                <span>
                  {packageTypeLabel(event.inferred_package.package_type, t)}
                  {" ("}
                  {event.inferred_package.package_type}
                  {") · "}
                  {event.inferred_package.activity_label}
                  {" · "}
                  {event.inferred_package.duration_days} {t("documents.days")}
                </span>
                <Badge color={event.inferred_package.classifier === "nvidia" ? "primary" : "light"} size="sm">
                  {event.inferred_package.classifier === "nvidia"
                    ? t("documents.classifierNvidia")
                    : t("documents.classifierRules")}
                </Badge>
              </span>
            </DetailRow>
          )}
          {!event.preparation_theme
            && event.inferred_package?.activity_kind !== "faculty"
            && (event.inferred_package?.package_candidates?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-4 dark:border-brand-500/20">
              <p className="text-sm text-gray-700 dark:text-gray-300">{t("events.suggestThemePick")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(event.inferred_package?.package_candidates ?? []).map((candidate: PackageCandidate) => (
                  <Button
                    key={candidate.package_type}
                    size="sm"
                    variant={candidate.suggested ? "primary" : "outline"}
                    onClick={() => {
                      const override =
                        candidate.package_type === "NONOP_C" ? "NONOP_C" : null;
                      void update(event.id, {
                        preparation_theme: (candidate.preparation_theme as PreparationTheme | null) || null,
                        package_type_override: override,
                      }).then((updated) => updated && setEvent(updated));
                    }}
                  >
                    {packageTypeLabel(candidate.package_type, t)}
                    {candidate.suggested ? ` (${t("events.suggestedPackage")})` : ""}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <DetailRow label={t("events.location")}>
            {[event.city, event.country].filter(Boolean).join(", ") || "—"}
          </DetailRow>
          <DetailRow label={t("events.region")}>{event.region ?? "—"}</DetailRow>
          <DetailRow label={t("events.dates")}>
            {formatDateRangeFr(event.start_date, event.end_date)}
          </DetailRow>
          <DetailRow label={t("events.createdAt")}>
            {new Date(event.created_at).toLocaleString("fr-FR")}
          </DetailRow>
        </ComponentCard>

        <ComponentCard title={t("common.actions")} desc={t("events.actions")}>
          <div className="flex flex-col gap-3">
            <Link to={`/evenements/${event.id}/modifier`}>
              <Button size="sm" className="w-full">
                {t("events.edit")}
              </Button>
            </Link>
            {canDownloadValidatedPackage && approvedJob ? (
              <Button
                size="sm"
                className="w-full"
                onClick={() => void handleDownloadJob(approvedJob)}
              >
                {t("documents.downloadValidatedPackage")}
              </Button>
            ) : null}
            {!packageApproved && (
              <Link to={`/documents/generation?event=${event.id}`}>
                <Button size="sm" variant="outline" className="w-full">
                  {t("nav.generation")}
                </Button>
              </Link>
            )}
            <Link to={`/certificats?event=${event.id}`}>
              <Button size="sm" variant="outline" className="w-full">
                {t("participants.generateFromEvent")}
              </Button>
            </Link>
            {event.inferred_package && (
              <Link to={`/documents/templates?type=${event.inferred_package.package_type}`}>
                <Button size="sm" variant="outline" className="w-full">
                  {t("nav.templates")} ({event.inferred_package.package_label})
                </Button>
              </Link>
            )}
            {isEventOpen(event.project_status) && (
              <Button size="sm" variant="outline" className="w-full" onClick={() => void handleClose()}>
                {t("events.close")}
              </Button>
            )}
            {!isEventOpen(event.project_status) && isEventFinished(event.project_status) && (
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                {t("events.alreadyFinished")}
              </p>
            )}
            {isAdmin && (
              <Button size="sm" variant="outline" className="w-full" onClick={() => void handleDelete()}>
                {t("events.delete")}
              </Button>
            )}
            <Link
              to="/evenements"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              {t("events.backToList")}
            </Link>
          </div>
        </ComponentCard>
      </div>

      <ComponentCard
        className="mt-6"
        title={t("documents.history")}
        desc={t("documents.historyEventDesc")}
      >
        <GenerationHistoryPanel
          jobs={generationHistory}
          loading={historyLoading}
          eventId={event.id}
          onDownload={(job) => void handleDownloadJob(job)}
        />
      </ComponentCard>
    </>
  );
}
