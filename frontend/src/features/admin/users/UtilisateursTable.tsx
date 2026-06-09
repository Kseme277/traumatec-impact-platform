import { Link } from "react-router";
import Badge from "../../../components/ui/badge/Badge";
import Switch from "../../../components/form/switch/Switch";
import TableIconButton from "../../../components/common/TableIconButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Eye, Trash2 } from "lucide-react";
import { useTranslation } from "../../../i18n/useTranslation";
import type { Utilisateur } from "../../auth/types";
import { roleLabel } from "../../auth/types";

interface UtilisateursTableProps {
  users: Utilisateur[];
  togglingId: number | null;
  deletingId: number | null;
  onToggle: (user: Utilisateur) => void;
  onDelete: (user: Utilisateur) => void;
}

export default function UtilisateursTable({
  users,
  togglingId,
  deletingId,
  onToggle,
  onDelete,
}: UtilisateursTableProps) {
  const { t, localeTag } = useTranslation();

  const headers = [
    t("common.user"),
    t("common.email"),
    t("common.role"),
    t("common.status"),
    t("users.createdAt"),
    t("common.actions"),
  ];

  if (users.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{t("users.empty")}</p>
    );
  }

  return (
    <div className="-mx-4 overflow-hidden sm:-mx-6">
      <div className="overflow-x-auto px-4 sm:px-6">
        <Table className="min-w-[920px] table-fixed w-full">
          <colgroup>
            <col className="w-[180px]" />
            <col className="w-[240px]" />
            <col className="w-[120px]" />
            <col className="w-[100px]" />
            <col className="w-[110px]" />
            <col className="w-[140px]" />
          </colgroup>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              {headers.map((header) => (
                <TableCell
                  key={header}
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {users.map((user) => (
              <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <TableCell className="px-4 py-4 text-start">
                  <Link
                    to={`/admin/utilisateurs/${user.id}`}
                    className="block truncate font-medium text-gray-800 transition hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400"
                    title={`${user.prenom} ${user.nom}`}
                  >
                    {user.prenom} {user.nom}
                  </Link>
                </TableCell>
                <TableCell className="px-4 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-300">
                  <span className="block truncate" title={user.email}>
                    {user.email}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-4 text-start">
                  <Badge color="primary" size="sm">
                    {roleLabel(user.role, t)}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-4 text-start">
                  <Badge color={user.est_actif ? "success" : "light"} size="sm">
                    {user.est_actif ? t("common.active") : t("common.inactive")}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {new Date(user.created_at).toLocaleDateString(localeTag)}
                </TableCell>
                <TableCell className="px-4 py-4 text-start">
                  <div className="flex items-center gap-2">
                    <TableIconButton
                      label={t("users.viewProfile")}
                      href={`/admin/utilisateurs/${user.id}`}
                    >
                      <Eye className="size-5" strokeWidth={1.75} aria-hidden />
                    </TableIconButton>
                    <TableIconButton
                      label={t("users.deleteUser")}
                      variant="danger"
                      disabled={deletingId === user.id}
                      onClick={() => onDelete(user)}
                    >
                      <Trash2 className="size-5" strokeWidth={1.75} aria-hidden />
                    </TableIconButton>
                    <Switch
                      checked={user.est_actif}
                      disabled={togglingId === user.id || deletingId === user.id}
                      aria-label={`${user.est_actif ? t("users.deactivate") : t("users.activate")} ${user.email}`}
                      onChange={() => onToggle(user)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
