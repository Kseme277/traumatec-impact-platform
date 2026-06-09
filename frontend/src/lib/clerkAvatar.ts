import type { UserResource } from "@clerk/types";

const GOOGLE_PROVIDERS = new Set(["google", "oauth_google"]);

type ExternalAccountLike = {
  provider?: string;
  imageUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type ClerkAvatarInfo = {
  imageUrl: string | null;
  initials: string;
  firstName: string;
  lastName: string;
};

function buildInitials(firstName: string, lastName: string, email?: string | null): string {
  const first = firstName.trim();
  const last = lastName.trim();
  if (first && last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  }
  if (first.length >= 2) {
    return first.slice(0, 2).toUpperCase();
  }
  if (first) {
    return first.charAt(0).toUpperCase();
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return "U";
}

function googleAccount(user: UserResource | null | undefined): ExternalAccountLike | undefined {
  return user?.externalAccounts?.find((account) =>
    GOOGLE_PROVIDERS.has(account.provider),
  ) as ExternalAccountLike | undefined;
}

/** Photo et initiales Clerk / Google OAuth. */
export function resolveClerkAvatar(user: UserResource | null | undefined): ClerkAvatarInfo {
  const google = googleAccount(user);
  const firstName = (user?.firstName ?? google?.firstName ?? "").trim();
  const lastName = (user?.lastName ?? google?.lastName ?? "").trim();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  const imageUrl =
    (user?.hasImage && user.imageUrl) ||
    google?.imageUrl ||
    user?.imageUrl ||
    null;

  return {
    imageUrl: imageUrl?.trim() || null,
    initials: buildInitials(firstName, lastName, email),
    firstName,
    lastName,
  };
}
