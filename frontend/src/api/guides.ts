import { apiFetch } from "./client";

export interface GuidesSession {
  access_token: string;
  expires_in: string;
  email: string;
  role: string;
  company_id: string | null;
  company_slug: string;
  web_url: string;
  proxy_web_url: string;
  handoff_url: string;
  public_url: string;
  admin_url: string;
}

export async function fetchGuidesSession(token: string): Promise<GuidesSession> {
  return apiFetch<GuidesSession>("/v1/guides/session", token);
}
