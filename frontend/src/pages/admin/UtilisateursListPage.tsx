import { useEffect, useState } from "react";
import { Link } from "react-router";
import AdminBreadcrumb from "../../components/common/AdminBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import UtilisateursTable from "../../features/admin/users/UtilisateursTable";
import { useAdminUsers } from "../../features/admin/users/useAdminUsers";
import type { Utilisateur } from "../../features/auth/types";

export default function UtilisateursListPage() {
  const { users, isLoading, loadUsers, toggleStatus } = useAdminUsers();
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleToggle = async (user: Utilisateur) => {
    setTogglingId(user.id);
    await toggleStatus(user);
    setTogglingId(null);
  };

  const activeCount = users.filter((user) => user.est_actif).length;

  return (
    <>
      <PageMeta
        title="Utilisateurs | Traumatec Impact Platform"
        description="Gestion des utilisateurs invités sur la plateforme Traumatec."
      />
      <AdminBreadcrumb pageTitle="Utilisateurs" crumbs={[{ label: "Administration", to: "/" }]} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Actifs</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Inactifs</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            {users.length - activeCount}
          </p>
        </div>
      </div>

      <ComponentCard
        title="Liste des utilisateurs"
        desc="Comptes invités avec accès à la plateforme. Utilisez le switch pour activer ou désactiver."
      >
        <div className="mb-6 flex flex-wrap justify-end gap-3">
          <Link to="/admin/utilisateurs/nouveau">
            <Button size="sm">+ Inviter un utilisateur</Button>
          </Link>
        </div>
        <UtilisateursTable
          users={users}
          isLoading={isLoading}
          togglingId={togglingId}
          onToggle={(user) => void handleToggle(user)}
        />
      </ComponentCard>
    </>
  );
}
