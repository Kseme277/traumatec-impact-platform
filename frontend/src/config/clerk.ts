/**
 * Clerk proxy URL (same-origin → Clerk Frontend API via nginx or Vite proxy).
 *
 * On http://*:5173 (Vite dev, no TLS) we omit the proxy: Clerk upgrades proxy
 * URLs to HTTPS, so https://<host>:5173/__clerk/... fails. Clerk JS loads from
 * the Frontend API domain instead (add the origin in Clerk Dashboard).
 *
 * On http://*:8080 (nginx gateway), use /__clerk via window.origin.
 */
export function isViteDevWithoutTls(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return false;
  }
  const { port, protocol } = window.location;
  return port === "5173" && protocol === "http:";
}

export function resolveClerkProxyUrl(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  if (isViteDevWithoutTls()) {
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
