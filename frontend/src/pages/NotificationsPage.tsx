import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import TipSplashLoader from "../components/brand/TipSplashLoader";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type TipNotification,
} from "../api/notifications";
import { ApiError } from "../api/client";
import { getApiToken } from "../lib/clerkToken";
import { useTranslation } from "../i18n/useTranslation";

const POLL_MS = 30_000;

export default function NotificationsPage() {
  const { getToken } = useAuth();
  const { t, localeTag } = useTranslation();
  const [items, setItems] = useState<TipNotification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getApiToken(getToken);
      const data = await fetchNotifications(token, filter === "unread", 100);
      setItems(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : t("notifications.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [filter, getToken, t]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  async function handleRead(id: string) {
    const token = await getApiToken(getToken);
    await markNotificationRead(token, id);
    await load();
  }

  async function handleReadAll() {
    try {
      const token = await getApiToken(getToken);
      await markAllNotificationsRead(token);
      await load();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : t("notifications.loadError"));
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(localeTag, { dateStyle: "short", timeStyle: "short" });

  return (
    <>
      <PageMeta title={t("notifications.metaTitle")} description={t("notifications.metaDesc")} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">{t("notifications.title")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("notifications.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm ${filter === "all" ? "bg-brand-500 text-white" : "border border-gray-200 dark:border-gray-700"}`}
            onClick={() => setFilter("all")}
          >
            Toutes
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm ${filter === "unread" ? "bg-brand-500 text-white" : "border border-gray-200 dark:border-gray-700"}`}
            onClick={() => setFilter("unread")}
          >
            Non lues
          </button>
          <button type="button" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-700" onClick={() => void handleReadAll()}>
            Tout marquer lu
          </button>
        </div>
      </div>

      {isLoading && items.length === 0 ? <TipSplashLoader message={t("common.loading")} variant="inline" /> : null}
      {error ? <p className="mb-4 text-sm text-error-600">{error}</p> : null}

      {items.length === 0 && !isLoading ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">{t("notifications.empty")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={`rounded-2xl border p-4 dark:border-gray-800 ${item.read_at ? "bg-white dark:bg-gray-900" : "border-brand-200 bg-brand-50/40 dark:border-brand-800 dark:bg-brand-950/20"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white/90">{item.title}</p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.body}</p>
                  <p className="mt-2 text-xs text-gray-400">{formatDate(item.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!item.read_at ? <Badge color="warning">Non lue</Badge> : null}
                  {item.link ? (
                    <Link to={item.link} className="text-sm text-brand-600 hover:underline" onClick={() => void handleRead(item.id)}>
                      Ouvrir
                    </Link>
                  ) : (
                    <button type="button" className="text-sm text-brand-600" onClick={() => void handleRead(item.id)}>
                      Marquer lu
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
