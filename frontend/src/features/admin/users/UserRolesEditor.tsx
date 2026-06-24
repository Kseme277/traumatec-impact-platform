import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import Button from "../../../components/ui/button/Button";
import { updateUserRoles } from "../../../api/users";
import { getApiToken } from "../../../lib/clerkToken";
import { useTranslation } from "../../../i18n/useTranslation";
import { normalizeRoles, type RoleUtilisateur, type Utilisateur } from "../../auth/types";
import { confirmAction, showError, showSuccess } from "../../../lib/swal";
import RoleSelector from "./RoleSelector";

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

  const handleSave = async () => {
    const confirmed = await confirmAction({
      title: t("confirm.saveRolesTitle"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;
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
    <div className="space-y-4">
      <RoleSelector value={roles} onChange={setRoles} disabled={disabled || isSaving} showHint={false} />
      <Button size="sm" disabled={disabled || isSaving} onClick={() => void handleSave()}>
        {isSaving ? t("common.saving") : t("users.saveRoles")}
      </Button>
    </div>
  );
}
