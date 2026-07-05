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
import { Eye, Mail, Trash2 } from "lucide-react";
import UserProfileCell from "./UserProfileCell";
import { useTranslation } from "../../../i18n/useTranslation";
import type { Utilisateur } from "../../auth/types";
import { normalizeRoles, roleLabel } from "../../auth/types";

interface UtilisateursTableProps {
  users: Utilisateur[];
  togglingId: number | null;
  deletingId: number | null;
  resendingId: number | null;
  onToggle: (user: Utilisateur) => void;
  onDelete: (user: Utilisateur) => void;
  onResendInvitation: (user: Utilisateur) => void;
}

function isPendingActivation(user: Utilisateur): boolean {
  return !user.activation_date;
}

export default function UtilisateursTable({
  users,
  togglingId,
  deletingId,
  resendingId,
  onToggle,
  onDelete,
  onResendInvitation,
}: UtilisateursTableProps) {
  const { t, localeTag } = useTranslation();

  const headers = [
    t("users.profilePhoto"),
    t("common.email"),
    t("users.phone"),
    t("common.role"),
    t("users.lastAccess"),
    t("common.status"),
    t("common.actions"),
  ];

  if (users.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{t("users.empty")}</p>
    );
  }

  const formatAccess = (iso: string | null | undefined) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(localeTag, { dateStyle: "short", timeStyle: "short" });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table className="w-full table-fixed">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              {headers.map((header, index) => (
                <TableCell
                  key={header}
                  isHeader
                  className={`px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 ${
                    index === 0
                      ? "w-[24%]"
                      : index === 1
                        ? "w-[18%]"
                        : index === 2
                          ? "w-[10%]"
                          : index === 3
                            ? "w-[14%]"
                            : index === 4
                              ? "w-[12%]"
                              : index === 5
                                ? "w-[10%]"
                                : "w-[12%]"
                  }`}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {users.map((user) => (
              <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <TableCell className="px-5 py-4 text-start sm:px-6">
                  <UserProfileCell
                    user={user}
                    subtitle={user.username ?? undefined}
                    linkTo={`/admin/utilisateurs/${user.id}`}
                  />
                </TableCell>
                <TableCell className="px-4 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-300">
                  <span className="block truncate" title={user.email}>
                    {user.email}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                  {user.phone ?? "—"}
                </TableCell>
                <TableCell className="px-4 py-4 text-start">
                  <div className="flex flex-wrap gap-1">
                    {normalizeRoles(user.roles, user.role).map((role) => (
                      <Badge key={role} color="primary" size="sm">
                        {roleLabel(role, t)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatAccess(user.last_access)}
                </TableCell>
                <TableCell className="px-4 py-4 text-start">
                  <Badge color={user.est_actif ? "success" : "light"} size="sm">
                    {user.est_actif
                      ? isPendingActivation(user)
                        ? t("users.pendingActivation")
                        : t("common.active")
                      : t("common.inactive")}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-4 text-start">
                  <div className="flex items-center gap-2">
                    {isPendingActivation(user) && (
                      <TableIconButton
                        label={t("users.resendInvitation")}
                        disabled={resendingId === user.id}
                        onClick={() => onResendInvitation(user)}
                      >
                        <Mail className="size-5" strokeWidth={1.75} aria-hidden />
                      </TableIconButton>
                    )}
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
