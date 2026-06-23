import {
  Award,
  BadgeCheck,
  Bell,
  FileText,
  LayoutGrid,
  List,
  Shield,
  UserRound,
} from "lucide-react";
import type { NavItemDef } from "../config/navByRole";

export function buildNavItemDefs(t: (key: string) => string): NavItemDef[] {
  return [
    {
      id: "dashboard",
      icon: <LayoutGrid className="size-6" strokeWidth={1.75} />,
      name: t("nav.dashboard"),
      path: "/dashboard",
      tourId: "nav-dashboard",
      roles: ["administrateur", "support_administratif", "controle_procedure", "validateur"],
    },
    {
      id: "events",
      icon: <List className="size-6" strokeWidth={1.75} />,
      name: t("nav.events"),
      path: "/evenements",
      tourId: "nav-events",
      roles: ["administrateur", "support_administratif"],
    },
    {
      id: "certificates",
      icon: <Award className="size-6" strokeWidth={1.75} />,
      name: t("nav.certificates"),
      path: "/certificats",
      tourId: "nav-certificates",
      roles: ["administrateur", "support_administratif"],
    },
    // Prédictions ML — masqué temporairement (route /predictions toujours accessible en direct)
    {
      id: "notifications",
      icon: <Bell className="size-6" strokeWidth={1.75} />,
      name: t("nav.notifications"),
      path: "/notifications",
      tourId: "nav-notifications",
      roles: ["administrateur", "support_administratif", "controle_procedure", "validateur"],
    },
    {
      id: "documents",
      icon: <FileText className="size-6" strokeWidth={1.75} />,
      name: t("nav.documents"),
      tourId: "nav-documents",
      roles: ["administrateur", "support_administratif"],
      subItems: [
        {
          name: t("nav.templates"),
          path: "/documents/templates",
          roles: ["administrateur"],
        },
        {
          name: t("nav.generation"),
          path: "/documents/generation",
          tourId: "nav-generation",
          roles: ["administrateur", "support_administratif"],
        },
      ],
    },
    {
      id: "workflow-controle",
      icon: <Shield className="size-6" strokeWidth={1.75} />,
      name: t("nav.workflowControle"),
      path: "/workflow/controle",
      roles: ["administrateur", "controle_procedure"],
    },
    {
      id: "workflow-validation",
      icon: <BadgeCheck className="size-6" strokeWidth={1.75} />,
      name: t("nav.workflowValidation"),
      path: "/workflow/validation",
      roles: ["administrateur", "validateur"],
    },
    {
      id: "users-readonly",
      icon: <UserRound className="size-6" strokeWidth={1.75} />,
      name: t("nav.users"),
      path: "/utilisateurs",
      roles: ["support_administratif"],
    },
    {
      id: "profile",
      icon: <UserRound className="size-6" strokeWidth={1.75} />,
      name: t("nav.profile"),
      path: "/profil",
      tourId: "nav-profile",
      roles: ["administrateur", "support_administratif", "controle_procedure", "validateur"],
    },
    {
      id: "admin",
      icon: <Shield className="size-6" strokeWidth={1.75} />,
      name: t("nav.admin"),
      tourId: "nav-admin",
      roles: ["administrateur"],
      subItems: [
        { name: t("nav.users"), path: "/admin/utilisateurs", roles: ["administrateur"] },
        { name: t("nav.referentiels"), path: "/admin/referentiels", roles: ["administrateur"] },
        { name: t("nav.audit"), path: "/admin/audit", roles: ["administrateur"] },
        { name: t("nav.storage"), path: "/admin/stockage", roles: ["administrateur"] },
      ],
    },
  ];
}
