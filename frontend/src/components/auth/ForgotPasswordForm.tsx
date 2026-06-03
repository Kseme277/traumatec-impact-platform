import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useSignIn } from "@clerk/clerk-react";
import { isClerkAPIResponseError } from "@clerk/clerk-react/errors";
import { ChevronLeftIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";

export default function ForgotPasswordForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"email" | "reset">("email");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    setError(null);
    setInfo(null);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setStep("reset");
      setInfo("Un code de réinitialisation a été envoyé à votre adresse email.");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Email introuvable");
      } else {
        setError("Impossible d'envoyer le code. Réessayez.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!isLoaded || !signIn) return;

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/", { replace: true });
        return;
      }

      setError("Réinitialisation incomplète. Vérifiez le code reçu par email.");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Code ou mot de passe invalide");
      } else {
        setError("Impossible de réinitialiser le mot de passe.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Retour à la connexion
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Mot de passe oublié
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {step === "email"
              ? "Saisissez votre email Traumatec pour recevoir un code de réinitialisation."
              : "Saisissez le code reçu par email et choisissez un nouveau mot de passe."}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-900/50 dark:bg-error-950/30 dark:text-error-300"
          >
            {error}
          </div>
        )}

        {info && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            {info}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div>
              <Label>
                Email <span className="text-error-500">*</span>
              </Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@traumatec.org"
              />
            </div>
            <Button type="submit" className="w-full" size="sm" disabled={isSubmitting || !isLoaded}>
              {isSubmitting ? "Envoi..." : "Envoyer le code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <Label>
                Code reçu par email <span className="text-error-500">*</span>
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
              />
            </div>
            <div>
              <Label>
                Nouveau mot de passe <span className="text-error-500">*</span>
              </Label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Au moins 8 caractères"
              />
            </div>
            <div>
              <Label>
                Confirmer le mot de passe <span className="text-error-500">*</span>
              </Label>
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le mot de passe"
              />
            </div>
            <Button type="submit" className="w-full" size="sm" disabled={isSubmitting || !isLoaded}>
              {isSubmitting ? "Réinitialisation..." : "Réinitialiser et se connecter"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setPassword("");
                setConfirmPassword("");
                setInfo(null);
                setError(null);
              }}
              className="w-full text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              Renvoyer un code à une autre adresse
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
