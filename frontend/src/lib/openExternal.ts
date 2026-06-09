export class PopupBlockedError extends Error {
  constructor() {
    super("popup_blocked");
    this.name = "PopupBlockedError";
  }
}

/** Ouvre une URL dans un nouvel onglet sans modifier la page courante. */
export function openExternalTab(url: string): void {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    throw new PopupBlockedError();
  }
}

/**
 * Ouvre un onglet vide immédiatement (geste utilisateur), puis y charge l'URL
 * une fois prête — indispensable après un appel API asynchrone.
 */
export function openExternalTabPending(): Window {
  const opened = window.open("about:blank", "_blank", "noopener,noreferrer");
  if (!opened) {
    throw new PopupBlockedError();
  }
  return opened;
}

export function navigatePendingTab(tab: Window, url: string): void {
  tab.location.href = url;
}

export function closePendingTab(tab: Window): void {
  try {
    tab.close();
  } catch {
    // ignore
  }
}
