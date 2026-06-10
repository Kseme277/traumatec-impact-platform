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
import type { Utilisateur } from "../features/auth/types";

interface TipAuthContextValue {
  tipUser: Utilisateur | null;
  isLoading: boolean;
  error: string | null;
  errorStatus: number | null;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const TipAuthContext = createContext<TipAuthContextValue | undefined>(undefined);

const PROFILE_FETCH_TIMEOUT_MS = 20_000;

async function fetchMeWithTimeout(token: string | null): Promise<Utilisateur> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PROFILE_FETCH_TIMEOUT_MS);
  try {
    return await fetchMe(token, { signal: controller.signal });
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

  const value = useMemo(
    () => ({
      tipUser,
      isLoading,
      error,
      errorStatus,
      isAdmin: tipUser?.role === "administrateur",
      refreshProfile,
    }),
    [tipUser, isLoading, error, errorStatus, refreshProfile],
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
