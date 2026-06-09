import type { ReactNode } from "react";
import TipAnimatedLogo from "./brand/TipAnimatedLogo";

type GuideHubHandoffShellProps = {
  title: string;
  lead: string;
  status: string;
  error?: boolean;
  children?: ReactNode;
};

/**
 * Même gabarit visuel que public/guidehub-handoff.html (Outfit, panneau brand, status-box).
 */
export function GuideHubHandoffShell({
  title,
  lead,
  status,
  error = false,
  children,
}: GuideHubHandoffShellProps) {
  return (
    <div className="guidehub-handoff-root flex min-h-screen bg-white font-[Outfit,system-ui,sans-serif] text-gray-800 antialiased">
      <div className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-600">
            GuideHub
          </div>
          <h1 className="mb-2 text-3xl font-semibold leading-tight text-gray-900">{title}</h1>
          <p className="mb-7 text-[0.9375rem] leading-relaxed text-gray-500">{lead}</p>

          <div
            className={`rounded-2xl border px-6 py-5 ${
              error
                ? "border-[#fecdca] bg-error-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-3.5">
              {!error ? (
                <TipAnimatedLogo size="xs" iconOnly animate className="shrink-0" />
              ) : null}
              <p
                role="status"
                aria-live="polite"
                className={`m-0 text-[0.9375rem] leading-relaxed ${
                  error ? "text-[#b42318]" : "text-gray-700"
                }`}
              >
                {status}
              </p>
            </div>
          </div>

          {children}
        </div>
      </div>

      <aside
        className="relative hidden flex-1 items-center justify-center overflow-hidden bg-brand-950 lg:flex"
        aria-hidden
      >
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(circle at center, black, transparent 75%)",
          }}
        />
        <div className="relative z-10 max-w-xs px-8 text-center">
          <div className="mx-auto mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-brand-500 shadow-[0_10px_30px_rgba(70,95,255,0.35)]">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
              <rect x="4" y="3" width="3.5" height="18" rx="1.5" fill="white" />
              <rect x="10" y="8" width="3.5" height="13" rx="1.5" fill="white" opacity="0.9" />
              <rect x="16" y="5" width="3.5" height="16" rx="1.5" fill="white" opacity="0.7" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-semibold text-white">Traumatec</h2>
          <p className="m-0 text-sm leading-relaxed text-white/60">
            Guides procédures AO Alliance et administration entreprise.
          </p>
        </div>
      </aside>
    </div>
  );
}
