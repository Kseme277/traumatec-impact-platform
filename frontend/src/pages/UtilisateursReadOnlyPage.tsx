import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import TipSplashLoader from "../components/brand/TipSplashLoader";
import Badge from "../components/ui/badge/Badge";
import { fetchUsersDirectory } from "../api/workflow";
import { getApiToken } from "../lib/clerkToken";
import { roleLabel, type Utilisateur } from "../features/auth/types";
import { useTranslation } from "../i18n/useTranslation";

export default function UtilisateursReadOnlyPage() {
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const token = await getApiToken(getToken);
      setUsers(await fetchUsersDirectory(token));
      setLoading(false);
    })();
  }, [getToken]);

  return (
    <>
      <PageMeta title="Utilisateurs" description="Annuaire TIP (lecture seule)" />
      <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Utilisateurs</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Liste en lecture seule — contactez un administrateur pour modifier les comptes.</p>
      {loading ? <TipSplashLoader message={t("common.loading")} variant="inline" /> : null}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left">Nom</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Rôles</th>
              <th className="px-4 py-3 text-left">Statut</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3">{user.prenom} {user.nom}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(user.roles ?? [user.role]).map((role) => (
                      <Badge key={role} color="light" size="sm">{roleLabel(role)}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge color={user.est_actif ? "success" : "error"} size="sm">
                    {user.est_actif ? "Actif" : "Inactif"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
