export interface SearchEntry {
  id: string;
  title: string;
  subtitle?: string;
  path: string;
  keywords: string[];
  category: string;
  adminOnly?: boolean;
}

export const SEARCH_ENTRIES: SearchEntry[] = [
  {
    id: "dashboard",
    title: "Tableau de bord",
    subtitle: "Vue d'ensemble TIP",
    path: "/",
    category: "Navigation",
    keywords: ["accueil", "home", "dashboard", "stats"],
  },
  {
    id: "evenements",
    title: "Événements",
    subtitle: "Liste et import Projects.xlsx",
    path: "/evenements",
    category: "Événements",
    keywords: ["events", "projects", "excel", "import"],
  },
  {
    id: "evenement-nouveau",
    title: "Nouvel événement",
    subtitle: "Créer un dossier AO Alliance",
    path: "/evenements/nouveau",
    category: "Événements",
    keywords: ["créer", "ajouter", "event"],
  },
  {
    id: "templates",
    title: "Templates documentaires",
    subtitle: "Paquets, certificats et profils",
    path: "/documents/templates",
    category: "Documents",
    keywords: ["templates", "catalog", "paquets", "certificats", "word"],
  },
  {
    id: "generation",
    title: "Génération documents",
    subtitle: "Produire les paquets et certificats",
    path: "/documents/generation",
    category: "Documents",
    keywords: ["docgen", "générer", "zip", "pdf", "export"],
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
];

export function filterSearchEntries(
  query: string,
  entries: SearchEntry[],
  options?: { adminOnly?: boolean },
): SearchEntry[] {
  const normalized = query.trim().toLowerCase();
  const visible = entries.filter((entry) => !entry.adminOnly || options?.adminOnly);

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
