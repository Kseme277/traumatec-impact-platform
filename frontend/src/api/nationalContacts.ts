import { apiFetch } from "./client";

export interface NationalContact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
}

export interface NationalContactListResponse {
  items: NationalContact[];
  total: number;
}

export function fetchNationalContacts(
  token: string | null,
  options?: { q?: string; activeOnly?: boolean },
) {
  const params = new URLSearchParams({ active_only: String(options?.activeOnly ?? true) });
  if (options?.q) params.set("q", options.q);
  return apiFetch<NationalContactListResponse>(`/v1/national-contacts/?${params}`, token);
}

export interface NationalContactPayload {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  is_active?: boolean;
}

export function createNationalContact(token: string | null, payload: NationalContactPayload) {
  return apiFetch<NationalContact>("/v1/national-contacts/", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateNationalContact(
  token: string | null,
  id: string,
  payload: Partial<NationalContactPayload>,
) {
  return apiFetch<NationalContact>(`/v1/national-contacts/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function nationalContactLabel(contact: NationalContact): string {
  const parts = [contact.full_name];
  
  return parts.join(" — ");
}
