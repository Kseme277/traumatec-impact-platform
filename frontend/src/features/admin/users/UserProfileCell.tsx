import { Link } from "react-router";
import type { Utilisateur } from "../../auth/types";
import { roleLabel } from "../../auth/types";

const AVATAR_COLORS = [
  "bg-brand-500/15 text-brand-700 dark:text-brand-300",
  "bg-success-500/15 text-success-700 dark:text-success-300",
  "bg-warning-500/15 text-warning-700 dark:text-warning-300",
  "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
];

function initialsFor(user: Pick<Utilisateur, "prenom" | "nom" | "email">): string {
  const first = user.prenom.trim();
  const last = user.nom.trim();
  if (first && last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  if (first.length >= 2) return first.slice(0, 2).toUpperCase();
  if (first) return first.charAt(0).toUpperCase();
  return user.email.charAt(0).toUpperCase() || "U";
}

function colorClassFor(user: Pick<Utilisateur, "email" | "id">): string {
  let hash = user.id;
  for (const char of user.email) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface UserAvatarProps {
  user: Utilisateur;
  size?: "sm" | "md";
  linkTo?: string;
}

const avatarSizeClasses = {
  sm: "h-10 w-10 text-sm",
  md: "h-11 w-11 text-sm",
};

export function UserAvatar({ user, size = "md", linkTo }: UserAvatarProps) {
  const initials = initialsFor(user);
  const fullName = `${user.prenom} ${user.nom}`.trim();
  const sizeClass = avatarSizeClasses[size];

  const content = user.avatar_url ? (
    <img
      src={user.avatar_url}
      alt=""
      referrerPolicy="no-referrer"
      className={`${sizeClass} shrink-0 rounded-full object-cover ring-1 ring-gray-100 dark:ring-gray-800`}
    />
  ) : (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-gray-100 dark:ring-gray-800 ${sizeClass} ${colorClassFor(user)}`}
      aria-hidden
    >
      {initials}
    </span>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-flex shrink-0" title={fullName} aria-label={fullName}>
        {content}
      </Link>
    );
  }

  return content;
}

interface UserProfileCellProps {
  user: Utilisateur;
  subtitle?: string;
  showPrimaryRole?: boolean;
  hideAvatar?: boolean;
  linkTo?: string;
  t?: (key: string) => string;
}

export default function UserProfileCell({
  user,
  subtitle,
  showPrimaryRole = false,
  hideAvatar = false,
  linkTo,
  t,
}: UserProfileCellProps) {
  const fullName = `${user.prenom} ${user.nom}`.trim();
  const roleText = showPrimaryRole ? roleLabel(user.role, t) : subtitle;

  const nameBlock = (
    <div className="min-w-0">
      <p className="truncate font-medium text-gray-800 dark:text-white/90" title={fullName}>
        {fullName}
      </p>
      {roleText ? (
        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400" title={roleText}>
          {roleText}
        </p>
      ) : null}
    </div>
  );

  if (hideAvatar) {
    return linkTo ? (
      <Link to={linkTo} className="min-w-0 hover:text-brand-600 dark:hover:text-brand-400">
        {nameBlock}
      </Link>
    ) : (
      nameBlock
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar user={user} />
      {linkTo ? (
        <Link to={linkTo} className="min-w-0 hover:text-brand-600 dark:hover:text-brand-400">
          {nameBlock}
        </Link>
      ) : (
        nameBlock
      )}
    </div>
  );
}
