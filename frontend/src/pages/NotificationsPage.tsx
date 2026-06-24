import { useAuth } from "@clerk/clerk-react";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import SpinnerLoader from "../components/common/SpinnerLoader";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type TipNotification,
} from "../api/notifications";
import { ApiError } from "../api/client";
import { getApiToken } from "../lib/clerkToken";
import { formatRelativeTime } from "../lib/formatRelativeTime";
import { notificationVisual } from "../features/notifications/notificationVisual";
import { useTranslation } from "../i18n/useTranslation";
import { confirmAction, showError } from "../lib/swal";

const POLL_MS = 30_000;

export default function NotificationsPage() {
  const { getToken } = useAuth();
  const { t, localeTag } = useTranslation();
  const [items, setItems] = useState<TipNotification[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getApiToken(getToken);
      const [data, countRes] = await Promise.all([
        fetchNotifications(token, filter === "unread", 100),
        fetchUnreadCount(token),
      ]);
      setItems(data);
      setUnreadTotal(countRes.count);
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

  const unreadCount = unreadTotal;

  async function handleRead(id: string) {
    const token = await getApiToken(getToken);
    await markNotificationRead(token, id);
    await load();
  }

  async function handleReadAll() {
    const confirmed = await confirmAction({
      title: t("notifications.markAllRead"),
      text: t("notifications.markAllReadConfirm"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;
    try {
      const token = await getApiToken(getToken);
      await markAllNotificationsRead(token);
      await load();
    } catch (err: unknown) {
      await showError(t("common.error"), err instanceof ApiError ? err.message : t("notifications.loadError"));
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(localeTag, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <PageMeta title={t("notifications.metaTitle")} description={t("notifications.metaDesc")} />
      <AdminBreadcrumb pageTitle={t("notifications.title")} />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">{t("notifications.title")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("notifications.subtitle")}</p>
        </div>
        {unreadCount > 0 ? (
          <Badge color="warning" size="sm">
            {unreadCount} {t("notifications.unreadCount")}
          </Badge>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-gray-200 p-1 dark:border-gray-700">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === "all"
                ? "bg-brand-500 text-white shadow-theme-xs"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => setFilter("all")}
          >
            {t("notifications.all")}
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === "unread"
                ? "bg-brand-500 text-white shadow-theme-xs"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => setFilter("unread")}
          >
            {t("notifications.unread")}
          </button>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={unreadCount === 0}
          onClick={() => void handleReadAll()}
        >
          {t("notifications.markAllRead")}
        </Button>
      </div>

      <ComponentCard>
        {isLoading && items.length === 0 ? (
          <SpinnerLoader message={t("common.loading")} />
        ) : null}
        {error ? <p className="mb-4 text-sm text-error-600 dark:text-error-400">{error}</p> : null}

        {items.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center dark:border-gray-700">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
              <Bell className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("notifications.empty")}</p>
            <p className="mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">{t("notifications.metaDesc")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((item) => {
              const visual = notificationVisual(item.type);
              return (
                <li
                  key={item.id}
                  className={`flex flex-wrap items-start gap-4 py-4 first:pt-0 last:pb-0 sm:flex-nowrap ${
                    item.read_at ? "" : "relative before:absolute before:left-0 before:top-4 before:h-[calc(100%-1rem)] before:w-1 before:rounded-full before:bg-brand-500"
                  }`}
                >
                  <span
                    className={`relative ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:ml-4 ${visual.bgClass}`}
                  >
                    {!item.read_at ? (
                      <span
                        className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900 ${visual.dotClass}`}
                      />
                    ) : null}
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" clipRule="evenodd" d={visual.iconPath} />
                    </svg>
                  </span>

                  <div className="min-w-0 flex-1 pl-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 dark:text-white/90">{item.title}</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.body}</p>
                      </div>
                      {!item.read_at ? (
                        <Badge color="warning" size="sm">
                          {t("notifications.unreadBadge")}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <span title={formatDate(item.created_at)}>
                        {formatRelativeTime(item.created_at, localeTag)}
                      </span>
                      <span className="mx-2">·</span>
                      <span>{formatDate(item.created_at)}</span>
                    </p>
                  </div>

                  <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto sm:justify-end">
                    {item.link ? (
                      <Link
                        to={item.link}
                        className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                        onClick={() => void handleRead(item.id)}
                      >
                        {t("notifications.open")}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                        onClick={() => void handleRead(item.id)}
                      >
                        {t("notifications.markRead")}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ComponentCard>
    </>
  );
}
