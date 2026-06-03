import { Link } from "react-router";
import Badge from "../../../components/ui/badge/Badge";
import Button from "../../../components/ui/button/Button";
import Switch from "../../../components/form/switch/Switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import type { Utilisateur } from "../../auth/types";
import { roleLabel } from "../../auth/types";

interface UtilisateursTableProps {
  users: Utilisateur[];
  isLoading: boolean;
  togglingId: number | null;
  onToggle: (user: Utilisateur) => void;
}

export default function UtilisateursTable({
  users,
  isLoading,
  togglingId,
  onToggle,
}: UtilisateursTableProps) {
  if (isLoading) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
    );
  }

  if (users.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Aucun utilisateur enregistré.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
          <TableRow>
            {["Utilisateur", "Email", "Rôle", "Statut", "Créé le", "Accès"].map((header) => (
              <TableCell
                key={header}
                isHeader
                className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
          {users.map((user) => (
            <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
              <TableCell className="px-5 py-4 text-start">
                <Link
                  to={`/admin/utilisateurs/${user.id}`}
                  className="block font-medium text-gray-800 transition hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400"
                >
                  {user.prenom} {user.nom}
                </Link>
              </TableCell>
              <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-300">
                {user.email}
              </TableCell>
              <TableCell className="px-5 py-4 text-start">
                <Badge color="primary" size="sm">
                  {roleLabel(user.role)}
                </Badge>
              </TableCell>
              <TableCell className="px-5 py-4 text-start">
                <Badge color={user.est_actif ? "success" : "light"} size="sm">
                  {user.est_actif ? "Actif" : "Inactif"}
                </Badge>
              </TableCell>
              <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                {new Date(user.created_at).toLocaleDateString("fr-FR")}
              </TableCell>
              <TableCell className="px-5 py-4 text-start">
                <div className="flex items-center gap-3">
                  <Link to={`/admin/utilisateurs/${user.id}`}>
                    <Button size="sm" variant="outline">
                      Détails
                    </Button>
                  </Link>
                  <Switch
                    checked={user.est_actif}
                    disabled={togglingId === user.id}
                    aria-label={`${user.est_actif ? "Désactiver" : "Activer"} ${user.email}`}
                    onChange={() => onToggle(user)}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
