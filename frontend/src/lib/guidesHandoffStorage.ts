const TICKET_KEY = "tip:guides:handoff:ticket";
const SLUG_KEY = "tip:guides:handoff:company_slug";

export function storeGuidesHandoffTicket(ticket: string, companySlug: string): void {
  sessionStorage.setItem(TICKET_KEY, ticket);
  sessionStorage.setItem(SLUG_KEY, companySlug);
}

export function readGuidesHandoffTicket(): { ticket: string; companySlug: string } | null {
  const ticket = sessionStorage.getItem(TICKET_KEY)?.trim();
  if (!ticket) return null;
  return {
    ticket,
    companySlug: sessionStorage.getItem(SLUG_KEY)?.trim() || "traumatec-cm",
  };
}

export function clearGuidesHandoffTicket(): void {
  sessionStorage.removeItem(TICKET_KEY);
  sessionStorage.removeItem(SLUG_KEY);
}

/** Stocke la session GuideHub pour le proxy /gh (même origine TIP). */
export function persistGuideHubSession(
  accessToken: string,
  email: string,
  role: string,
  memberRole?: string,
): void {
  localStorage.setItem("traumatec_access_token", accessToken);
  sessionStorage.setItem(
    "traumatec_auth_verified",
    JSON.stringify({
      role,
      email: email || "sso@tip",
      memberRole: memberRole || "Administrateur",
      at: Date.now(),
    }),
  );
}

export function resolveGuideHubAdminUrl(redirect?: string): string {
  const origin = window.location.origin.replace(/\/$/, "");
  let path = redirect?.trim() || "/gh/admin";
  // Anciens tickets ou réponses API : /admin → proxy TIP /gh/admin
  if (path === "/admin" || (path.endsWith("/admin") && !path.includes("/gh/"))) {
    path = "/gh/admin";
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
