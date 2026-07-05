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
import type { Utilisateur } from "../features/auth/types";
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
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {t("users.profilePhoto")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {t("common.email")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {t("common.status")}
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="px-5 py-4 text-start sm:px-6">
                    <UserProfileCell user={user} t={t} showPrimaryRole />
                  </TableCell>
                  <TableCell className="px-4 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-start">
                    <Badge color={user.est_actif ? "success" : "error"} size="sm">
                      {user.est_actif ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
