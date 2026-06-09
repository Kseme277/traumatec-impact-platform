import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import Button from "../../../components/ui/button/Button";
import { checkInvitationEmail } from "../../../api/users";
import { useTranslation } from "../../../i18n/useTranslation";
import type { RoleUtilisateur, UtilisateurCreatePayload } from "../../auth/types";

interface UtilisateurFormProps {
  initial?: UtilisateurCreatePayload;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit: (payload: UtilisateurCreatePayload) => Promise<void>;
  onCancel?: () => void;
}

export default function UtilisateurForm({
  initial = { email: "", nom: "", prenom: "", role: "preparateur" },
  isSubmitting = false,
  submitLabel,
  onSubmit,
  onCancel,
}: UtilisateurFormProps) {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [form, setForm] = useState<UtilisateurCreatePayload>(initial);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [emailBlocked, setEmailBlocked] = useState(false);
  const [suggestedEmail, setSuggestedEmail] = useState<string | null>(null);

  const roleOptions = useMemo(
    () => [
      { value: "preparateur", label: t("users.rolePreparer") },
      { value: "administrateur", label: t("users.roleAdminFull") },
    ],
    [t],
  );

  useEffect(() => {
    const value = form.email.trim();
    if (!value.includes("@")) {
      setEmailHint(null);
      setEmailBlocked(false);
      setSuggestedEmail(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const token = await getToken();
          const check = await checkInvitationEmail(token, value);
          setEmailBlocked(!check.can_create);
          setSuggestedEmail(check.suggested_email);
          if (check.message) {
            setEmailHint(check.message);
          } else if (check.clerk_exists) {
            setEmailHint(t("users.clerkExists"));
            setEmailBlocked(false);
          } else {
            setEmailHint(t("users.emailOAuthHint"));
          }
        } catch {
          setEmailHint(null);
          setEmailBlocked(false);
        }
      })();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [form.email, getToken, t]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (emailBlocked) return;
    const payload = suggestedEmail ? { ...form, email: suggestedEmail } : form;
    await onSubmit(payload);
  };

  const applySuggestedEmail = () => {
    if (suggestedEmail) {
      setForm((current) => ({ ...current, email: suggestedEmail }));
    }
  };

  const resolvedSubmitLabel = submitLabel ?? t("users.createInvite");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label>
            {t("common.firstName")} <span className="text-error-500">*</span>
          </Label>
          <Input
            required
            value={form.prenom}
            onChange={(e) => setForm({ ...form, prenom: e.target.value })}
            placeholder={t("common.firstName")}
          />
        </div>
        <div>
          <Label>
            {t("common.lastName")} <span className="text-error-500">*</span>
          </Label>
          <Input
            required
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            placeholder={t("common.lastName")}
          />
        </div>
      </div>

      <div>
        <Label>
          {t("common.email")} <span className="text-error-500">*</span>
        </Label>
        <Input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder={t("users.emailOAuthPlaceholder")}
        />
        {emailHint && (
          <p
            role="status"
            className={`mt-2 text-sm ${
              emailBlocked
                ? "text-error-600 dark:text-error-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {emailHint}
            {suggestedEmail && emailBlocked && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={applySuggestedEmail}
                  className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  {t("users.useSuggested")} {suggestedEmail}
                </button>
              </>
            )}
          </p>
        )}
      </div>

      <div>
        <Label>
          {t("common.role")} <span className="text-error-500">*</span>
        </Label>
        <Select
          options={roleOptions}
          defaultValue={form.role}
          onChange={(value) => setForm({ ...form, role: value as RoleUtilisateur })}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6 dark:border-gray-800">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
        )}
        <Button type="submit" size="sm" disabled={isSubmitting || emailBlocked}>
          {isSubmitting ? t("common.sending") : resolvedSubmitLabel}
        </Button>
      </div>
    </form>
  );
}
