import { useAuth } from "@clerk/clerk-react";
import { useCallback, useState } from "react";
import { deleteUser, fetchAllUsers, resendInvitation, toggleUserStatus } from "../../../api/users";
import { ApiError } from "../../../api/client";
import type { InvitationActionResponse, Utilisateur } from "../../auth/types";
import { confirmAction, showError, showSuccess } from "../../../lib/swal";

export function useAdminUsers() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const data = await fetchAllUsers(token);
      setUsers(data);
    } catch (err) {
      await showError(
        "Chargement impossible",
        err instanceof ApiError ? err.message : "Une erreur est survenue.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  const toggleStatus = useCallback(
    async (user: Utilisateur) => {
      const nextActive = !user.est_actif;
      const result = await confirmAction({
        title: nextActive ? "Activer l'utilisateur ?" : "Désactiver l'utilisateur ?",
        text: nextActive
          ? `${user.prenom} ${user.nom} pourra à nouveau se connecter.`
          : `${user.prenom} ${user.nom} ne pourra plus accéder à la plateforme.`,
        icon: "warning",
        confirmText: nextActive ? "Activer" : "Désactiver",
      });

      if (!result.isConfirmed) return false;

      try {
        const token = await getToken();
        const response = await toggleUserStatus(token, user.id);
        await showSuccess("Statut mis à jour", response.message);
        await loadUsers();
        return true;
      } catch (err) {
        await showError(
          "Échec de la mise à jour",
          err instanceof ApiError ? err.message : "Une erreur est survenue.",
        );
        return false;
      }
    },
    [getToken, loadUsers],
  );

  const requestActivationLink = useCallback(
    async (user: Utilisateur, options?: { confirm?: boolean }) => {
      if (options?.confirm !== false) {
        const result = await confirmAction({
          title: "Renvoyer l'invitation ?",
          text: `Un email Clerk sera envoyé à ${user.email} si possible, sinon un lien d'activation sera généré.`,
          icon: "question",
          confirmText: "Continuer",
        });
        if (!result.isConfirmed) return null;
      }

      try {
        const token = await getToken();
        const response = await resendInvitation(token, user.id);
        return response;
      } catch (err) {
        await showError(
          "Envoi impossible",
          err instanceof ApiError ? err.message : "Une erreur est survenue.",
        );
        return null;
      }
    },
    [getToken],
  );

  const resendInvite = useCallback(
    async (user: Utilisateur): Promise<InvitationActionResponse | null> => {
      const response = await requestActivationLink(user);
      if (!response) return null;
      await showSuccess("Invitation envoyée", response.message);
      return response;
    },
    [requestActivationLink],
  );

  const generateActivationLink = useCallback(
    async (user: Utilisateur): Promise<InvitationActionResponse | null> => {
      return requestActivationLink(user, { confirm: false });
    },
    [requestActivationLink],
  );

  const removeUser = useCallback(
    async (user: Utilisateur) => {
      const result = await confirmAction({
        title: "Supprimer l'utilisateur ?",
        text: `${user.prenom} ${user.nom} (${user.email}) sera retiré de TIP et de Clerk. Action irréversible.`,
        icon: "warning",
        confirmText: "Supprimer",
      });

      if (!result.isConfirmed) return false;

      try {
        const token = await getToken();
        const response = await deleteUser(token, user.id);
        await showSuccess("Utilisateur supprimé", response.message);
        await loadUsers();
        return true;
      } catch (err) {
        await showError(
          "Suppression impossible",
          err instanceof ApiError ? err.message : "Une erreur est survenue.",
        );
        return false;
      }
    },
    [getToken, loadUsers],
  );

  return {
    users,
    isLoading,
    loadUsers,
    toggleStatus,
    resendInvite,
    generateActivationLink,
    removeUser,
  };
}
