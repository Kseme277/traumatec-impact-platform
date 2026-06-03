import { useState } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { Dropdown } from "../../components/ui/dropdown/Dropdown";
import { DropdownItem } from "../../components/ui/dropdown/DropdownItem";
import { useTipAuth } from "../../context/TipAuthContext";
import { isGuidesConfigured, openGuides } from "../../config/guides";
import { roleLabel } from "./types";

function initials(prenom: string, nom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const { tipUser } = useTipAuth();

  const prenom = tipUser?.prenom ?? user?.firstName ?? "Utilisateur";
  const nom = tipUser?.nom ?? user?.lastName ?? "";
  const email = tipUser?.email ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const role = tipUser?.role ?? "preparateur";
  const avatarUrl = user?.imageUrl;

  const closeDropdown = () => setIsOpen(false);

  const handleSignOut = async () => {
    closeDropdown();
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
        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-500/10 text-sm font-semibold text-brand-600 dark:text-brand-400">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(prenom, nom || "U")
          )}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium">{prenom}</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">{roleLabel(role)}</span>
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
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {prenom} {nom}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{email}</p>
          <span className="mt-2 inline-flex rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
            {roleLabel(role)}
          </span>
        </div>

        <ul className="py-2">
          <li>
            <DropdownItem
              tag="a"
              to="/profil"
              onItemClick={closeDropdown}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Mon profil
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              tag="a"
              to="/profil/mot-de-passe"
              onItemClick={closeDropdown}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Modifier mon mot de passe
            </DropdownItem>
          </li>
          {isGuidesConfigured() ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  closeDropdown();
                  openGuides();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Guides procédures ↗
              </button>
            </li>
          ) : null}
        </ul>

        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="mt-1 flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Déconnexion
        </button>
      </Dropdown>
    </div>
  );
}
