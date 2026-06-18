import TipAnimatedLogo from "./TipAnimatedLogo";
import { useTranslation } from "../../i18n/useTranslation";

interface TipSplashLoaderProps {
  message?: string;
  className?: string;
  /** Plein écran (auth) ou intégré (tableau, carte). */
  variant?: "fullscreen" | "inline";
  showMessage?: boolean;
}

export default function TipSplashLoader({
  message,
  className = "",
  variant = "fullscreen",
  showMessage = true,
}: TipSplashLoaderProps) {
  const { t } = useTranslation();
  const displayMessage = message ?? t("auth.loadingWorkspace");
  const isFullscreen = variant === "fullscreen";

  return (
    <div
      className={[
        "tip-splash relative flex flex-col items-center justify-center overflow-hidden",
        isFullscreen ? "min-h-screen p-6" : "tip-splash--inline py-16 px-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t("auth.loadingPage")}
    >
      <div className="tip-splash__blob tip-splash__blob--left" aria-hidden />
      <div className="tip-splash__blob tip-splash__blob--right" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center text-center">
        <TipAnimatedLogo
          size="lg"
          layout="stack"
          showWordmark
          showPlatformName
          showSlogan
          animate
        />

        <div className="tip-splash__bar mt-10" aria-hidden>
          <span className="tip-splash__bar-glow" />
        </div>

        {showMessage && displayMessage ? (
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 sm:text-base">{displayMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
