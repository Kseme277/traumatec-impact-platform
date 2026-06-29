import { useEffect } from "react";
import { useLocation } from "react-router";

const CLERK_QUERY_KEYS = ["__clerk_handshake", "__clerk_status", "__clerk_db_jwt"];

function stripClerkHandshakeFromUrl(): void {
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of CLERK_QUERY_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed) {
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", next);
  }
}

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    stripClerkHandshakeFromUrl();
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, [pathname]);

  return null;
}
