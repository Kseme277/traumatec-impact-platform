import { BadgeCheck, Check, ClipboardCheck, Shield, UserCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "../../../i18n/useTranslation";
import { ALL_ROLES, type RoleUtilisateur } from "../../auth/types";

const ROLE_META: Record<
  RoleUtilisateur,
  { icon: LucideIcon; titleKey: string; descKey: string; accent: string }
> = {
  administrateur: {
    icon: Shield,
    titleKey: "users.roleAdminFull",
    descKey: "users.roleAdminDesc",
    accent: "border-violet-200 bg-violet-50/80 dark:border-violet-500/30 dark:bg-violet-500/10",
  },
  support_administratif: {
    icon: UserCog,
    titleKey: "users.roleSupport",
    descKey: "users.roleSupportDesc",
    accent: "border-sky-200 bg-sky-50/80 dark:border-sky-500/30 dark:bg-sky-500/10",
  },
  controle_procedure: {
    icon: ClipboardCheck,
    titleKey: "users.roleControle",
    descKey: "users.roleControleDesc",
    accent: "border-amber-200 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10",
  },
  validateur: {
    icon: BadgeCheck,
    titleKey: "users.roleValidateur",
    descKey: "users.roleValidateurDesc",
    accent: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-500/10",
  },
  preparateur: {
    icon: UserCog,
    titleKey: "users.roleSupport",
    descKey: "users.roleSupportDesc",
    accent: "border-sky-200 bg-sky-50/80 dark:border-sky-500/30 dark:bg-sky-500/10",
  },
};

interface RoleSelectorProps {
  value: RoleUtilisateur[];
  onChange: (roles: RoleUtilisateur[]) => void;
  disabled?: boolean;
  showHint?: boolean;
}

export default function RoleSelector({
  value,
  onChange,
  disabled = false,
  showHint = true,
}: RoleSelectorProps) {
  const { t } = useTranslation();

  const toggleRole = (role: RoleUtilisateur) => {
    if (disabled) return;
    const next = value.includes(role) ? value.filter((r) => r !== role) : [...value, role];
    onChange(next.length ? next : ["support_administratif"]);
  };

  return (
    <div className="space-y-3">
      {showHint ? (
        <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {t("users.rolesHint")}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ALL_ROLES.map((role) => {
          const meta = ROLE_META[role];
          const Icon = meta.icon;
          const selected = value.includes(role);
          return (
            <button
              key={role}
              type="button"
              disabled={disabled}
              aria-pressed={selected ? "true" : "false"}
              onClick={() => toggleRole(role)}
              className={`group relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                selected
                  ? `${meta.accent} border-brand-500/70 ring-2 ring-brand-500/20 shadow-sm`
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-gray-700"
              } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  selected
                    ? "bg-brand-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white/90">
                    {t(meta.titleKey)}
                  </span>
                  {selected ? (
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-brand-500 text-white">
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {t(meta.descKey)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {value.length > 0 ? (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          {value.length} {t("users.rolesSelected")}
        </p>
      ) : null}
    </div>
  );
}
