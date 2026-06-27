import {
  closePendingTab,
  navigatePendingTab,
  openExternalTab,
  openExternalTabPending,
  PopupBlockedError,
} from "../lib/openExternal";
import { buildGuidesHandoffPageUrl } from "../api/guides";

export { PopupBlockedError };

/**
 * GuideHub / traumatec-guide-evens
 *
 * URLs relevées dans evens :
 * - Web (guides public) : web_app_url → :3100 /{companySlug}
 * - API gateway       : api_gateway_url → :3080
 * - Swagger           : {api_gateway_url}/api/docs
 * - Admin entreprise  : {web_app_url}/admin
 *
 * Handoff SSO (même origine que l'admin) : proxy TIP nginx :3101
 */
const DEFAULT_GUIDES_WEB = "http://192.168.1.45:3100";
const DEFAULT_GUIDES_API = "http://192.168.1.45:3080";
const GUIDES_HANDOFF_PORT = 3101;
const DEFAULT_COMPANY_SLUG = "traumatec-cm";

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed).toString().replace(/\/$/, "");
  } catch {
    console.warn("URL Guides invalide:", raw);
    return "";
  }
}

const configuredWeb = normalizeUrl(
  import.meta.env.VITE_GUIDES_URL ?? import.meta.env.VITE_TRAUMATEC_CM_URL ?? "",
);

const configuredApi = normalizeUrl(import.meta.env.VITE_GUIDES_API_URL ?? "");

const configuredHandoff = normalizeUrl(import.meta.env.VITE_GUIDES_HANDOFF_URL ?? "");

export const GUIDES_WEB_URL = configuredWeb || DEFAULT_GUIDES_WEB;

export const GUIDES_API_URL = configuredApi || DEFAULT_GUIDES_API;

/**
 * Proxy handoff nginx TIP (:3101) — tourne sur la machine TIP, pas sur le serveur GuideHub.
 * En navigateur : même hostname que TIP (localhost ou IP du PC) + port 3101.
 */
/** Hostname du poste TIP (localhost ou IP LAN) — pour le proxy nginx :3101. */
function resolveGuidesHandoffHost(): string {
  if (typeof window !== "undefined" && window.location.hostname) {
    return window.location.hostname;
  }
  return "localhost";
}

/**
 * Origine du proxy GuideHub (nginx :3101) — handoff + admin sur la même origine.
 */
export function resolveGuidesProxyWebUrl(): string {
  if (configuredHandoff) return configuredHandoff;
  return `http://${resolveGuidesHandoffHost()}:${GUIDES_HANDOFF_PORT}`;
}

export function resolveGuidesHandoffUrl(): string {
  return resolveGuidesProxyWebUrl();
}

/** Proxy web pour le navigateur — remplace localhost par l'IP/hostname actuel. */
export function resolveGuidesProxyWebForSession(session?: { proxy_web_url?: string }): string {
  const dynamic = resolveGuidesProxyWebUrl();
  const fromApi = session?.proxy_web_url?.replace(/\/$/, "");
  if (!fromApi) return dynamic;
  try {
    const apiHost = new URL(fromApi).hostname;
    if (apiHost === "localhost" || apiHost === "127.0.0.1") {
      return dynamic;
    }
    return fromApi;
  } catch {
    return dynamic;
  }
}

/** @deprecated préférer resolveGuidesHandoffUrl() */
export const GUIDES_HANDOFF_URL = configuredHandoff || `http://localhost:${GUIDES_HANDOFF_PORT}`;

/** @deprecated alias */
export const GUIDES_URL = GUIDES_WEB_URL;

export const GUIDES_API_DOCS_URL = `${GUIDES_API_URL}/api/docs`;

export const GUIDES_COMPANY_SLUG =
  import.meta.env.VITE_GUIDES_COMPANY_SLUG?.trim() || DEFAULT_COMPANY_SLUG;

export const GUIDES_HANDOFF_PATH = "/guidehub-handoff.html";

/** Route TIP ouverte via <a target="_blank"> — évite le blocage des pop-ups. */
export const GUIDES_ADMIN_HANDOFF_ROUTE = "/guides/admin-handoff";

/** Catalogue public traumatec-cm (sans ?lang=). */
export function getGuidesEntryUrl(): string {
  return `${GUIDES_WEB_URL}/${GUIDES_COMPANY_SLUG}`;
}

export function getGuidesAdminUrl(): string {
  return `${GUIDES_WEB_URL}/admin`;
}

export function isGuidesConfigured(): boolean {
  return GUIDES_WEB_URL.length > 0;
}

export function openGuides(target: "_blank" | "_self" = "_blank"): void {
  if (!GUIDES_WEB_URL) {
    console.warn("VITE_GUIDES_URL non configuré");
    return;
  }
  navigateExternal(getGuidesEntryUrl(), target);
}

function navigateExternal(url: string, target: "_blank" | "_self"): void {
  if (target === "_self") {
    window.location.assign(url);
    return;
  }
  openExternalTab(url);
}

export function buildGuidesHandoffUrl(session: {
  handoff_ticket: string;
  email: string;
  role: string;
  web_url?: string;
  proxy_web_url?: string;
  company_slug?: string;
}): string {
  const proxyWeb = resolveGuidesProxyWebForSession(session);
  return buildGuidesHandoffPageUrl(
    proxyWeb,
    session.handoff_ticket,
    session.company_slug || GUIDES_COMPANY_SLUG,
  );
}

/** @deprecated Ne pas transmettre de JWT dans l'URL — utiliser buildGuidesHandoffUrl */
export function buildGuidesAdminSsoUrl(session: {
  handoff_ticket: string;
  email: string;
  role: string;
  proxy_web_url?: string;
  company_slug?: string;
}): string {
  return buildGuidesHandoffUrl(session);
}

/** @deprecated Préférer un lien <a href={GUIDES_ADMIN_HANDOFF_ROUTE} target="_blank"> */
export async function openGuidesAdmin(
  getApiToken: () => Promise<string | null>,
): Promise<void> {
  const tab = openExternalTabPending();
  try {
    const { prepareGuidesHandoff } = await import("../api/guides");
    const token = await getApiToken();
    if (!token) {
      throw new Error("Session TIP expirée");
    }

    const session = await prepareGuidesHandoff(token);
    navigatePendingTab(tab, buildGuidesHandoffUrl(session));
  } catch (err) {
    closePendingTab(tab);
    throw err;
  }
}
