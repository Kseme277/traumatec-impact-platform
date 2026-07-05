import PageMeta from "../components/common/PageMeta";
import SpinnerLoader from "../components/common/SpinnerLoader";
import Badge from "../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import UserProfileCell from "../features/admin/users/UserProfileCell";
import { fetchUsersDirectory } from "../api/workflow";
import { getApiToken } from "../lib/clerkToken";
import { normalizeRoles, roleLabel, type Utilisateur } from "../features/auth/types";
import { useTranslation } from "../i18n/useTranslation";
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";

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
      <PageMeta title={t("users.title")} description={t("users.readOnlyDesc")} />
      <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{t("users.title")}</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{t("users.readOnlyDesc")}</p>
      {loading ? <SpinnerLoader message={t("common.loading")} /> : null}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        <Table className="min-w-[720px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-4 py-3 text-theme-xs font-medium text-gray-500">
                {t("users.fullName")}
              </TableCell>
              <TableCell isHeader className="px-4 py-3 text-theme-xs font-medium text-gray-500">
                {t("common.email")}
              </TableCell>
              <TableCell isHeader className="px-4 py-3 text-theme-xs font-medium text-gray-500">
                {t("users.rolesLabel")}
              </TableCell>
              <TableCell isHeader className="px-4 py-3 text-theme-xs font-medium text-gray-500">
                {t("common.status")}
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {users.map((user) => (
              <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <TableCell className="px-4 py-3.5">
                  <UserProfileCell user={user} t={t} />
                </TableCell>
                <TableCell className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">{user.email}</TableCell>
                <TableCell className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {normalizeRoles(user.roles, user.role).map((role) => (
                      <Badge key={role} color="light" size="sm">
                        {roleLabel(role, t)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <Badge color={user.est_actif ? "success" : "error"} size="sm">
                    {user.est_actif ? t("common.active") : t("common.inactive")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
