import type { RoleUtilisateur } from "../features/auth/types";

export interface SearchEntry {
  id: string;
  title: string;
  subtitle?: string;
  path: string;
  keywords: string[];
  category: string;
  adminOnly?: boolean;
  roles?: RoleUtilisateur[];
}

export const SEARCH_ENTRIES: SearchEntry[] = [
  {
    id: "dashboard",
    title: "Tableau de bord",
    subtitle: "Vue d'ensemble TIP",
    path: "/dashboard",
    category: "Navigation",
    keywords: ["accueil", "home", "dashboard", "stats"],
  },
  {
    id: "predictions",
    title: "Prédictions ML",
    subtitle: "Risque budgétaire et affluence",
    path: "/predictions",
    category: "Navigation",
    keywords: ["predictions", "prédictions", "analytics", "ml", "budget", "risque", "affluence", "machine learning"],
    roles: ["administrateur"],
  },
  {
    id: "notifications",
    title: "Notifications",
    subtitle: "Alertes fin de génération DocGen",
    path: "/notifications",
    category: "Navigation",
    keywords: ["notifications", "alertes", "jobs", "rq", "redis", "docgen"],
  },
  {
    id: "evenements",
    title: "Événements",
    subtitle: "Liste et import Projects.xlsx",
    path: "/evenements",
    category: "Événements",
    keywords: ["events", "projects", "excel", "import"],
    roles: ["administrateur", "support_administratif"],
  },
  {
    id: "evenement-nouveau",
    title: "Nouvel événement",
    subtitle: "Créer un nouveau dossier événement",
    path: "/evenements/nouveau",
    category: "Événements",
    keywords: ["créer", "ajouter", "event"],
    roles: ["administrateur", "support_administratif"],
  },
  {
    id: "templates",
    title: "Templates documentaires",
    subtitle: "Paquets, certificats et profils",
    path: "/documents/templates",
    category: "Documents",
    keywords: ["templates", "catalog", "paquets", "certificats", "word"],
    roles: ["administrateur"],
  },
  {
    id: "generation",
    title: "Génération documents",
    subtitle: "Produire les paquets et certificats",
    path: "/documents/generation",
    category: "Documents",
    keywords: ["docgen", "générer", "zip", "pdf", "export"],
    roles: ["administrateur", "support_administratif"],
  },
  {
    id: "profil",
    title: "Mon profil",
    subtitle: "Informations personnelles",
    path: "/profil",
    category: "Compte",
    keywords: ["profile", "compte", "email"],
  },
  {
    id: "mot-de-passe",
    title: "Modifier mon mot de passe",
    path: "/profil/mot-de-passe",
    category: "Compte",
    keywords: ["password", "mot de passe", "sécurité"],
  },
  {
    id: "admin-users",
    title: "Utilisateurs",
    subtitle: "Administration des comptes invités",
    path: "/admin/utilisateurs",
    category: "Administration",
    keywords: ["admin", "users", "invitation"],
    adminOnly: true,
  },
  {
    id: "admin-referentiels",
    title: "Référentiels",
    subtitle: "Responsables nationaux et enseignants",
    path: "/admin/referentiels",
    category: "Administration",
    keywords: ["référentiel", "enseignants", "responsable national", "contacts"],
    adminOnly: true,
  },
  {
    id: "admin-package-catalog",
    title: "Catégories et types de paquets",
    subtitle: "Référentiel des types documentaires",
    path: "/admin/referentiels/types-paquets",
    category: "Administration",
    keywords: ["paquet", "type", "catégorie", "cours", "séminaire", "faculty", "templates"],
    adminOnly: true,
  },
  {
    id: "admin-user-new",
    title: "Inviter un utilisateur",
    path: "/admin/utilisateurs/nouveau",
    category: "Administration",
    keywords: ["inviter", "créer", "admin"],
    adminOnly: true,
  },
  {
    id: "admin-audit",
    title: "Journal d'audit",
    subtitle: "Logs système et exports",
    path: "/admin/audit",
    category: "Administration",
    keywords: ["audit", "logs", "journal", "export", "minio", "trace"],
    adminOnly: true,
  },
  {
    id: "assistant",
    title: "Assistant d'actions",
    subtitle: "Commandes en langage naturel",
    path: "/dashboard",
    category: "Actions",
    keywords: ["assistant", "commande", "bot", "ia", "génère", "paquet", "bloque"],
  },
  {
    id: "admin-storage",
    title: "Stockage MinIO",
    subtitle: "Garbage collector — purge des ZIP obsolètes",
    path: "/admin/stockage",
    category: "Administration",
    keywords: ["stockage", "minio", "gc", "garbage", "purge", "zip", "rétention", "nettoyage"],
    adminOnly: true,
  },
  {
    id: "admin-guidehub",
    title: "Liaison GuideHub",
    subtitle: "Identifiants SSO vers la plateforme guides",
    path: "/admin/guidehub",
    category: "Administration",
    keywords: ["guidehub", "guides", "sso", "handoff", "traumatec-cm", "liaison", "mot de passe"],
    adminOnly: true,
  },
];

export function filterSearchEntries(
  query: string,
  entries: SearchEntry[],
  options?: { adminOnly?: boolean; hasRole?: (role: RoleUtilisateur) => boolean },
): SearchEntry[] {
  const normalized = query.trim().toLowerCase();
  const hasRole = options?.hasRole;
  const visible = entries.filter((entry) => {
    if (entry.adminOnly && !options?.adminOnly) return false;
    if (entry.roles?.length && hasRole && !options?.adminOnly) {
      return entry.roles.some((role) => hasRole(role));
    }
    return true;
  });

  if (!normalized) {
    return visible.slice(0, 8);
  }

  return visible
    .filter((entry) => {
      const haystack = [entry.title, entry.subtitle ?? "", entry.category, ...entry.keywords]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    })
    .slice(0, 8);
}
