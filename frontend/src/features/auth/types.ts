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

export interface UtilisateurCreateResult extends Utilisateur {
  invitation_sent?: boolean;
  invitation_url?: string | null;
  invitation_hint?: string | null;
}

export interface UtilisateurCreatePayload {
  email: string;
  nom: string;
  prenom: string;
  role: RoleUtilisateur;
}

export interface UtilisateurUpdatePayload {
  nom: string;
  prenom: string;
}

export interface ToggleStatusResponse {
  id: number;
  est_actif: boolean;
  message: string;
}

export interface InvitationActionResponse extends ToggleStatusResponse {
  invitation_url?: string | null;
  invitation_sent?: boolean;
  invitation_hint?: string | null;
}

export function roleLabel(role: RoleUtilisateur, t?: (key: string) => string): string {
  if (t) {
    return t(role === "administrateur" ? "users.roleAdmin" : "users.rolePreparer");
  }
  return role === "administrateur" ? "Admin" : "Préparateur";
}
