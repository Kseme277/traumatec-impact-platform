import type { ComponentProps } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";

/** Cible dashboard si session Clerk active, sinon page de connexion. */
export function usePlatformEntryPath(): string {
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && isSignedIn) {
    return "/dashboard";
  }
  return "/signin";
}

type PlatformEntryLinkProps = Omit<ComponentProps<typeof Link>, "to">;

export default function PlatformEntryLink({ children, ...props }: PlatformEntryLinkProps) {
  const to = usePlatformEntryPath();
  return (
    <Link to={to} {...props}>
      {children}
    </Link>
  );
}
