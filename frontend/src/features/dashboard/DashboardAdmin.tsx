import { useEffect } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import { useTipAuth } from "../../context/TipAuthContext";
import { useAdminUsers } from "../admin/users/useAdminUsers";
import GuidesDocCard from "./GuidesDocCard";
import { roleLabel } from "../auth/types";

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
      {hint && <p className="mt-1 text-theme-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function DashboardAdmin() {
  const { tipUser } = useTipAuth();
  const { users, loadUsers } = useAdminUsers();

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const activeCount = users.filter((user) => user.est_actif).length;

  return (
    <>
      <PageMeta title="Administration | TIP" description="Traumatec Impact Platform — Administrateur" />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Bonjour, {tipUser?.prenom}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Espace {roleLabel("administrateur")} — pilotage plateforme et utilisateurs
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <MetricCard label="Utilisateurs actifs" value={String(activeCount)} hint={`${users.length} au total`} />
        <MetricCard label="Imports annuels" value="—" hint="Projects.xlsx" />
        <MetricCard label="Templates" value="—" hint="Paquets + certificats" />
        <MetricCard label="Audit (7 j)" value="—" hint="Journal minimal" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Administration</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Gérez les comptes invités, les accès et les invitations email.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/admin/utilisateurs">
                <Button size="sm">Gérer les utilisateurs</Button>
              </Link>
              <Link to="/admin/utilisateurs/nouveau">
                <Button size="sm" variant="outline">
                  Inviter un utilisateur
                </Button>
              </Link>
              <Link to="/evenements">
                <Button size="sm" variant="outline">
                  Événements
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <GuidesDocCard />
      </div>
    </>
  );
}
