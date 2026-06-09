interface ClerkErrorShape {
  errors: Array<{ code?: string; message?: string; longMessage?: string }>;
}

export function mapClerkSignInError(err: ClerkErrorShape, t?: (key: string) => string): string {
  const first = err.errors[0];
  const code = first?.code ?? "";
  const message = first?.longMessage ?? first?.message ?? "";

  if (
    code === "strategy_for_user_invalid" ||
    message.toLowerCase().includes("verification strategy")
  ) {
    return t?.("auth.clerkNoPassword") ??
      "Ce compte n'a pas encore de mot de passe. Ouvrez le lien d'invitation reçu par email (page « Activer mon compte »), ou connectez-vous avec Google / X.";
  }

  if (code === "form_password_incorrect" || message.toLowerCase().includes("password")) {
    return t?.("auth.wrongPassword") ?? "Mot de passe incorrect.";
  }

  if (code === "form_identifier_not_found") {
    return t?.("auth.accountNotFound") ??
      "Aucun compte trouvé pour cet email. Contactez un administrateur Traumatec.";
  }

  return message || (t?.("auth.invalidCredentials") ?? "Identifiants invalides");
}
