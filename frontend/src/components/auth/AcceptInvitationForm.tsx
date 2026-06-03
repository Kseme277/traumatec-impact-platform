import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useSignUp } from "@clerk/clerk-react";
import { isClerkAPIResponseError } from "@clerk/clerk-react/errors";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";

export default function AcceptInvitationForm() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ticket = searchParams.get("__clerk_ticket") ?? searchParams.get("ticket");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketChecked, setTicketChecked] = useState(false);

  useEffect(() => {
    if (!isLoaded || !signUp || !ticket || ticketChecked) return;

    const prepare = async () => {
      try {
        await signUp.create({ strategy: "ticket", ticket });
        setTicketChecked(true);
      } catch (err) {
        if (isClerkAPIResponseError(err)) {
          setError(err.errors[0]?.longMessage ?? "Invitation invalide ou expirée.");
        } else {
          setError("Impossible de valider l'invitation.");
        }
        setTicketChecked(true);
      }
    };

    void prepare();
  }, [isLoaded, signUp, ticket, ticketChecked]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isLoaded || !signUp) return;

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
      let currentSignUp = signUp;
      if (currentSignUp.status !== "complete") {
        currentSignUp = await signUp.update({ password });
      }

      if (currentSignUp.status === "complete" && currentSignUp.createdSessionId) {
        await setActive({ session: currentSignUp.createdSessionId });
        navigate("/", { replace: true });
        return;
      }

      setError("Activation incomplète. Contactez un administrateur.");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Échec de l'activation");
      } else {
        setError("Impossible d'activer le compte.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ticket) {
    return (
      <div className="flex flex-col flex-1 justify-center w-full max-w-md mx-auto">
        <p className="text-sm text-error-500">Lien d&apos;invitation invalide ou incomplet.</p>
        <Link to="/signin" className="mt-4 text-sm text-brand-500 hover:underline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

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
            Activer mon compte
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Définissez votre mot de passe pour accéder à Traumatec Impact Platform.
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>
              Mot de passe <span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Au moins 8 caractères"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
              >
                {showPassword ? (
                  <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                ) : (
                  <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                )}
              </span>
            </div>
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
          <Button
            type="submit"
            className="w-full"
            size="sm"
            disabled={!isLoaded || isSubmitting || !ticketChecked}
          >
            {isSubmitting ? "Activation..." : "Activer mon compte"}
          </Button>
        </form>
      </div>
    </div>
  );
}
