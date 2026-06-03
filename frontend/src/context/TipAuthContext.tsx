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
import type { Utilisateur } from "../features/auth/types";

interface TipAuthContextValue {
  tipUser: Utilisateur | null;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const TipAuthContext = createContext<TipAuthContextValue | undefined>(undefined);

export function TipAuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [tipUser, setTipUser] = useState<Utilisateur | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setTipUser(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      const profile = await fetchMe(token);
      setTipUser(profile);
      setError(null);
    } catch (err) {
      setTipUser(null);
      setError(err instanceof ApiError ? err.message : "Impossible de charger le profil");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const value = useMemo(
    () => ({
      tipUser,
      isLoading,
      error,
      isAdmin: tipUser?.role === "administrateur",
      refreshProfile,
    }),
    [tipUser, isLoading, error, refreshProfile],
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
