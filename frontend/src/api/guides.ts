import { apiFetch } from "./client";

export interface GuidesHandoffPrepare {
  handoff_ticket: string;
  expires_in: number;
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

export interface GuidesHandoffSession {
  access_token: string;
  email: string;
  role: string;
  redirect: string;
  company_slug: string;
}

/** Prépare un handoff sécurisé — le JWT GuideHub reste côté serveur jusqu'à consommation. */
export async function prepareGuidesHandoff(token: string): Promise<GuidesHandoffPrepare> {
  return apiFetch<GuidesHandoffPrepare>("/v1/guides/handoff", token, { method: "POST" });
}

/** @deprecated Utiliser prepareGuidesHandoff */
export async function fetchGuidesSession(token: string): Promise<GuidesHandoffPrepare> {
  return apiFetch<GuidesHandoffPrepare>("/v1/guides/session", token);
}

export function buildGuidesHandoffPageUrl(
  proxyWebUrl: string,
  ticket: string,
  companySlug: string,
): string {
  const base = proxyWebUrl.replace(/\/$/, "");
  const url = new URL(`${base}/guidehub-handoff.html`);
  url.searchParams.set("ticket", ticket);
  url.searchParams.set("company_slug", companySlug);
  return url.toString();
}
