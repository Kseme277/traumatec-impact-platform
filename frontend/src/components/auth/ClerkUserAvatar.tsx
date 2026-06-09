import { useUser } from "@clerk/clerk-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { resolveClerkAvatar } from "../../lib/clerkAvatar";

type ClerkUserAvatarProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-xl",
};

export default function ClerkUserAvatar({ size = "sm", className = "" }: ClerkUserAvatarProps) {
  const { user, isLoaded } = useUser();
  const [imageFailed, setImageFailed] = useState(false);
  const reloadedRef = useRef<string | null>(null);

  const avatar = useMemo(() => resolveClerkAvatar(user), [user]);

  useEffect(() => {
    if (!isLoaded || !user || reloadedRef.current === user.id) return;
    reloadedRef.current = user.id;
    void user.reload().catch(() => undefined);
  }, [isLoaded, user]);

  useEffect(() => {
    setImageFailed(false);
  }, [avatar.imageUrl]);

  const showImage = Boolean(avatar.imageUrl) && !imageFailed;

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500/10 font-semibold text-brand-600 dark:text-brand-400 ${sizeClasses[size]} ${className}`}
      aria-hidden={showImage ? "true" : undefined}
    >
      {showImage ? (
        <img
          src={avatar.imageUrl!}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        avatar.initials
      )}
    </span>
  );
}
