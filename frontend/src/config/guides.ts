/** URL du module Guides procédures (Next.js, autre dépôt). */
export const GUIDES_URL = import.meta.env.VITE_GUIDES_URL ?? "";

export function isGuidesConfigured(): boolean {
  return GUIDES_URL.length > 0;
}

export function openGuides(): void {
  if (!GUIDES_URL) {
    console.warn("VITE_GUIDES_URL non configuré");
    return;
  }
  window.open(GUIDES_URL, "_blank", "noopener,noreferrer");
}
