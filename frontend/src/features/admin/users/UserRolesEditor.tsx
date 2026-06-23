import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import Button from "../../../components/ui/button/Button";
import { updateUserRoles } from "../../../api/users";
import { getApiToken } from "../../../lib/clerkToken";
import { useTranslation } from "../../../i18n/useTranslation";
import { ALL_ROLES, normalizeRoles, type RoleUtilisateur, type Utilisateur } from "../../auth/types";
import { showError, showSuccess } from "../../../lib/swal";

const ROLE_I18N: Record<RoleUtilisateur, string> = {
  administrateur: "users.roleAdminFull",
  support_administratif: "users.roleSupport",
  controle_procedure: "users.roleControle",
  validateur: "users.roleValidateur",
  preparateur: "users.roleSupport",
};

interface UserRolesEditorProps {
  user: Utilisateur;
  disabled?: boolean;
  onUpdated: (user: Utilisateur) => void;
}

export default function UserRolesEditor({ user, disabled = false, onUpdated }: UserRolesEditorProps) {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [roles, setRoles] = useState<RoleUtilisateur[]>(normalizeRoles(user.roles, user.role));
  const [isSaving, setIsSaving] = useState(false);

  const toggleRole = (role: RoleUtilisateur) => {
    setRoles((current) => {
      const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
      return next.length ? next : ["support_administratif"];
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = await getApiToken(getToken);
      const updated = await updateUserRoles(token, user.id, roles);
      onUpdated(updated);
      await showSuccess(t("users.rolesUpdated"));
    } catch (err) {
      await showError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ALL_ROLES.map((role) => (
          <label
            key={role}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-800"
          >
            <input
              type="checkbox"
              disabled={disabled || isSaving}
              className="size-4 rounded border-gray-300 text-brand-500"
              checked={roles.includes(role)}
              onChange={() => toggleRole(role)}
            />
            <span className="text-sm">{t(ROLE_I18N[role])}</span>
          </label>
        ))}
      </div>
      <Button size="sm" disabled={disabled || isSaving} onClick={() => void handleSave()}>
        {isSaving ? t("common.sending") : t("users.saveRoles")}
      </Button>
    </div>
  );
}
