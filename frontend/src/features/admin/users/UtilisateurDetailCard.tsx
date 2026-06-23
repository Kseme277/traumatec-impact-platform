import { useEffect, useState } from "react";
import { Link } from "react-router";
import ComponentCard from "../../../components/common/ComponentCard";
import Switch from "../../../components/form/switch/Switch";
import Badge from "../../../components/ui/badge/Badge";
import Button from "../../../components/ui/button/Button";
import { useTranslation } from "../../../i18n/useTranslation";
import type { Utilisateur } from "../../auth/types";
import { useTipAuth } from "../../../context/TipAuthContext";
import InvitationLinkCopy from "./InvitationLinkCopy";
import UserRolesEditor from "./UserRolesEditor";

interface UtilisateurDetailCardProps {
  user: Utilisateur;
  isToggling: boolean;
  isResending: boolean;
  activationLink?: string | null;
  activationHint?: string | null;
  onToggle: (user: Utilisateur) => Promise<boolean>;
  onResend: (user: Utilisateur) => Promise<boolean>;
  onGenerateLink: (user: Utilisateur) => Promise<void>;
  onUserUpdated?: (user: Utilisateur) => void;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-100 py-4 last:border-0 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-theme-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <div className="text-theme-sm text-gray-800 dark:text-white/90">{children}</div>
    </div>
  );
}

export default function UtilisateurDetailCard({
  user,
  isToggling,
  isResending,
  activationLink,
  activationHint,
  onToggle,
  onResend,
  onGenerateLink,
  onUserUpdated,
}: UtilisateurDetailCardProps) {
  const { t, localeTag } = useTranslation();
  const { tipUser } = useTipAuth();
  const isSelf = tipUser?.id === user.id;
  const [active, setActive] = useState(user.est_actif);

  useEffect(() => {
    setActive(user.est_actif);
  }, [user.est_actif]);

  const handleSwitch = async () => {
    const previous = active;
    setActive(!previous);
    const ok = await onToggle(user);
    if (!ok) {
      setActive(previous);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <ComponentCard title={t("users.profile")} desc={t("users.profileDesc")} className="xl:col-span-2">
        <DetailRow label={t("users.fullName")}>
          {user.prenom} {user.nom}
        </DetailRow>
        <DetailRow label={t("common.email")}>{user.email}</DetailRow>
        <DetailRow label={t("users.rolesLabel")}>
          <div className="w-full max-w-md">
            <UserRolesEditor
              user={user}
              disabled={isSelf}
              onUpdated={(updated) => onUserUpdated?.(updated)}
            />
          </div>
        </DetailRow>
        <DetailRow label={t("users.clerkId")}>
          <span className="font-mono text-theme-xs">{user.clerk_id ?? "—"}</span>
        </DetailRow>
        <DetailRow label={t("users.createdAt")}>
          {new Date(user.created_at).toLocaleString(localeTag)}
        </DetailRow>
      </ComponentCard>

      <ComponentCard title={t("users.access")} desc={t("users.accessDesc")}>
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{t("users.accountActive")}</p>
              <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                {active ? t("users.canSignIn") : t("users.accessSuspended")}
              </p>
            </div>
            <Switch
              checked={active}
              disabled={isToggling || isSelf}
              aria-label={`${t("common.status")} ${user.email}`}
              onChange={() => void handleSwitch()}
            />
          </div>

          {isSelf && (
            <p className="text-theme-xs text-warning-600 dark:text-orange-400">
              {t("users.cannotDisableSelf")}
            </p>
          )}

          <Badge color={active ? "success" : "light"} size="sm">
            {active ? t("common.active") : t("common.inactive")}
          </Badge>

          <Button
            className="w-full"
            variant="outline"
            size="sm"
            disabled={!active || isResending}
            onClick={() => void onResend(user)}
          >
            {isResending ? t("common.sending") : t("users.resendInvite")}
          </Button>

          <Button
            className="w-full"
            size="sm"
            disabled={!active || isResending}
            onClick={() => void onGenerateLink(user)}
          >
            {isResending ? t("common.loading") : t("users.getActivationLink")}
          </Button>

          {activationLink ? (
            <InvitationLinkCopy url={activationLink} hint={activationHint} />
          ) : null}

          <Link to="/admin/utilisateurs">
            <Button className="w-full" variant="outline" size="sm">
              {t("common.backToList")}
            </Button>
          </Link>
        </div>
      </ComponentCard>
    </div>
  );
}
