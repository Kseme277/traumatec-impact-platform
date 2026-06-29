import type { ReactNode } from "react";
import { Link } from "react-router";
import { HANDOFF_THEME } from "./handoff/handoffTheme";

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
    <div
      className="relative mx-auto mb-10 h-0.5 w-full max-w-[400px]"
      style={{ marginTop: "-1.875rem" }}
      aria-hidden
    >
      <div className="absolute inset-0" style={{ background: HANDOFF_THEME.accent }} />
      <div className="handoff-dot absolute top-0 h-0.5 w-1.5" style={{ background: HANDOFF_THEME.bg }} />
      <div
        className="handoff-dot handoff-dot-delay-1 absolute top-0 h-0.5 w-1.5"
        style={{ background: HANDOFF_THEME.bg }}
      />
      <div
        className="handoff-dot handoff-dot-delay-2 absolute top-0 h-0.5 w-1.5"
        style={{ background: HANDOFF_THEME.bg }}
      />
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

/** Page handoff TIP → GuideHub (même gabarit que public/guidehub-handoff.html). */
export function GuideHubHandoffShell({
  title = "Un instant…",
  status,
  error = false,
  manualHref,
  manualLabel = "Cliquez ici.",
  children,
}: GuideHubHandoffShellProps) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-[50px] py-10 text-center font-thin antialiased"
      style={{
        background: HANDOFF_THEME.bg,
        color: HANDOFF_THEME.accent,
        fontFamily: HANDOFF_THEME.font,
      }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@100;400&display=swap"
      />

      <h1
        className="mb-0 text-[3em] font-thin leading-tight"
        style={{ color: HANDOFF_THEME.accent }}
      >
        {error ? "Connexion impossible" : title}
      </h1>

      {!error ? <HandoffSlider /> : null}

      <p
        role="status"
        aria-live="polite"
        className="m-0 max-w-md text-base font-thin leading-relaxed"
        style={{ color: error ? HANDOFF_THEME.error : HANDOFF_THEME.accent }}
      >
        {status}
        {!error && manualHref ? (
          <>
            {" "}
            Pas de redirection ?{" "}
            <a
              href={manualHref}
              className="font-normal underline underline-offset-[3px] hover:opacity-85"
              style={{ color: HANDOFF_THEME.accent }}
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
            className="text-sm font-normal underline underline-offset-[3px] hover:opacity-85"
            style={{ color: HANDOFF_THEME.accent }}
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      ) : null}
    </div>
  );
}
