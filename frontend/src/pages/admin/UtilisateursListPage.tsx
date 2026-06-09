import { useEffect, useState } from "react";
import { Link } from "react-router";
import AdminBreadcrumb from "../../components/common/AdminBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import DataTablePagination from "../../components/common/DataTablePagination";
import PageMeta from "../../components/common/PageMeta";
import TableLoader from "../../components/common/TableLoader";
import Button from "../../components/ui/button/Button";
import { CheckCircleIcon, ErrorIcon, GroupIcon } from "../../icons";
import UtilisateursTable from "../../features/admin/users/UtilisateursTable";
import UserStatCard from "../../features/admin/users/UserStatCard";
import { useAdminUsers } from "../../features/admin/users/useAdminUsers";
import type { Utilisateur } from "../../features/auth/types";
import { useTranslation } from "../../i18n/useTranslation";
import { usePagination } from "../../hooks/usePagination";

export default function UtilisateursListPage() {
  const { t } = useTranslation();
  const { users, isLoading, loadUsers, toggleStatus, removeUser } = useAdminUsers();
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const {
    paginatedItems,
    page,
    setPage,
    totalPages,
    totalItems,
    rangeStart,
    rangeEnd,
  } = usePagination(users, 10, String(users.length));

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleToggle = async (user: Utilisateur) => {
    setTogglingId(user.id);
    await toggleStatus(user);
    setTogglingId(null);
  };

  const handleDelete = async (user: Utilisateur) => {
    setDeletingId(user.id);
    await removeUser(user);
    setDeletingId(null);
  };

  const activeCount = users.filter((user) => user.est_actif).length;

  return (
    <>
      <PageMeta
        title={`${t("users.title")} | ${t("common.appName")}`}
        description={t("users.listDesc")}
      />
      <AdminBreadcrumb pageTitle={t("users.title")} crumbs={[{ label: t("nav.admin"), to: "/" }]} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        <UserStatCard
          label={t("common.total")}
          value={isLoading ? "—" : users.length}
          icon={<GroupIcon className="size-6 text-brand-500 dark:text-brand-400" />}
          iconBgClassName="bg-brand-50 dark:bg-brand-500/15"
        />
        <UserStatCard
          label={t("users.activeCount")}
          value={isLoading ? "—" : activeCount}
          icon={<CheckCircleIcon className="size-6 text-success-600 dark:text-success-500" />}
          iconBgClassName="bg-success-50 dark:bg-success-500/15"
        />
        <UserStatCard
          label={t("users.inactiveCount")}
          value={isLoading ? "—" : users.length - activeCount}
          icon={<ErrorIcon className="size-6 text-error-600 dark:text-error-500" />}
          iconBgClassName="bg-error-50 dark:bg-error-500/15"
        />
      </div>

      <ComponentCard title={t("users.list")} desc={t("users.listDesc")}>
        <div className="mb-6 flex flex-wrap justify-end gap-3">
          <Link to="/admin/utilisateurs/nouveau">
            <Button size="sm">+ {t("users.invite")}</Button>
          </Link>
        </div>

        {isLoading ? (
          <TableLoader message={t("users.loading")} />
        ) : (
          <>
            <UtilisateursTable
              users={paginatedItems}
              togglingId={togglingId}
              deletingId={deletingId}
              onToggle={(user) => void handleToggle(user)}
              onDelete={(user) => void handleDelete(user)}
            />
            <DataTablePagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPageChange={setPage}
            />
          </>
        )}
      </ComponentCard>
    </>
  );
}
