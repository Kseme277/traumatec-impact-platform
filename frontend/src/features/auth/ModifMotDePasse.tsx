import { FormEvent, useState } from "react";
import { Link } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { isClerkAPIResponseError } from "@clerk/clerk-react/errors";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { useTranslation } from "../../i18n/useTranslation";

export default function ModifMotDePasse() {
  const { t } = useTranslation();
  const { user, isLoaded } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError(t("profile.newPasswordMin8"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordsMismatch"));
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    try {
      await user.updatePassword({ currentPassword, newPassword });
      setSuccess(t("profile.passwordUpdated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? t("profile.updatePasswordFailed"));
      } else {
        setError(t("profile.changePasswordFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <ComponentCard title={t("profile.securityTitle")} desc={t("profile.securityDesc")}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="current-password">{t("profile.currentPassword")}</Label>
            <Input
              id="current-password"
              type="password"
              name="current-password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t("profile.currentPassword")}
            />
          </div>

          <div>
            <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
            <Input
              id="new-password"
              type="password"
              name="new-password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("auth.newPassword")}
            />
          </div>

          <div>
            <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
            <Input
              id="confirm-password"
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("auth.confirmPassword")}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-900/50 dark:bg-error-950/30 dark:text-error-300"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-900/50 dark:bg-success-950/30 dark:text-success-300"
            >
              {success}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-6 dark:border-gray-800">
            <Link
              to="/profil"
              className="text-sm text-brand-500 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500/30 rounded"
            >
              {t("profile.backToProfile")}
            </Link>
            <Button type="submit" size="sm" disabled={!isLoaded || isSubmitting}>
              {isSubmitting ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}
