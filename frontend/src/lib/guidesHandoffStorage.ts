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
