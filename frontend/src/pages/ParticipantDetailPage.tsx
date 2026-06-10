import { useAuth } from "@clerk/clerk-react";
import { ArrowLeft, Calendar, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import {
  type ParticipantDetail,
  fetchParticipantDetail,
} from "../api/participants";
import { formatEventDateRange } from "../features/events/eventDates";
import { ApiError } from "../api/client";
import { getApiToken } from "../lib/clerkToken";
import { useTranslation } from "../i18n/useTranslation";
import { showError } from "../lib/swal";

export default function ParticipantDetailPage() {
  const { participantId } = useParams();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("event") ?? "";
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { t } = useTranslation();

  const [detail, setDetail] = useState<ParticipantDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!participantId || !isLoaded || !isSignedIn) {
      setDetail(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      try {
        const token = await getApiToken(getToken);
        if (!token) {
          throw new ApiError(t("documents.sessionExpired"), 401);
        }
        const data = await fetchParticipantDetail(token, participantId);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) setDetail(null);
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : t("participants.detailLoadError");
        await showError(t("participants.detailLoadError"), message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, participantId, t]);

  const participant = detail?.participant;
  const backHref = eventId ? `/certificats?event=${eventId}` : "/certificats";

  return (
    <>
      <PageMeta
        title={participant?.full_name ?? t("participants.detailTitle")}
        description={t("participants.detailDesc")}
      />
      <AdminBreadcrumb
        pageTitle={participant?.full_name ?? t("participants.detailTitle")}
        crumbs={[{ label: t("nav.certificates"), to: "/certificats" }]}
      />

      <div className="mb-6">
        <Link
          to={backHref}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-4 py-3 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
        >
          <ArrowLeft className="size-4" />
          {t("participants.backToList")}
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          {t("common.loading")}
        </div>
      ) : !participant ? (
        <ComponentCard title={t("participants.detailTitle")}>
          <p className="py-8 text-sm text-gray-500">{t("participants.detailNotFound")}</p>
        </ComponentCard>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<Users className="size-5 opacity-60" />}
              label={t("participants.detailEventsCount")}
              value={detail?.events_participated_count ?? 0}
            />
            <MetricCard
              label={t("participants.colRole")}
              value={
                participant.certificate_role === "enseignant"
                  ? t("participants.roleEnseignant")
                  : t("participants.roleParticipant")
              }
              text
            />
            <MetricCard label={t("participants.colEmail")} value={participant.email ?? "—"} text />
            <MetricCard label={t("participants.colHospital")} value={participant.hospital ?? "—"} text />
          </div>

          <ComponentCard title={t("participants.detailProfile")} desc={t("participants.detailProfileDesc")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailField label={t("participants.colName")} value={participant.full_name} />
              <DetailField label={t("participants.colStatut")} value={participant.statut ?? "—"} />
              <DetailField
                label={t("participants.lastImport")}
                value={new Date(participant.imported_at).toLocaleString()}
              />
            </div>
          </ComponentCard>

          <ComponentCard
            className="mt-6"
            title={t("participants.detailEventsTitle")}
            desc={t("participants.detailEventsDesc")}
          >
            {(detail?.events.length ?? 0) === 0 ? (
              <p className="py-8 text-sm text-gray-500">{t("participants.detailEventsEmpty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 dark:border-gray-800">
                      <th className="px-3 py-2">{t("events.project")}</th>
                      <th className="px-3 py-2">{t("events.eventTitle")}</th>
                      <th className="px-3 py-2">{t("events.dates")}</th>
                      <th className="px-3 py-2">{t("events.location")}</th>
                      <th className="px-3 py-2">{t("participants.colRole")}</th>
                      <th className="px-3 py-2">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail?.events.map((event) => (
                      <tr key={`${event.event_id}-${event.participant_id}`} className="border-b border-gray-50 dark:border-gray-800/80">
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-white/90">
                          {event.project_number ?? "—"}
                        </td>
                        <td className="max-w-xs px-3 py-2 text-gray-600 dark:text-gray-400">
                          {event.title ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="size-3.5 opacity-50" />
                            {formatEventDateRange({
                              start_date: event.start_date,
                              end_date: event.end_date,
                            } as { start_date?: string | null; end_date?: string | null })}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                          {[event.city, event.country].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge size="sm" color={event.certificate_role === "enseignant" ? "warning" : "primary"}>
                            {event.certificate_role === "enseignant"
                              ? t("participants.roleEnseignant")
                              : t("participants.roleParticipant")}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            to={`/evenements/${event.event_id}`}
                            className="text-xs text-brand-500 hover:underline"
                          >
                            {t("participants.backToEvent")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ComponentCard>
        </>
      )}
    </>
  );
}

function MetricCard({
  label,
  value,
  text = false,
  icon,
}: {
  label: string;
  value: number | string;
  text?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <p
        className={`mt-2 ${text ? "text-base" : "text-2xl font-semibold"} text-gray-800 dark:text-white/90`}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-sm text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}
