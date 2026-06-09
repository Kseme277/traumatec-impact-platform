/** Clés i18n des commandes exemple — partagées entre l'aide et les puces cliquables. */

export const ASSISTANT_EXAMPLE_SECTIONS = [
  {
    titleKey: "assistant.helpSectionDiscovery",
    exampleKeys: ["assistant.exampleStartTutorial"],
    adminOnly: false,
  },
  {
    titleKey: "assistant.helpSectionGeneration",
    exampleKeys: ["assistant.exampleGenerate", "assistant.exampleGenerateMbeya"],
    adminOnly: false,
  },
  {
    titleKey: "assistant.helpSectionEvents",
    exampleKeys: [
      "assistant.exampleListEvents",
      "assistant.exampleCloseEvent",
      "assistant.exampleAnalyzeBudget",
      "assistant.exampleOpenEvents",
      "assistant.exampleOpenGeneration",
    ],
    adminOnly: false,
  },
  {
    titleKey: "assistant.helpSectionAdmin",
    exampleKeys: [
      "assistant.exampleCreateUser",
      "assistant.exampleBlock",
      "assistant.exampleUnblock",
      "assistant.exampleResendInvite",
      "assistant.exampleGc",
      "assistant.exampleAudit",
      "assistant.exampleOpenStorage",
      "assistant.exampleNavigate",
    ],
    adminOnly: true,
  },
] as const;

export function buildAssistantHelpText(
  t: (key: string) => string,
  options: { isAdmin: boolean },
): string {
  const lines = [t("assistant.helpIntro"), ""];

  for (const section of ASSISTANT_EXAMPLE_SECTIONS) {
    if (section.adminOnly && !options.isAdmin) continue;
    lines.push(t(section.titleKey));
    for (const key of section.exampleKeys) {
      lines.push(`• ${t(key)}`);
    }
    lines.push("");
  }

  lines.push(t("assistant.helpFooter"));
  return lines.join("\n").trim();
}

export function getAssistantExampleCommands(
  t: (key: string) => string,
  options: { isAdmin: boolean },
): string[] {
  const commands: string[] = [];
  for (const section of ASSISTANT_EXAMPLE_SECTIONS) {
    if (section.adminOnly && !options.isAdmin) continue;
    for (const key of section.exampleKeys) {
      commands.push(t(key));
    }
  }
  return commands;
}
