/**
 * Clerk proxy URL (same-origin → Clerk Frontend API via nginx or Vite proxy).
 *
 * Clerk force HTTPS sur proxyUrl. Sans certificat TLS (http://IP ou :5173 en dev),
 * le chargement de clerk.browser.js échoue. On charge alors depuis le domaine
 * Clerk Frontend API (ajouter l'origine http dans le Dashboard Clerk).
 *
 * Avec TLS (https://), le proxy /__clerk via nginx fonctionne.
 */
export function shouldSkipClerkProxy(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.location.protocol === "http:";
}

/** @deprecated use shouldSkipClerkProxy */
export function isViteDevWithoutTls(): boolean {
  return import.meta.env.DEV && shouldSkipClerkProxy() && window.location.port === "5173";
}

export function resolveClerkProxyUrl(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  if (shouldSkipClerkProxy()) {
    return undefined;
  }

  const { origin } = window.location;

  const configured = import.meta.env.VITE_CLERK_PROXY_URL?.trim();
  if (!configured) {
    return undefined;
  }

  if (/^https?:\/\//i.test(configured)) {
    if (import.meta.env.DEV && configured.includes(":5173")) {
      return undefined;
    }
    return configured;
  }

  const path = configured.startsWith("/") ? configured : `/${configured}`;
  return `${origin.replace(/\/$/, "")}${path}`;
}

/**
 * Warn when the browser uses HTTPS on Vite's port without TLS.
 */
export function warnIfInsecureViteHttps(): void {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return;
  }
  const { protocol, port } = window.location;
  if (protocol === "https:" && port === "5173") {
    console.warn(
      "[TIP] Ouvrez http://<hôte>:5173 ou http://<hôte>:8080 — le port 5173 en HTTPS sans certificat bloque le chargement des scripts.",
    );
  }
}
