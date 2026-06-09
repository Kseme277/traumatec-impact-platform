export interface TutorialStepConfig {
  id: string;
  target?: string;
  titleKey: string;
  bodyKey: string;
  route?: string;
  adminOnly?: boolean;
  center?: boolean;
}

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    id: "welcome",
    titleKey: "tutorial.steps.welcome.title",
    bodyKey: "tutorial.steps.welcome.body",
    route: "/",
    center: true,
  },
  {
    id: "dashboard",
    target: "nav-dashboard",
    titleKey: "tutorial.steps.dashboard.title",
    bodyKey: "tutorial.steps.dashboard.body",
    route: "/",
  },
  {
    id: "events",
    target: "nav-events",
    titleKey: "tutorial.steps.events.title",
    bodyKey: "tutorial.steps.events.body",
    route: "/evenements",
  },
  {
    id: "documents",
    target: "nav-documents",
    titleKey: "tutorial.steps.documents.title",
    bodyKey: "tutorial.steps.documents.body",
    route: "/documents/templates",
  },
  {
    id: "generation",
    target: "nav-generation",
    titleKey: "tutorial.steps.generation.title",
    bodyKey: "tutorial.steps.generation.body",
    route: "/documents/generation",
  },
  {
    id: "profile",
    target: "nav-profile",
    titleKey: "tutorial.steps.profile.title",
    bodyKey: "tutorial.steps.profile.body",
    route: "/profil",
  },
  {
    id: "predictions",
    target: "nav-predictions",
    titleKey: "tutorial.steps.predictions.title",
    bodyKey: "tutorial.steps.predictions.body",
    route: "/predictions",
  },
  {
    id: "search",
    target: "header-search",
    titleKey: "tutorial.steps.search.title",
    bodyKey: "tutorial.steps.search.body",
  },
  {
    id: "theme",
    target: "header-theme",
    titleKey: "tutorial.steps.theme.title",
    bodyKey: "tutorial.steps.theme.body",
  },
  {
    id: "language",
    target: "header-language",
    titleKey: "tutorial.steps.language.title",
    bodyKey: "tutorial.steps.language.body",
  },
  {
    id: "user-menu",
    target: "header-user",
    titleKey: "tutorial.steps.userMenu.title",
    bodyKey: "tutorial.steps.userMenu.body",
  },
  {
    id: "assistant-fab",
    target: "assistant-fab",
    titleKey: "tutorial.steps.assistantFab.title",
    bodyKey: "tutorial.steps.assistantFab.body",
  },
  {
    id: "guides",
    target: "guides-widget",
    titleKey: "tutorial.steps.guides.title",
    bodyKey: "tutorial.steps.guides.body",
  },
  {
    id: "admin",
    target: "nav-admin",
    titleKey: "tutorial.steps.admin.title",
    bodyKey: "tutorial.steps.admin.body",
    route: "/admin/utilisateurs",
    adminOnly: true,
  },
  {
    id: "finish",
    titleKey: "tutorial.steps.finish.title",
    bodyKey: "tutorial.steps.finish.body",
    route: "/",
    center: true,
  },
];

export function getTutorialSteps(isAdmin: boolean): TutorialStepConfig[] {
  return TUTORIAL_STEPS.filter((step) => !step.adminOnly || isAdmin);
}
