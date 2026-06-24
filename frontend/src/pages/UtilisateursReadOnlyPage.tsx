import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import SpinnerLoader from "../components/common/SpinnerLoader";
import {
  DATA_TABLE,
  DATA_TABLE_HEAD,
  DATA_TABLE_ROW,
  DATA_TABLE_TD,
  DATA_TABLE_TH,
} from "../components/common/dataTableClasses";
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
      {loading ? <SpinnerLoader message={t("common.loading")} /> : null}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        <table className={DATA_TABLE}>
          <thead className={DATA_TABLE_HEAD}>
            <tr>
              <th className={`${DATA_TABLE_TH} px-4 py-3`}>Nom</th>
              <th className={`${DATA_TABLE_TH} px-4 py-3`}>Email</th>
              <th className={`${DATA_TABLE_TH} px-4 py-3`}>Rôles</th>
              <th className={`${DATA_TABLE_TH} px-4 py-3`}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={DATA_TABLE_ROW}>
                <td className={`${DATA_TABLE_TD} px-4 py-3`}>{user.prenom} {user.nom}</td>
                <td className={`${DATA_TABLE_TD} px-4 py-3`}>{user.email}</td>
                <td className={`${DATA_TABLE_TD} px-4 py-3`}>
                  <div className="flex flex-wrap gap-1">
                    {(user.roles ?? [user.role]).map((role) => (
                      <Badge key={role} color="light" size="sm">{roleLabel(role)}</Badge>
                    ))}
                  </div>
                </td>
                <td className={`${DATA_TABLE_TD} px-4 py-3`}>
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
