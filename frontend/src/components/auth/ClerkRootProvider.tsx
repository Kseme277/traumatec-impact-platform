import type { ReactNode } from "react";
import { useMemo } from "react";
import { ClerkProvider } from "@clerk/clerk-react";
import { resolveClerkProxyUrl, warnIfInsecureViteHttps } from "../../config/clerk";

interface ClerkRootProviderProps {
  publishableKey: string;
  children: ReactNode;
}

function resolveClerkDomain(): string | undefined {
  if (import.meta.env.VITE_CLERK_IS_SATELLITE !== "true") {
    return undefined;
  }

  const configured =
    import.meta.env.VITE_CLERK_DOMAIN?.trim() ||
    import.meta.env.VITE_APP_PUBLIC_URL?.trim() ||
    import.meta.env.VITE_APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return configured.replace(/\/$/, "");
    }
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return undefined;
}

export default function ClerkRootProvider({ publishableKey, children }: ClerkRootProviderProps) {
  const proxyUrl = useMemo(() => {
    warnIfInsecureViteHttps();
    return resolveClerkProxyUrl();
  }, []);

  const domain = useMemo(() => resolveClerkDomain(), []);

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      domain={domain}
      proxyUrl={proxyUrl}
      afterSignOutUrl="/"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      signInUrl="/signin"
      signUpUrl="/signin"
      touchSession
    >
      {children}
    </ClerkProvider>
  );
}
