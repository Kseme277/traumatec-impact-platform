import { useAuth } from "@clerk/clerk-react";
import { Bell, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import { fetchRecentGenerationJobs, type GenerationNotification } from "../api/docgen";
import { ApiError } from "../api/client";
import { useTranslation } from "../i18n/useTranslation";

const POLL_MS = 15_000;

function statusBadge(status: string, t: (key: string) => string) {
  switch (status) {
    case "completed":
      return <Badge color="success">{t("notifications.statusCompleted")}</Badge>;
    case "failed":
      return <Badge color="error">{t("notifications.statusFailed")}</Badge>;
    case "running":
      return <Badge color="warning">{t("notifications.statusRunning")}</Badge>;
    default:
      return <Badge color="light">{t("notifications.statusQueued")}</Badge>;
  }
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="size-5 text-success-500" />;
  if (status === "failed") return <XCircle className="size-5 text-error-500" />;
  return <Loader2 className="size-5 animate-spin text-brand-500" />;
}

export default function NotificationsPage() {
  const { getToken } = useAuth();
  const { t, localeTag } = useTranslation();
  const [items, setItems] = useState<GenerationNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await fetchRecentGenerationJobs(token);
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("notifications.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [getToken, t]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(localeTag, { dateStyle: "short", timeStyle: "short" });

  return (
    <>
      <PageMeta title={t("notifications.metaTitle")} description={t("notifications.metaDesc")} />
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
          <Bell className="size-7 text-brand-500" />
          {t("notifications.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("notifications.subtitle")}</p>
      </div>

      {isLoading && items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          {t("common.loading")}
        </div>
      ) : null}

      {error && <p className="mb-4 text-sm text-error-600">{error}</p>}

      {items.length === 0 && !isLoading ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("notifications.empty")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <StatusIcon status={item.status} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800 dark:text-white/90">
                  {item.event_title ?? t("notifications.unknownEvent")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(item.completed_at ?? item.created_at)}
                  {item.zip_filename ? ` · ${item.zip_filename}` : ""}
                </p>
                {item.error_message && (
                  <p className="mt-1 text-xs text-error-600 dark:text-error-400">{item.error_message}</p>
                )}
              </div>
              {statusBadge(item.status, t)}
              <Link
                to={`/evenements/${item.event_id}`}
                className="text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
              >
                {t("notifications.viewEvent")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
