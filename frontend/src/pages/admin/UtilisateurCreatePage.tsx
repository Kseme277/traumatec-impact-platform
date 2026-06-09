import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import AdminBreadcrumb from "../../components/common/AdminBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import UtilisateurForm from "../../features/admin/users/UtilisateurForm";
import { createUser } from "../../api/users";
import { ApiError } from "../../api/client";
import type { UtilisateurCreatePayload } from "../../features/auth/types";
import { useTranslation } from "../../i18n/useTranslation";
import { showError, showSuccess } from "../../lib/swal";

export default function UtilisateurCreatePage() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = `${t("users.invite")} | TIP`;
  }, [t]);

  const handleSubmit = async (payload: UtilisateurCreatePayload) => {
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const created = await createUser(token, payload);
      const name = `${created.prenom} ${created.nom}`;
      let detail = created.invitation_sent
        ? `${name} ${t("users.inviteSentDesc")}`
        : `${name} ${t("users.inviteCreatedDesc")}`;
      if (created.invitation_hint) {
        detail = `${detail}\n\n${created.invitation_hint}`;
      }
      if (!created.invitation_sent && created.invitation_url) {
        detail = `${detail}\n\n${t("users.inviteLinkFallback")}\n${created.invitation_url}`;
      }
      const title = created.invitation_sent ? t("users.inviteSent") : t("users.inviteCreated");
      await showSuccess(title, detail);
      navigate(`/admin/utilisateurs/${created.id}`, {
        state: {
          invitationUrl: created.invitation_url ?? null,
          invitationHint: created.invitation_hint ?? null,
        },
      });
    } catch (err) {
      await showError(
        t("users.createFailed"),
        err instanceof ApiError ? err.message : t("common.unknownError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta
        title={`${t("users.invite")} | ${t("common.appName")}`}
        description={t("users.newUserDesc")}
      />
      <AdminBreadcrumb
        pageTitle={t("users.invite")}
        crumbs={[
          { label: t("nav.admin"), to: "/" },
          { label: t("users.title"), to: "/admin/utilisateurs" },
        ]}
      />

      <ComponentCard title={t("users.newUser")} desc={t("users.newUserDesc")}>
        <UtilisateurForm
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/admin/utilisateurs")}
        />
      </ComponentCard>

      <div className="mt-4">
        <Link to="/admin/utilisateurs">
          <Button variant="outline" size="sm">
            {t("common.backToList")}
          </Button>
        </Link>
      </div>
    </>
  );
}
