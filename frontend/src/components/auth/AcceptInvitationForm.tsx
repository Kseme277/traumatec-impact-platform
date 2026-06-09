import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth, useSignIn, useSignUp } from "@clerk/clerk-react";
import { isClerkAPIResponseError } from "@clerk/clerk-react/errors";
import { useTranslation } from "../../i18n/useTranslation";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";

export default function AcceptInvitationForm() {
  const { t } = useTranslation();
  const { isLoaded: authLoaded, isSignedIn, signOut } = useAuth();
  const { isLoaded: signUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();
  const { isLoaded: signInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const ticket = useMemo(
    () =>
      searchParams.get("__clerk_ticket") ??
      searchParams.get("ticket") ??
      searchParams.get("__clerk_invitation_token"),
    [searchParams],
  );

  const clerkStatus = searchParams.get("__clerk_status");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const clerkReady = signUpLoaded && signInLoaded;

  useEffect(() => {
    if (!ticket) {
      setError(t("auth.invalidInvitation"));
      return;
    }
    if (!authLoaded) return;

    if (isSignedIn) {
      setIsSigningOut(true);
      const returnUrl = `${window.location.pathname}${window.location.search}`;
      void signOut({ redirectUrl: returnUrl });
      return;
    }

    setIsSigningOut(false);
    setSessionReady(true);
  }, [authLoaded, isSignedIn, signOut, ticket, t]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!clerkReady || !ticket || !sessionReady) return;

    if (password.length < 8) {
      setError(t("auth.passwordMin8"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordsMismatch"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const preferSignUp = clerkStatus !== "sign_in";

    try {
      if (preferSignUp && signUp) {
        try {
          const signupResult = await signUp.create({
            strategy: "ticket",
            ticket,
            password,
          });

          if (signupResult.status === "complete" && signupResult.createdSessionId) {
            await setActiveSignUp({ session: signupResult.createdSessionId });
            navigate("/", { replace: true });
            return;
          }
        } catch (signupErr) {
          if (!signIn) {
            throw signupErr;
          }
        }
      }

      if (!signIn) {
        setError(t("auth.invitationFailed"));
        return;
      }

      const signinResult = await signIn.create({ strategy: "ticket", ticket });

      if (signinResult.status === "needs_new_password") {
        const updated = await signIn.update({ password });
        if (updated.status === "complete" && updated.createdSessionId) {
          await setActiveSignIn({ session: updated.createdSessionId });
          navigate("/", { replace: true });
          return;
        }
      }

      if (signinResult.status === "complete" && signinResult.createdSessionId) {
        await setActiveSignIn({ session: signinResult.createdSessionId });
        navigate("/", { replace: true });
        return;
      }

      if (!preferSignUp && signUp) {
        const signupResult = await signUp.create({
          strategy: "ticket",
          ticket,
          password,
        });
        if (signupResult.status === "complete" && signupResult.createdSessionId) {
          await setActiveSignUp({ session: signupResult.createdSessionId });
          navigate("/", { replace: true });
          return;
        }
      }

      setError(t("auth.activationIncomplete"));
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? t("auth.activationFailed"));
      } else {
        setError(t("auth.accountActivationFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ticket) {
    return (
      <div className="flex flex-col flex-1 justify-center w-full max-w-md mx-auto">
        <p className="text-sm text-error-500">{t("auth.invalidInvitation")}</p>
        <Link to="/signin" className="mt-4 text-sm text-brand-500 hover:underline">
          {t("common.backToSignIn")}
        </Link>
      </div>
    );
  }

  if (isSigningOut || !authLoaded || !sessionReady) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {isSigningOut ? t("auth.signingOutForInvitation") : t("auth.activating")}
        </p>
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
          {t("common.backToSignIn")}
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            {t("auth.activateAccount")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("auth.activateAccountDesc")}</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-900/50 dark:bg-error-950/30 dark:text-error-300"
          >
            {error}
          </div>
        )}

        {!clerkReady ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("auth.clerkLoading")}</p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>
              {t("common.password")} <span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.passwordMin8Placeholder")}
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
              {t("auth.confirmPassword")} <span className="text-error-500">*</span>
            </Label>
            <Input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("auth.passwordRepeat")}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            size="sm"
            disabled={!clerkReady || isSubmitting}
          >
            {isSubmitting ? t("auth.activating") : t("auth.activateAccount")}
          </Button>
        </form>
      </div>
    </div>
  );
}
