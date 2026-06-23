import { apiFetch } from "./client";
import type {
  InvitationActionResponse,
  RoleUtilisateur,
  ToggleStatusResponse,
  Utilisateur,
  UtilisateurCreatePayload,
  UtilisateurCreateResult,
  UtilisateurUpdatePayload,
} from "../features/auth/types";

export function fetchMe(token: string | null, options: RequestInit = {}) {
  return apiFetch<Utilisateur>("/users/me", token, options);
}

export function updateMe(token: string | null, payload: UtilisateurUpdatePayload) {
  return apiFetch<Utilisateur>("/users/me", token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function fetchAllUsers(token: string | null) {
  return apiFetch<Utilisateur[]>("/admin/users", token);
}

export interface EmailCheckResult {
  normalized_email: string;
  tip_exists: boolean;
  clerk_exists: boolean;
  conflicting_clerk_emails: string[];
  suggested_email: string | null;
  can_create: boolean;
  message: string | null;
}

export function checkInvitationEmail(token: string | null, email: string) {
  const params = new URLSearchParams({ email: email.trim() });
  return apiFetch<EmailCheckResult>(`/admin/users/check-email?${params}`, token);
}

export function createUser(token: string | null, payload: UtilisateurCreatePayload) {
  return apiFetch<UtilisateurCreateResult>("/admin/users/create", token, {
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
  return apiFetch<InvitationActionResponse>(`/admin/users/${userId}/resend-invitation`, token, {
    method: "POST",
  });
}

export function updateUserRoles(token: string | null, userId: number, roles: RoleUtilisateur[]) {
  return apiFetch<Utilisateur>(`/admin/users/${userId}/roles`, token, {
    method: "PATCH",
    body: JSON.stringify({ roles }),
  });
}

export function deleteUser(token: string | null, userId: number) {
  return apiFetch<ToggleStatusResponse>(`/admin/users/${userId}`, token, {
    method: "DELETE",
  });
}
