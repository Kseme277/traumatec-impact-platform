/** Clés legacy où des jetons ne doivent jamais persister. */
const LEGACY_AUTH_KEYS = [
  "traumatec_access_token",
  "access_token",
  "auth_token",
  "token",
  "jwt",
  "id_token",
  "refresh_token",
] as const;

const SESSION_AUTH_KEYS = ["traumatec_access_token", "traumatec_auth_verified"] as const;

/** Supprime d'éventuels jetons laissés par d'anciennes versions (XSS / persistance). */
export function purgeLegacyAuthTokens(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of LEGACY_AUTH_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    /* quota / mode privé */
  }
}

/** Stocke le jeton GuideHub uniquement pour la durée de l'onglet (pas localStorage). */
export function storeGuideHubSession(accessToken: string, meta: { role: string; email: string }): void {
  sessionStorage.setItem("traumatec_access_token", accessToken);
  sessionStorage.setItem(
    "traumatec_auth_verified",
    JSON.stringify({ role: meta.role, email: meta.email, at: Date.now() }),
  );
}

export function clearGuideHubSession(): void {
  for (const key of SESSION_AUTH_KEYS) {
    sessionStorage.removeItem(key);
  }
}
