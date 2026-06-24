import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { updateMe } from "../../api/users";
import { ApiError } from "../../api/client";
import ClerkUserAvatar from "../../components/auth/ClerkUserAvatar";
import { useTipAuth } from "../../context/TipAuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import { roleLabel, type UtilisateurUpdatePayload } from "../auth/types";
import { confirmAction, showError, showSuccess } from "../../lib/swal";

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} disabled />
    </div>
  );
}

export default function MonProfilForm() {
  const { t, localeTag } = useTranslation();
  const { getToken } = useAuth();
  const { tipUser, refreshProfile } = useTipAuth();
  const [form, setForm] = useState<UtilisateurUpdatePayload>({ prenom: "", nom: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tipUser) {
      setForm({ prenom: tipUser.prenom, nom: tipUser.nom });
    }
  }, [tipUser]);

  if (!tipUser) {
    return null;
  }

  const handleCancel = () => {
    setForm({ prenom: tipUser.prenom, nom: tipUser.nom });
    setIsEditing(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const prenom = form.prenom.trim();
    const nom = form.nom.trim();
    if (!prenom || !nom) {
      await showError(t("common.required"), t("profile.requiredFields"));
      return;
    }

    const confirmed = await confirmAction({
      title: t("confirm.saveProfileTitle"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const token = await getToken();
      await updateMe(token, { prenom, nom });
      await refreshProfile();
      setIsEditing(false);
      await showSuccess(t("profile.updateSuccess"), t("profile.updateSuccessDesc"));
    } catch (err) {
      await showError(
        t("profile.saveFailed"),
        err instanceof ApiError ? err.message : t("common.unknownError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <ComponentCard title={t("profile.identity")} desc={t("profile.identityDesc")} className="xl:col-span-2">
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
          <ClerkUserAvatar size="lg" />
          <div>
            <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {tipUser.prenom} {tipUser.nom}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{tipUser.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <Label>
                {t("common.firstName")} <span className="text-error-500">*</span>
              </Label>
              <Input
                value={form.prenom}
                disabled={!isEditing || isSubmitting}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                placeholder={t("common.firstName")}
              />
            </div>
            <div>
              <Label>
                {t("common.lastName")} <span className="text-error-500">*</span>
              </Label>
              <Input
                value={form.nom}
                disabled={!isEditing || isSubmitting}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder={t("common.lastName")}
              />
            </div>
          </div>

          <ReadOnlyField label={t("common.email")} value={tipUser.email} />

          <div>
            <Label>{t("common.role")}</Label>
            <div className="flex h-11 items-center">
              <Badge color="primary" size="sm">
                {roleLabel(tipUser.role, t)}
              </Badge>
            </div>
            <p className="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
              {t("profile.roleReadOnly")}
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6 dark:border-gray-800">
            {!isEditing ? (
              <Button type="button" size="sm" onClick={() => setIsEditing(true)}>
                {t("profile.editProfile")}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? t("common.saving") : t("common.save")}
                </Button>
              </>
            )}
          </div>
        </form>
      </ComponentCard>

      <div className="space-y-6">
        <ComponentCard title={t("profile.account")} desc={t("profile.accountDesc")}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{t("common.status")}</p>
                <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                  {tipUser.est_actif ? t("profile.accountActive") : t("profile.accountSuspended")}
                </p>
              </div>
              <Badge color={tipUser.est_actif ? "success" : "error"} size="sm">
                {tipUser.est_actif ? t("common.active") : t("common.inactive")}
              </Badge>
            </div>

            <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{t("profile.memberSince")}</p>
              <p className="mt-1 text-theme-sm text-gray-600 dark:text-gray-400">
                {new Date(tipUser.created_at).toLocaleDateString(localeTag, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <Link
              to="/profil/mot-de-passe"
              className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              {t("profile.changePassword")}
            </Link>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
