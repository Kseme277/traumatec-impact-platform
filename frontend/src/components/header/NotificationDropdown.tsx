import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Dropdown } from "../ui/dropdown/Dropdown";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  type TipNotification,
} from "../../api/notifications";
import { getApiToken } from "../../lib/clerkToken";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import { notificationVisual } from "../../features/notifications/notificationVisual";
import { useTranslation } from "../../i18n/useTranslation";

export default function NotificationDropdown() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { t, localeTag } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<TipNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const token = await getApiToken(getToken);
      const [list, count] = await Promise.all([
        fetchNotifications(token, true, 6),
        fetchUnreadCount(token),
      ]);
      setItems(list);
      setUnread(count.count);
    } catch {
      /* silencieux dans le header */
    }
  }, [getToken]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const clearUnread = useCallback(async () => {
    try {
      const token = await getApiToken(getToken);
      await markAllNotificationsRead(token);
    } catch {
      /* ignore */
    } finally {
      setItems([]);
      setUnread(0);
    }
  }, [getToken]);

  async function handleToggle() {
    const next = !isOpen;
    if (next) {
      setIsOpen(true);
      await load();
      return;
    }
    setIsOpen(false);
    await clearUnread();
  }

  async function handleClose() {
    setIsOpen(false);
    await clearUnread();
  }

  async function handleItemClick(item: TipNotification) {
    const link = item.link;
    setIsOpen(false);
    await clearUnread();
    if (link) {
      navigate(link);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t("notifications.title")}
        aria-expanded={isOpen}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={() => void handleToggle()}
      >
        {unread > 0 ? (
          <span className="absolute right-0 top-0.5 z-10 flex h-2 w-2 rounded-full bg-orange-400">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
          </span>
        ) : null}
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => void handleClose()}
        className="absolute right-0 mt-3 flex w-[min(100vw-2rem,380px)] flex-col rounded-2xl border border-gray-200 bg-white p-0 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h5 className="text-base font-semibold text-gray-800 dark:text-white/90">
            {t("notifications.dropdownTitle")}
          </h5>
          <button
            type="button"
            aria-label={t("common.close")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200"
            onClick={() => void handleClose()}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <ul className="custom-scrollbar max-h-[360px] overflow-y-auto">
          {items.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              {t("notifications.emptyDropdown")}
            </li>
          ) : (
            items.map((item) => {
              const visual = notificationVisual(item.type);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full gap-3 border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03] bg-brand-50/30 dark:bg-brand-500/5"
                    onClick={() => void handleItemClick(item)}
                  >
                    <span
                      className={`relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${visual.bgClass}`}
                    >
                      <span
                        className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900 ${visual.dotClass}`}
                      />
                      <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d={visual.iconPath} />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                        {item.title}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                        {item.body}
                      </span>
                      <span className="mt-1 block text-xs text-gray-400 dark:text-gray-500">
                        {formatRelativeTime(item.created_at, localeTag)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="border-t border-gray-100 p-3 dark:border-gray-800">
          <Link
            to="/notifications"
            className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={() => void handleClose()}
          >
            {t("notifications.viewMore")}
          </Link>
        </div>
      </Dropdown>
    </div>
  );
}
