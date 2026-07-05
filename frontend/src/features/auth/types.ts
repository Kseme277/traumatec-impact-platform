export type RoleUtilisateur =
  | "administrateur"
  | "support_administratif"
  | "controle_procedure"
  | "validateur"
  | "preparateur";

export const ALL_ROLES: RoleUtilisateur[] = [
  "administrateur",
  "support_administratif",
  "controle_procedure",
  "validateur",
];

export interface Utilisateur {
  id: number;
  clerk_id: string | null;
  username?: string | null;
  email: string;
  nom: string;
  prenom: string;
  phone?: string | null;
  role: RoleUtilisateur;
  roles: RoleUtilisateur[];
  est_actif: boolean;
  created_at: string;
  activation_date?: string | null;
  deactivation_date?: string | null;
  last_access?: string | null;
  avatar_url?: string | null;
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
  role?: RoleUtilisateur;
  roles?: RoleUtilisateur[];
  username?: string;
  phone?: string;
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

export function normalizeRoles(roles: RoleUtilisateur[] | undefined, fallback?: RoleUtilisateur): RoleUtilisateur[] {
  const map: Record<string, RoleUtilisateur> = { preparateur: "support_administratif" };
  const seen = new Set<RoleUtilisateur>();
  const out: RoleUtilisateur[] = [];
  for (const raw of roles ?? []) {
    const role = (map[raw] ?? raw) as RoleUtilisateur;
    if (!seen.has(role) && ALL_ROLES.includes(role)) {
      seen.add(role);
      out.push(role);
    }
  }
  if (!out.length && fallback) {
    const role = (map[fallback] ?? fallback) as RoleUtilisateur;
    out.push(role);
  }
  if (!out.length) out.push("support_administratif");
  return out;
}

export function hasRole(user: Pick<Utilisateur, "roles"> | null, role: RoleUtilisateur): boolean {
  if (!user) return false;
  return normalizeRoles(user.roles).includes(role === "preparateur" ? "support_administratif" : role);
}

export function hasAnyRole(user: Pick<Utilisateur, "roles"> | null, ...roles: RoleUtilisateur[]): boolean {
  return roles.some((role) => hasRole(user, role));
}

export function roleLabel(role: RoleUtilisateur, t?: (key: string) => string): string {
  const keyMap: Record<RoleUtilisateur, string> = {
    administrateur: "users.roleAdmin",
    support_administratif: "users.roleSupport",
    controle_procedure: "users.roleControle",
    validateur: "users.roleValidateur",
    preparateur: "users.roleSupport",
  };
  if (t) return t(keyMap[role] ?? role);
  const labels: Record<RoleUtilisateur, string> = {
    administrateur: "Administrateur",
    support_administratif: "Support administratif",
    controle_procedure: "Contrôleur de procédure",
    validateur: "Validateur",
    preparateur: "Support administratif",
  };
  return labels[role] ?? role;
}

export type WorkflowStatus =
  | "generated"
  | "submitted"
  | "under_procedure_review"
  | "procedure_rejected"
  | "procedure_approved"
  | "under_final_validation"
  | "validator_rejected"
  | "approved";

export function workflowStatusLabel(status: WorkflowStatus, t?: (key: string) => string): string {
  const key = `workflow.status.${status}`;
  if (t) return t(key);
  const labels: Record<WorkflowStatus, string> = {
    generated: "Généré",
    submitted: "Soumis",
    under_procedure_review: "En contrôle",
    procedure_rejected: "Rejeté (contrôle)",
    procedure_approved: "Validé contrôle",
    under_final_validation: "En validation finale",
    validator_rejected: "Rejeté (validateur)",
    approved: "Approuvé",
  };
  return labels[status] ?? status;
}
