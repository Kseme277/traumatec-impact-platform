
const ROLE_KEYS: Record<string, string> = {
  accord_collaboration: "documents.roleAccord",
  programme: "documents.roleProgramme",
  budget: "documents.roleBudget",
  coordonnees_bancaires: "documents.roleBanque",
  evaluation: "documents.roleEvaluation",
  rapport_national: "documents.roleRapport",
  presence_enseignants: "documents.rolePresenceEns",
  presence_participants: "documents.rolePresencePart",
  liste_definitive: "documents.roleListe",
  accuse_paiement: "documents.roleAccuse",
  rapport_depenses: "documents.roleDepenses",
  guide_utilisateur: "documents.roleGuide",
  logo: "documents.roleLogo",
  badge: "documents.roleBadge",
  presentation: "documents.rolePresentation",
  spreadsheet: "documents.roleSpreadsheet",
  pdf: "documents.rolePdf",
  image: "documents.roleImage",
  autre: "documents.roleOther",
};

export function documentRoleLabel(role: string, t: (key: string) => string): string {
  const key = ROLE_KEYS[role];
  return key ? t(key) : role;
}
