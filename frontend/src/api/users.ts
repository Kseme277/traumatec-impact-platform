import { apiFetch } from "./client";
import type {
  ToggleStatusResponse,
  Utilisateur,
  UtilisateurCreatePayload,
} from "../features/auth/types";

export function fetchMe(token: string | null) {
  return apiFetch<Utilisateur>("/users/me", token);
}

export function fetchAllUsers(token: string | null) {
  return apiFetch<Utilisateur[]>("/admin/users", token);
}

export function createUser(token: string | null, payload: UtilisateurCreatePayload) {
  return apiFetch<Utilisateur>("/admin/users/create", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function toggleUserStatus(token: string | null, userId: number) {
  return apiFetch<ToggleStatusResponse>(`/admin/users/${userId}/toggle-status`, token, {
    method: "PATCH",
  });
}

export function resendInvitation(token: string | null, userId: number) {
  return apiFetch<ToggleStatusResponse>(`/admin/users/${userId}/resend-invitation`, token, {
    method: "POST",
  });
}
