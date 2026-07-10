import { useAuth } from "@clerk/clerk-react";
import useSWR, {
  mutate as globalMutate,
  type Key,
  type SWRConfiguration,
  type SWRResponse,
} from "swr";
import { getApiToken } from "./clerkToken";

export type TipSWRKey = Key;

export type TipFetcher<T> = (token: string | null) => Promise<T>;

export const tipSwrDefaults: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
  keepPreviousData: true,
  errorRetryCount: 1,
};

/**
 * SWR authentifié TIP : la clé est ignorée tant que Clerk n'est pas prêt / non connecté.
 * Le fetcher reçoit le Bearer token Clerk (ou null).
 */
export function useTipSWR<T>(
  key: TipSWRKey,
  fetcher: TipFetcher<T>,
  config?: SWRConfiguration<T>,
): SWRResponse<T, Error> {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const enabled = Boolean(isLoaded && isSignedIn && key);

  return useSWR<T, Error>(
    enabled ? key : null,
    async () => {
      const token = await getApiToken(getToken);
      return fetcher(token);
    },
    {
      ...tipSwrDefaults,
      ...config,
    },
  );
}

/** Vide tout le cache SWR (ex. déconnexion). */
export function clearTipSwrCache(): Promise<unknown[]> {
  return globalMutate(() => true, undefined, { revalidate: false });
}

/** Invalide / revalide les clés dont le premier segment matche. */
export function revalidateTipKeys(...prefixes: string[]): Promise<unknown[]> {
  return globalMutate(
    (key) => {
      if (typeof key === "string") {
        return prefixes.some((p) => key === p || key.startsWith(`${p}/`));
      }
      if (Array.isArray(key) && typeof key[0] === "string") {
        return prefixes.includes(key[0]);
      }
      return false;
    },
    undefined,
    { revalidate: true },
  );
}

export { globalMutate as mutate };
