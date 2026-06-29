import type { ReactNode } from "react";
import { Link } from "react-router";
import { getGuidesProxyAdminUrl } from "../config/guides";

type GuideHubHandoffShellProps = {
  title?: string;
  status: string;
  error?: boolean;
  manualHref?: string;
  manualLabel?: string;
  children?: ReactNode;
};

function HandoffSlider() {
  return (
    <div className="relative mx-auto mb-8 h-0.5 w-full max-w-[400px]" aria-hidden>
      <div className="absolute inset-0 rounded-full bg-brand-500 dark:bg-brand-400" />
      <div className="handoff-dot absolute top-0 h-0.5 w-1.5 rounded-full bg-gray-50 dark:bg-gray-900" />
      <div className="handoff-dot handoff-dot-delay-1 absolute top-0 h-0.5 w-1.5 rounded-full bg-gray-50 dark:bg-gray-900" />
      <div className="handoff-dot handoff-dot-delay-2 absolute top-0 h-0.5 w-1.5 rounded-full bg-gray-50 dark:bg-gray-900" />
      <style>{`
        @keyframes handoff-loading {
          from { left: 0; }
          to { left: 100%; }
        }
        .handoff-dot {
          animation: handoff-loading 2s infinite;
        }
        .handoff-dot-delay-1 {
          animation-delay: 0.5s;
        }
        .handoff-dot-delay-2 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}

/** Page handoff TIP → GuideHub — suit le thème clair/sombre de la plateforme. */
export function GuideHubHandoffShell({
  title = "Un instant…",
  status,
  error = false,
  manualHref,
  manualLabel = "Cliquez ici.",
  children,
}: GuideHubHandoffShellProps) {
  const adminHref = manualHref ?? getGuidesProxyAdminUrl();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-10 text-center font-outfit font-thin antialiased dark:bg-gray-900 sm:px-12">
      <h1 className="mb-0 text-[clamp(2rem,6vw,3rem)] font-thin leading-tight text-brand-500 dark:text-brand-400">
        {error ? "Connexion impossible" : title}
      </h1>

      {!error ? <HandoffSlider /> : null}

      <p
        role="status"
        aria-live="polite"
        className={`m-0 max-w-md text-base font-thin leading-relaxed ${
          error
            ? "text-error-500 dark:text-error-400"
            : "text-gray-600 dark:text-brand-300/90"
        }`}
      >
        {status}
        {!error ? (
          <>
            {" "}
            Pas de redirection ?{" "}
            <a
              href={adminHref}
              className="font-normal text-brand-500 underline underline-offset-[3px] hover:opacity-85 dark:text-brand-400"
            >
              {manualLabel}
            </a>
          </>
        ) : null}
      </p>

      {children ? <div className="mt-8">{children}</div> : null}

      {error ? (
        <div className="mt-8 flex flex-col gap-3">
          <a
            href={adminHref}
            className="text-sm font-normal text-brand-500 underline underline-offset-[3px] hover:opacity-85 dark:text-brand-400"
          >
            Ouvrir l&apos;admin GuideHub
          </a>
          <Link
            to="/dashboard"
            className="text-sm font-normal text-gray-500 underline underline-offset-[3px] hover:opacity-85 dark:text-gray-400"
          >
            Retour au tableau de bord
          </Link>
        </div>
      ) : null}
    </div>
  );
}
