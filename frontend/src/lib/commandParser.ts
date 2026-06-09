export type CommandIntent =
  | { type: "start_tutorial" }
  | { type: "generate_package"; eventQuery: string }
  | { type: "create_user"; prenom: string; nom: string; email: string; role: "preparateur" | "administrateur" }
  | { type: "block_user"; userQuery: string }
  | { type: "unblock_user"; userQuery: string }
  | { type: "resend_invitation"; userQuery: string }
  | { type: "navigate"; path: string; label: string }
  | { type: "list_events" }
  | { type: "close_event"; eventQuery: string }
  | { type: "run_storage_gc"; purgeAll: boolean }
  | { type: "run_audit_export" }
  | { type: "analyze_budget"; eventQuery: string }
  | { type: "help" }
  | { type: "unknown"; raw: string };

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function stripQuotes(value: string): string {
  return value.replace(/^["'«»]|["'«»]$/g, "").trim();
}

function normalizeCommandInput(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

function parsePersonName(raw: string): { prenom: string; nom: string } {
  const cleaned = raw.replace(EMAIL_RE, "").replace(/['']s?\s*account$/i, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { prenom: "Utilisateur", nom: "-" };
  if (parts.length === 1) return { prenom: parts[0], nom: parts[0] };
  return { prenom: parts[0], nom: parts.slice(1).join(" ") };
}

function extractEmail(text: string): string | null {
  return text.match(EMAIL_RE)?.[0] ?? null;
}

function isTutorialCommand(text: string): boolean {
  if (/^(?:tutoriel|tutorial|onboarding|guided\s+tour)$/i.test(text)) {
    return true;
  }
  if (
    /(?:lance|démarre|demarre|start|commence|ouvre|open|run|afficher|affiche)\s+/i.test(text) &&
    /(?:tutoriel|tutorial|onboarding|visite\s+guid|usage\s+tutorial|guided\s+tour|guide\s+d['']?utilisation)/i.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

function parseCreateUser(text: string): CommandIntent | null {
  const email = extractEmail(text);
  if (!email) return null;

  const hasUserIntent =
    /(?:crée|créer|creer|invite|inviter|ajoute|ajouter|create|add|nouveau|new)\s+(?:un\s+|a\s+)?(?:utilisateur|user|compte|collaborateur|membre)/i.test(
      text,
    ) || /(?:utilisateur|user|compte)\s+.+\s+(?:@|[\w.+-]+@)/i.test(text);

  if (!hasUserIntent) return null;

  const role: "preparateur" | "administrateur" = /admin|administrateur/i.test(text)
    ? "administrateur"
    : "preparateur";

  let namePart = text
    .replace(email, "")
    .replace(
      /(?:crée|créer|creer|invite|inviter|ajoute|ajouter|create|add|nouveau|new)\s+(?:un\s+|a\s+)?(?:utilisateur|user|compte|collaborateur|membre)\s*/gi,
      "",
    )
    .replace(/(?:avec\s+|with\s+)?(?:cette\s+)?(?:l['']?)?(?:adresse|email|e-mail|mail)\s*/gi, "")
    .replace(/\b(?:admin|administrateur|preparateur|préparateur)\b/gi, "")
    .trim();

  const namedMatch = text.match(
    /(?:utilisateur|user|compte|collaborateur|membre)\s+(.+?)\s+(?:avec\s+|with\s+)?(?:cette\s+)?(?:l['']?)?(?:adresse|email|e-mail|mail)/i,
  );
  if (namedMatch?.[1]) {
    namePart = namedMatch[1].trim();
  }

  const { prenom, nom } = parsePersonName(namePart);
  return { type: "create_user", prenom, nom, email, role };
}

export function resolveNavigatePath(
  query: string,
  entries: { path: string; title: string; keywords: string[]; adminOnly?: boolean }[],
  isAdmin: boolean,
): { path: string; label: string } | null {
  const q = query.toLowerCase();
  let best: { path: string; label: string; score: number } | null = null;

  for (const entry of entries) {
    if (entry.adminOnly && !isAdmin) continue;
    let score = 0;
    const title = entry.title.toLowerCase();
    if (title.includes(q) || q.includes(title)) score += 5;
    for (const keyword of entry.keywords) {
      const kw = keyword.toLowerCase();
      if (q.includes(kw) || kw.includes(q)) score += 3;
    }
    if (q.includes("événement") && entry.path.includes("evenement")) score += 4;
    if (q.includes("event") && entry.path.includes("evenement")) score += 4;
    if ((q.includes("génération") || q.includes("generation")) && entry.path.includes("generation")) score += 4;
    if (q.includes("template") && entry.path.includes("templates")) score += 4;
    if ((q.includes("utilisateur") || q.includes("users")) && entry.path.includes("utilisateur")) score += 4;
    if ((q.includes("stockage") || q.includes("storage") || q.includes("minio")) && entry.path.includes("stockage"))
      score += 4;
    if (q.includes("audit") && entry.path.includes("audit")) score += 4;
    if ((q.includes("profil") || q.includes("profile")) && entry.path.includes("profil")) score += 4;
    if ((q.includes("accueil") || q.includes("home") || q.includes("dashboard")) && entry.path === "/") score += 4;
    if (
      (q.includes("prédiction") || q.includes("prediction") || q.includes("analytics") || q.includes("budget")) &&
      entry.path.includes("predictions")
    )
      score += 5;

    if (score > 0 && (!best || score > best.score)) {
      best = { path: entry.path, label: entry.title, score };
    }
  }

  return best ? { path: best.path, label: best.label } : null;
}

export function parseCommand(input: string): CommandIntent {
  const text = normalizeCommandInput(input);
  if (!text) return { type: "help" };

  if (/^(aide|help|commandes|commands|\?)$/i.test(text)) {
    return { type: "help" };
  }

  if (isTutorialCommand(text)) {
    return { type: "start_tutorial" };
  }

  const createUser = parseCreateUser(text);
  if (createUser) return createUser;

  if (
    /(?:liste|list|affiche|show|montre|display)\s+.*(?:événements|evenements|events)/i.test(text) ||
    /^(?:list|liste)\s+upcoming\s+events$/i.test(text)
  ) {
    return { type: "list_events" };
  }

  const navMatch = text.match(
    /^(?:ouvre|ouvrir|va|aller|goto|open|show|affiche|afficher|navigue|navigate)\s+(?:à|a|vers|sur|to|the|la|le|les|page|l['']?)?\s*(.+)$/i,
  );
  if (navMatch?.[1]) {
    const query = stripQuotes(navMatch[1]);
    return { type: "navigate", path: "", label: query };
  }

  if (
    /(?:purge|purger|nettoie|nettoyer|vider|clean|cleanup).*(?:tous|all|tout)/i.test(text) &&
    /(?:minio|stockage|storage|zip|fichier|file)/i.test(text)
  ) {
    return { type: "run_storage_gc", purgeAll: true };
  }

  if (
    /(?:nettoie|nettoyer|purge|purger|lance|exécute|execute|run|lancer|clean|cleanup).*(?:minio|stockage|storage|zip|garbage)/i.test(
      text,
    )
  ) {
    return { type: "run_storage_gc", purgeAll: false };
  }

  if (/(?:génère|genere|exporte|export|lance|run|generate).*(?:audit|journal|logs)/i.test(text)) {
    return { type: "run_audit_export" };
  }

  const analyzePatterns = [
    /(?:analyse|analyser|analyze|évalue|evaluer|verifie|vérifie)\s+(?:le\s+)?budget\s+(?:de|pour|for)\s+(?:l['']?)?(?:événement|evenement|event)?\s*(.+)$/i,
    /(?:analyse|analyser|analyze)\s+budget\s+for\s+(?:the\s+)?(.+?)(?:\s+event)?$/i,
    /(?:analyse|analyser|analyze).*(?:budget|risque|incohérence|affluence).*(?:événement|evenement|event)\s+(.+)$/i,
    /(?:budget|risque)\s+(?:événement|evenement|event)\s+(.+)$/i,
  ];
  for (const pattern of analyzePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return { type: "analyze_budget", eventQuery: stripQuotes(match[1]) };
    }
  }

  const generatePatterns = [
    /(?:génère|genere|générer|generer|lance|lancer|produce|generate|start)\s+(?:le\s+|the\s+)?(?:paquet|package|dossier)\s+(?:pour\s+|for\s+)?(?:l['']?)?(?:événement|evenement|event)?\s*(.+)$/i,
    /(?:génère|genere|générer|generer|lance|generate)\s+.+?\s+(?:pour|for)\s+(?:l['']?)?(?:événement|evenement|event)\s+(.+)$/i,
    /(?:paquet|package)\s+(?:pour|for)\s+(.+)$/i,
    /generate\s+(?:the\s+)?package\s+for\s+(?:the\s+)?(?:event\s+)?(.+)$/i,
    /generate\s+package\s+for\s+(.+)$/i,
  ];
  for (const pattern of generatePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return { type: "generate_package", eventQuery: stripQuotes(match[1]) };
    }
  }

  const resendPatterns = [
    /(?:renvoie|renvoyer|resend|relance)\s+(?:l['']?)?(?:invitation|invite)\s+(?:à|a|pour|de|to)?\s*(.+)$/i,
  ];
  for (const pattern of resendPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return { type: "resend_invitation", userQuery: stripQuotes(match[1]) };
    }
  }

  const closePatterns = [
    /(?:clôture|cloture|clôturer|cloturer|ferme|fermer|close)\s+(?:l['']?)?(?:événement|evenement|event)\s+(.+)$/i,
  ];
  for (const pattern of closePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return { type: "close_event", eventQuery: stripQuotes(match[1]) };
    }
  }

  const blockPatterns = [
    /(?:bloque|bloquer|désactive|desactive|desactiver|suspend|suspendre|block|deactivate|disable|ban)\s+(?:le\s+|the\s+)?(?:compte|account|utilisateur|user)?\s*(?:de|d['']|of)?\s*(.+)$/i,
    /(?:block|bloque)\s+(.+?)(?:'s)?\s+(?:account|compte)$/i,
  ];
  for (const pattern of blockPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return { type: "block_user", userQuery: stripQuotes(match[1]) };
    }
  }

  const unblockPatterns = [
    /(?:débloque|debloque|debloquer|réactive|reactive|reactiver|reactivate|unblock|enable|activate)\s+(?:le\s+|the\s+)?(?:compte|account|utilisateur|user)?\s*(?:de|d['']|of)?\s*(.+)$/i,
    /(?:reactivate|réactive|reactive)\s+(.+?)(?:'s)?\s+(?:account|compte)$/i,
  ];
  for (const pattern of unblockPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return { type: "unblock_user", userQuery: stripQuotes(match[1]) };
    }
  }

  return { type: "unknown", raw: text };
}
