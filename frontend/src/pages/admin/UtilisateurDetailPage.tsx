import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import AdminBreadcrumb from "../../components/common/AdminBreadcrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import UtilisateurDetailCard from "../../features/admin/users/UtilisateurDetailCard";
import { useAdminUsers } from "../../features/admin/users/useAdminUsers";
import type { Utilisateur } from "../../features/auth/types";
import { useTranslation } from "../../i18n/useTranslation";

export default function UtilisateurDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const userId = Number(id);
  const location = useLocation();
  const { users, isLoading, loadUsers, toggleStatus, resendInvite, generateActivationLink } =
    useAdminUsers();
  const [user, setUser] = useState<Utilisateur | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [activationLink, setActivationLink] = useState<string | null>(
    (location.state as { invitationUrl?: string } | null)?.invitationUrl ?? null,
  );
  const [activationHint, setActivationHint] = useState<string | null>(
    (location.state as { invitationHint?: string } | null)?.invitationHint ?? null,
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!Number.isFinite(userId)) {
      setUser(null);
      return;
    }
    setUser(users.find((entry) => entry.id === userId) ?? null);
  }, [users, userId]);

  const handleToggle = async (target: Utilisateur) => {
    setIsToggling(true);
    const ok = await toggleStatus(target);
    setIsToggling(false);
    return ok;
  };

  const applyActivationResponse = (
    response: { invitation_url?: string | null; invitation_hint?: string | null } | null,
  ) => {
    if (response?.invitation_url) {
      setActivationLink(response.invitation_url);
      setActivationHint(response.invitation_hint ?? null);
    }
  };

  const handleResend = async (target: Utilisateur) => {
    setIsResending(true);
    const response = await resendInvite(target);
    applyActivationResponse(response);
    setIsResending(false);
    return response !== null;
  };

  const handleGenerateLink = async (target: Utilisateur) => {
    setIsResending(true);
    const response = await generateActivationLink(target);
    applyActivationResponse(response);
    setIsResending(false);
  };

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>;
  }

  if (!user) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("users.notFound")}</p>
        <Link to="/admin/utilisateurs">
          <Button variant="outline" size="sm">
            {t("common.backToList")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={`${user.prenom} ${user.nom} | ${t("users.title")} TIP`}
        description={t("users.profileDesc")}
      />
      <AdminBreadcrumb
        pageTitle={`${user.prenom} ${user.nom}`}
        crumbs={[
          { label: t("nav.admin"), to: "/" },
          { label: t("users.title"), to: "/admin/utilisateurs" },
        ]}
      />

      <UtilisateurDetailCard
        user={user}
        isToggling={isToggling}
        isResending={isResending}
        activationLink={activationLink}
        activationHint={activationHint}
        onToggle={handleToggle}
        onResend={handleResend}
        onGenerateLink={handleGenerateLink}
      />
    </>
  );
}
