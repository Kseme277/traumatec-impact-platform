import type { useAuth } from "@clerk/clerk-react";

type GetTokenFn = ReturnType<typeof useAuth>["getToken"];

/**
 * Jeton Clerk pour les appels API TIP — même JWT que /users/me et les événements.
 */
export async function getApiToken(getToken: GetTokenFn): Promise<string | null> {
  const template = import.meta.env.VITE_CLERK_JWT_TEMPLATE?.trim();

  const session = await getToken(template ? { template } : undefined);
  if (session) {
    return session;
  }

  if (template) {
    try {
      return await getToken({ template, skipCache: true });
    } catch {
      /* continue */
    }
  }

  return getToken({ skipCache: true });
}
