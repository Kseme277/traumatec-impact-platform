import type { ReactNode } from "react";
import type { RoleUtilisateur } from "../features/auth/types";

export type NavSubItem = {
  name: string;
  path: string;
  tourId?: string;
  roles: RoleUtilisateur[];
};

export type NavItemDef = {
  id: string;
  name: string;
  icon: ReactNode;
  path?: string;
  tourId?: string;
  roles: RoleUtilisateur[];
  subItems?: NavSubItem[];
};

type RoleCheck = (role: RoleUtilisateur) => boolean;

function isVisible(roles: RoleUtilisateur[], hasRole: RoleCheck): boolean {
  return roles.some((role) => hasRole(role));
}

export function filterNavItems(
  items: NavItemDef[],
  hasRole: RoleCheck,
): NavItemDef[] {
  const result: NavItemDef[] = [];

  for (const item of items) {
    if (!isVisible(item.roles, hasRole)) continue;

    if (item.subItems?.length) {
      const subItems = item.subItems.filter((sub) => isVisible(sub.roles, hasRole));
      if (!subItems.length) continue;
      if (subItems.length === 1) {
        result.push({
          ...item,
          name: subItems[0].name,
          path: subItems[0].path,
          tourId: subItems[0].tourId ?? item.tourId,
          subItems: undefined,
        });
        continue;
      }
      result.push({ ...item, subItems });
      continue;
    }

    result.push(item);
  }

  return result;
}

/** Rôles autorisés par route principale (redirection si accès direct). */
export const ROUTE_ROLE_ACCESS: Record<string, RoleUtilisateur[]> = {
  "/dashboard": ["administrateur", "support_administratif", "controle_procedure", "validateur"],
  "/evenements": ["administrateur", "support_administratif"],
  "/certificats": ["administrateur", "support_administratif"],
  "/predictions": ["administrateur"],
  "/notifications": ["administrateur", "support_administratif", "controle_procedure", "validateur"],
  "/documents/templates": ["administrateur"],
  "/documents/generation": ["administrateur", "support_administratif"],
  "/workflow/controle": ["administrateur", "controle_procedure"],
  "/workflow/validation": ["administrateur", "validateur"],
  "/utilisateurs": ["support_administratif"],
  "/admin/referentiels": ["administrateur"],
  "/admin/referentiels/types-paquets": ["administrateur"],
  "/profil": ["administrateur", "support_administratif", "controle_procedure", "validateur"],
};

export function canAccessRoute(
  pathname: string,
  hasRole: RoleCheck,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (pathname.startsWith("/admin")) return false;

  const base =
    Object.keys(ROUTE_ROLE_ACCESS).find(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    ) ?? null;

  if (!base) return true;
  const allowed = ROUTE_ROLE_ACCESS[base];
  return allowed.some((role) => hasRole(role));
}
