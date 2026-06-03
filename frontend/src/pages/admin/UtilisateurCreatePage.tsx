import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import AdminBreadcrumb from "../../components/common/AdminBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import UtilisateurForm from "../../features/admin/users/UtilisateurForm";
import { createUser } from "../../api/users";
import { ApiError } from "../../api/client";
import type { UtilisateurCreatePayload } from "../../features/auth/types";
import { showError, showSuccess } from "../../lib/swal";

export default function UtilisateurCreatePage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Inviter un utilisateur | TIP";
  }, []);

  const handleSubmit = async (payload: UtilisateurCreatePayload) => {
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const created = await createUser(token, payload);
      await showSuccess(
        "Invitation envoyée",
        `${created.prenom} ${created.nom} recevra un email Traumatec pour activer son compte.`,
      );
      navigate(`/admin/utilisateurs/${created.id}`);
    } catch (err) {
      await showError(
        "Création impossible",
        err instanceof ApiError ? err.message : "Une erreur est survenue.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Inviter un utilisateur | Traumatec Impact Platform"
        description="Créer un compte invité et envoyer l'email d'activation Traumatec."
      />
      <AdminBreadcrumb
        pageTitle="Inviter un utilisateur"
        crumbs={[
          { label: "Administration", to: "/" },
          { label: "Utilisateurs", to: "/admin/utilisateurs" },
        ]}
      />

      <ComponentCard
        title="Nouvel utilisateur"
        desc="Un email d'invitation Traumatec sera envoyé automatiquement via Mailpit en développement."
      >
        <UtilisateurForm
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/admin/utilisateurs")}
        />
      </ComponentCard>

      <div className="mt-4">
        <Link to="/admin/utilisateurs">
          <Button variant="outline" size="sm">
            Retour à la liste
          </Button>
        </Link>
      </div>
    </>
  );
}
