import { useAuth } from "@clerk/clerk-react";
import { useCallback, useState } from "react";
import { fetchAllUsers, resendInvitation, toggleUserStatus } from "../../../api/users";
import { ApiError } from "../../../api/client";
import type { Utilisateur } from "../../features/auth/types";
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

  const resendInvite = useCallback(
    async (user: Utilisateur) => {
      const result = await confirmAction({
        title: "Renvoyer l'invitation ?",
        text: `Un nouvel email sera envoyé à ${user.email}.`,
        icon: "question",
        confirmText: "Envoyer",
      });

      if (!result.isConfirmed) return false;

      try {
        const token = await getToken();
        const response = await resendInvitation(token, user.id);
        await showSuccess("Invitation envoyée", response.message);
        return true;
      } catch (err) {
        await showError(
          "Envoi impossible",
          err instanceof ApiError ? err.message : "Une erreur est survenue.",
        );
        return false;
      }
    },
    [getToken],
  );

  return { users, isLoading, loadUsers, toggleStatus, resendInvite };
}
