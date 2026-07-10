import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/clerk-react";
import useSWR from "swr";
import { fetchMe } from "../api/users";
import { ApiError } from "../api/client";
import type { RoleUtilisateur, Utilisateur } from "../features/auth/types";
import { hasAnyRole, hasRole, normalizeRoles } from "../features/auth/types";
import { getApiToken } from "../lib/clerkToken";
import { clearTipSwrCache, tipSwrDefaults } from "../lib/swr";

interface TipAuthContextValue {
  tipUser: Utilisateur | null;
  isLoading: boolean;
  error: string | null;
  errorStatus: number | null;
  isAdmin: boolean;
  /** Support administratif : périmètre limité aux événements assignés */
  scopesEventsToOrganizer: boolean;
  roles: RoleUtilisateur[];
  hasRole: (role: RoleUtilisateur) => boolean;
  hasAnyRole: (...roles: RoleUtilisateur[]) => boolean;
  refreshProfile: () => Promise<void>;
}

const TipAuthContext = createContext<TipAuthContextValue | undefined>(undefined);

const PROFILE_FETCH_TIMEOUT_MS = 15_000;

async function loadProfileWithTimeout(
  getToken: ReturnType<typeof useAuth>["getToken"],
): Promise<Utilisateur> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PROFILE_FETCH_TIMEOUT_MS);
  try {
    const token = await getApiToken(getToken);
    if (controller.signal.aborted) {
      throw new DOMException("Profile load timeout", "AbortError");
    }
    const profile = await fetchMe(token, { signal: controller.signal });
    return {
      ...profile,
      roles: normalizeRoles(profile.roles, profile.role),
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

function isInvalidTokenStatus(status: number): boolean {
  return status === 401;
}

function profileErrorMessage(err: unknown): { message: string | null; status: number | null } {
  if (err instanceof ApiError) {
    if (isInvalidTokenStatus(err.status)) {
      return { message: null, status: err.status };
    }
    return { message: err.message, status: err.status };
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    return {
      message:
        "Délai dépassé (auth Clerk / profil). Réessayez — si ça persiste, vérifiez la connexion ou reconnectez-vous.",
      status: 0,
    };
  }
  return {
    message:
      "Impossible de contacter l'API. Vérifiez que les services TIP sont démarrés, puis réessayez.",
    status: 0,
  };
}

export function TipAuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();

  const {
    data: tipUser,
    error: swrError,
    isLoading: profileLoading,
    mutate,
  } = useSWR<Utilisateur>(
    isLoaded && isSignedIn ? ["me"] : null,
    () => loadProfileWithTimeout(getToken),
    {
      ...tipSwrDefaults,
      shouldRetryOnError: false,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    },
  );

  useEffect(() => {
    if (!(swrError instanceof ApiError) || !isInvalidTokenStatus(swrError.status)) {
      return;
    }
    void (async () => {
      await clearTipSwrCache();
      try {
        await signOut();
      } catch {
        /* session déjà invalide */
      }
    })();
  }, [swrError, signOut]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      void clearTipSwrCache();
    }
  }, [isLoaded, isSignedIn]);

  const refreshProfile = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    await mutate();
  }, [isLoaded, isSignedIn, mutate]);

  const parsedError = swrError ? profileErrorMessage(swrError) : null;
  const error = parsedError?.message ?? null;
  const errorStatus = parsedError?.status ?? null;

  const isLoading = !isLoaded || (Boolean(isSignedIn) && profileLoading && !tipUser);

  const roles = useMemo(
    () => normalizeRoles(tipUser?.roles, tipUser?.role),
    [tipUser],
  );
  const scopesEventsToOrganizer = useMemo(
    () =>
      hasRole(tipUser ?? null, "support_administratif") &&
      !hasRole(tipUser ?? null, "administrateur"),
    [tipUser],
  );

  const value = useMemo(
    () => ({
      tipUser: tipUser ?? null,
      isLoading,
      error,
      errorStatus,
      isAdmin: hasRole(tipUser ?? null, "administrateur"),
      scopesEventsToOrganizer,
      roles,
      hasRole: (role: RoleUtilisateur) => hasRole(tipUser ?? null, role),
      hasAnyRole: (...required: RoleUtilisateur[]) => hasAnyRole(tipUser ?? null, ...required),
      refreshProfile,
    }),
    [tipUser, isLoading, error, errorStatus, roles, scopesEventsToOrganizer, refreshProfile],
  );

  return <TipAuthContext.Provider value={value}>{children}</TipAuthContext.Provider>;
}

export function useTipAuth() {
  const context = useContext(TipAuthContext);
  if (!context) {
    throw new Error("useTipAuth must be used within TipAuthProvider");
  }
  return context;
}
