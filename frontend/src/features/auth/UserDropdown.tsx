import { useState } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import ClerkUserAvatar from "../../components/auth/ClerkUserAvatar";
import { Dropdown } from "../../components/ui/dropdown/Dropdown";
import { DropdownItem } from "../../components/ui/dropdown/DropdownItem";
import { useTipAuth } from "../../context/TipAuthContext";
import { isGuidesConfigured, openGuides } from "../../config/guides";
import { resolveClerkAvatar } from "../../lib/clerkAvatar";
import { useTranslation } from "../../i18n/useTranslation";
import { clearTipSwrCache } from "../../lib/swr";
import { normalizeRoles, roleLabel } from "./types";
import { confirmAction } from "../../lib/swal";

export default function UserDropdown() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const { tipUser } = useTipAuth();

  const clerkAvatar = resolveClerkAvatar(user);
  const prenom = tipUser?.prenom ?? clerkAvatar.firstName ?? user?.firstName ?? t("common.user");
  const nom = tipUser?.nom ?? clerkAvatar.lastName ?? user?.lastName ?? "";
  const email = tipUser?.email ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const role = tipUser?.role ?? "support_administratif";
  const roleDisplay = tipUser
    ? normalizeRoles(tipUser.roles, tipUser.role).map((r) => roleLabel(r, t)).join(", ")
    : roleLabel(role, t);

  const closeDropdown = () => setIsOpen(false);

  const handleSignOut = async () => {
    const confirmed = await confirmAction({
      title: t("confirm.logoutTitle"),
      text: t("confirm.logoutText"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
      icon: "question",
    });
    if (!confirmed.isConfirmed) return;
    closeDropdown();
    await clearTipSwrCache();
    await signOut({ redirectUrl: "/signin" });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <ClerkUserAvatar size="sm" />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium">{prenom}</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">{roleDisplay}</span>
        </span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 z-50 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="border-b border-slate-200 px-2 pb-3 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-3">
            <ClerkUserAvatar size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {prenom} {nom}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{email}</p>
              <span className="mt-2 inline-flex max-w-full flex-wrap gap-1">
                {normalizeRoles(tipUser?.roles, tipUser?.role).map((r) => (
                  <span
                    key={r}
                    className="inline-flex rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400"
                  >
                    {roleLabel(r, t)}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>

        <ul className="py-2">
          <li>
            <DropdownItem
              tag="a"
              to="/profil"
              onItemClick={closeDropdown}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t("users.myProfile")}
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              tag="a"
              to="/profil/mot-de-passe"
              onItemClick={closeDropdown}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t("profile.changePassword")}
            </DropdownItem>
          </li>
          {isGuidesConfigured() ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  closeDropdown();
                  openGuides("_blank");
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("users.guidesLink")}
              </button>
            </li>
          ) : null}
        </ul>

        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="mt-1 flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {t("users.signOut")}
        </button>
      </Dropdown>
    </div>
  );
}
