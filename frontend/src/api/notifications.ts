import { apiFetch, ApiError } from "./client";

export interface TipNotification {
  id: string;
  user_id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  payload_json: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export function fetchNotifications(token: string | null, unreadOnly = false, limit = 30) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (unreadOnly) params.set("unread_only", "true");
  return apiFetch<TipNotification[]>(`/v1/notifications?${params}`, token);
}

export function fetchUnreadCount(token: string | null) {
  return apiFetch<{ count: number }>("/v1/notifications/unread-count", token);
}

export function markNotificationRead(token: string | null, id: string) {
  return apiFetch<TipNotification>(`/v1/notifications/${id}/read`, token, { method: "PATCH" });
}

export function markAllNotificationsRead(token: string | null) {
  return apiFetch<{ updated: number }>("/v1/notifications/read-all", token, { method: "POST" }).catch(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 404) {
        return apiFetch<{ updated: number }>("/v1/notifications/read-all", token, { method: "PATCH" });
      }
      throw err;
    },
  );
}
