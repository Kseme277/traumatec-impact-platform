import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/clerk-react";
import { fetchMe } from "../api/users";
import { ApiError } from "../api/client";
import { getApiToken } from "../lib/clerkToken";
import type { RoleUtilisateur, Utilisateur } from "../features/auth/types";
import { hasAnyRole, hasRole, normalizeRoles } from "../features/auth/types";

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

const PROFILE_FETCH_TIMEOUT_MS = 20_000;

async function fetchMeWithTimeout(token: string | null): Promise<Utilisateur> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PROFILE_FETCH_TIMEOUT_MS);
  try {
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

export function TipAuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const [tipUser, setTipUser] = useState<Utilisateur | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const isLoading = !isLoaded || profileLoading;

  const refreshProfile = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setTipUser(null);
      setError(null);
      setErrorStatus(null);
      setProfileLoading(false);
      return;
    }

    setError(null);
    setErrorStatus(null);

    setProfileLoading(true);
    try {
      const token = await getApiToken(getToken);
      const profile = await fetchMeWithTimeout(token);
      setTipUser(profile);
      setError(null);
      setErrorStatus(null);
    } catch (err) {
      setTipUser(null);
      if (err instanceof ApiError) {
        if (isInvalidTokenStatus(err.status)) {
          setError(null);
          setErrorStatus(err.status);
          try {
            await signOut();
          } catch {
            /* session déjà invalide */
          }
        } else {
          setError(err.message);
          setErrorStatus(err.status);
        }
      } else if (err instanceof DOMException && err.name === "AbortError") {
        setError(
          "Délai dépassé lors du chargement du profil. Vérifiez que l'API TIP est démarrée (docker compose up -d).",
        );
        setErrorStatus(0);
      } else {
        setError(
          "Impossible de contacter l'API (port 8080 / nginx). Lancez « docker compose up -d » puis vérifiez que le conteneur nginx est bien démarré.",
        );
        setErrorStatus(0);
      }
    } finally {
      setProfileLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, signOut]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const roles = useMemo(() => normalizeRoles(tipUser?.roles, tipUser?.role), [tipUser]);
  const scopesEventsToOrganizer = useMemo(
    () => hasRole(tipUser, "support_administratif") && !hasRole(tipUser, "administrateur"),
    [tipUser],
  );

  const value = useMemo(
    () => ({
      tipUser,
      isLoading,
      error,
      errorStatus,
      isAdmin: hasRole(tipUser, "administrateur"),
      scopesEventsToOrganizer,
      roles,
      hasRole: (role: RoleUtilisateur) => hasRole(tipUser, role),
      hasAnyRole: (...required: RoleUtilisateur[]) => hasAnyRole(tipUser, ...required),
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
