import type { ReactNode } from "react";
import { Link } from "react-router";

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
    <div className="relative mx-auto mb-10 h-0.5 w-full max-w-[400px]" aria-hidden>
      <div className="absolute inset-0 bg-[#4a8df8]" />
      <div className="handoff-dot absolute top-0 h-0.5 w-1.5 bg-[#222]" />
      <div className="handoff-dot handoff-dot-delay-1 absolute top-0 h-0.5 w-1.5 bg-[#222]" />
      <div className="handoff-dot handoff-dot-delay-2 absolute top-0 h-0.5 w-1.5 bg-[#222]" />
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

/**
 * Page handoff TIP → GuideHub (même gabarit que public/guidehub-handoff.html).
 */
export function GuideHubHandoffShell({
  title = "Un instant…",
  status,
  error = false,
  manualHref,
  manualLabel = "Cliquez ici.",
  children,
}: GuideHubHandoffShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#222] px-6 py-10 text-center font-[Raleway,system-ui,sans-serif] font-thin text-[#4a8df8] antialiased">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Raleway:wght@100;400&display=swap"
      />

      <p className="mb-6 text-xs font-normal uppercase tracking-[0.2em] opacity-70">
        GuideHub · Traumatec
      </p>

      <h1 className="mb-10 text-[clamp(2rem,6vw,3rem)] font-thin leading-tight text-[#4a8df8]">
        {error ? "Connexion impossible" : title}
      </h1>

      {!error ? <HandoffSlider /> : null}

      <p
        role="status"
        aria-live="polite"
        className={`m-0 max-w-md text-base font-thin leading-relaxed ${
          error ? "text-[#f97066]" : "text-[#4a8df8]"
        }`}
      >
        {status}
        {!error && manualHref ? (
          <>
            {" "}
            Pas de redirection ?{" "}
            <a
              href={manualHref}
              className="font-normal text-[#4a8df8] underline underline-offset-[3px] hover:opacity-85"
            >
              {manualLabel}
            </a>
          </>
        ) : null}
      </p>

      {children ? <div className="mt-8">{children}</div> : null}

      {error ? (
        <div className="mt-8">
          <Link
            to="/dashboard"
            className="text-sm font-normal text-[#4a8df8] underline underline-offset-[3px] hover:opacity-85"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      ) : null}
    </div>
  );
}
