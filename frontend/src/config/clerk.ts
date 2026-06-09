/**
 * Clerk proxy URL (same-origin → Clerk Frontend API via nginx or Vite proxy).
 *
 * On http(s)://localhost:5173 we omit the proxy: Vite has no TLS, so
 * https://localhost:5173/__clerk/... fails. Clerk JS loads from the
 * Frontend API domain instead (allowed origins in Clerk Dashboard).
 *
 * On http://localhost:8080 (nginx gateway), use /__clerk via window.origin.
 */
export function resolveClerkProxyUrl(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const { hostname, port, origin } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

  if (import.meta.env.DEV && isLocalHost && port === "5173") {
    return undefined;
  }

  const configured = import.meta.env.VITE_CLERK_PROXY_URL?.trim();
  if (!configured) {
    return undefined;
  }

  if (/^https?:\/\//i.test(configured)) {
    if (import.meta.env.DEV && isLocalHost && configured.includes("localhost:5173")) {
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
  const { protocol, port, hostname } = window.location;
  if (
    protocol === "https:" &&
    port === "5173" &&
    (hostname === "localhost" || hostname === "127.0.0.1")
  ) {
    console.warn(
      "[TIP] Ouvrez http://localhost:5173 ou http://localhost:8080 — le port 5173 en HTTPS sans certificat bloque le chargement des scripts.",
    );
  }
}
