import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { fetchNotifications, fetchUnreadCount, markNotificationRead } from "../../api/notifications";
import { getApiToken } from "../../lib/clerkToken";

export default function NotificationDropdown() {
  const { getToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchNotifications>>>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const token = await getApiToken(getToken);
      const [list, count] = await Promise.all([
        fetchNotifications(token, false, 8),
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

  async function handleOpen() {
    setIsOpen((v) => !v);
    if (!isOpen) await load();
  }

  async function handleRead(id: string, link: string | null) {
    try {
      const token = await getApiToken(getToken);
      await markNotificationRead(token, id);
      setUnread((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
    setIsOpen(false);
    if (link) {
      window.location.href = link;
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={() => void handleOpen()}
      >
        {unread > 0 ? (
          <span className="absolute right-0 top-0.5 z-10 flex h-2 w-2 rounded-full bg-orange-400">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping" />
          </span>
        ) : null}
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
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
        onClose={() => setIsOpen(false)}
        className="absolute -right-[240px] mt-[17px] flex max-h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Notifications</h5>
        </div>
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {items.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">Aucune notification</li>
          ) : (
            items.map((item) => (
              <li key={item.id}>
                <DropdownItem
                  onItemClick={() => void handleRead(item.id, item.link)}
                  className="flex flex-col gap-1 rounded-lg border-b border-gray-100 p-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
                >
                  <span className="font-medium text-sm text-gray-800 dark:text-white/90">{item.title}</span>
                  <span className="text-theme-sm text-gray-500 dark:text-gray-400 line-clamp-2">{item.body}</span>
                  <span className="text-theme-xs text-gray-400">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </DropdownItem>
              </li>
            ))
          )}
        </ul>
        <Link
          to="/notifications"
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          onClick={() => setIsOpen(false)}
        >
          Voir toutes les notifications
        </Link>
      </Dropdown>
    </div>
  );
}
