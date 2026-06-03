import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import AdminBreadcrumb from "../../components/common/AdminBreadcrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import UtilisateurDetailCard from "../../features/admin/users/UtilisateurDetailCard";
import { useAdminUsers } from "../../features/admin/users/useAdminUsers";
import type { Utilisateur } from "../../features/auth/types";

export default function UtilisateurDetailPage() {
  const { id } = useParams();
  const userId = Number(id);
  const { users, isLoading, loadUsers, toggleStatus, resendInvite } = useAdminUsers();
  const [user, setUser] = useState<Utilisateur | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isResending, setIsResending] = useState(false);

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

  const handleResend = async (target: Utilisateur) => {
    setIsResending(true);
    const ok = await resendInvite(target);
    setIsResending(false);
    return ok;
  };

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Chargement...</p>;
  }

  if (!user) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Utilisateur introuvable.</p>
        <Link to="/admin/utilisateurs">
          <Button variant="outline" size="sm">
            Retour à la liste
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={`${user.prenom} ${user.nom} | Utilisateurs TIP`}
        description="Détail et gestion d'accès d'un utilisateur Traumatec Impact Platform."
      />
      <AdminBreadcrumb
        pageTitle={`${user.prenom} ${user.nom}`}
        crumbs={[
          { label: "Administration", to: "/" },
          { label: "Utilisateurs", to: "/admin/utilisateurs" },
        ]}
      />

      <UtilisateurDetailCard
        user={user}
        isToggling={isToggling}
        isResending={isResending}
        onToggle={handleToggle}
        onResend={handleResend}
      />
    </>
  );
}
