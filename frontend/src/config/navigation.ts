import type { ReactNode } from "react";

export type NavItem = {
  name: string;
  icon: ReactNode;
  path?: string;
  href?: string;
  adminOnly?: boolean;
  subItems?: {
    name: string;
    path?: string;
    href?: string;
    adminOnly?: boolean;
  }[];
};

export function getNavItems(isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    {
      name: "Tableau de bord",
      icon: null,
      path: "/",
    },
    {
      name: "Événements",
      icon: null,
      path: "/evenements",
    },
    {
      name: "Guides procédures",
      icon: null,
      href: import.meta.env.VITE_GUIDES_URL || undefined,
    },
    {
      name: "Mon profil",
      icon: null,
      path: "/profil",
    },
  ];

  if (isAdmin) {
    items.push({
      name: "Administration",
      icon: null,
      adminOnly: true,
      subItems: [
        { name: "Utilisateurs", path: "/admin/utilisateurs" },
        { name: "Inviter", path: "/admin/utilisateurs/nouveau" },
      ],
    });
  }

  return items;
}
