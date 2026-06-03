export type RoleUtilisateur = "administrateur" | "preparateur";

export interface Utilisateur {
  id: number;
  clerk_id: string | null;
  email: string;
  nom: string;
  prenom: string;
  role: RoleUtilisateur;
  est_actif: boolean;
  created_at: string;
}

export interface UtilisateurCreatePayload {
  email: string;
  nom: string;
  prenom: string;
  role: RoleUtilisateur;
}

export interface ToggleStatusResponse {
  id: number;
  est_actif: boolean;
  message: string;
}

export function roleLabel(role: RoleUtilisateur): string {
  return role === "administrateur" ? "Admin" : "Préparateur";
}
