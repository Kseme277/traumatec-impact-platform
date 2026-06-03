import { GUIDES_URL, isGuidesConfigured, openGuides } from "../../config/guides";

export default function GuidesDocCard({ className = "" }: { className?: string }) {
  const configured = isGuidesConfigured();

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Guides procédures
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Consultez les procédures métier AO Alliance et téléchargez les modèles de préparation
            (Op, PBO, IEC).
          </p>
          {configured ? (
            <button
              type="button"
              onClick={openGuides}
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              Ouvrir Guides →
            </button>
          ) : (
            <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
              Configurez <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">VITE_GUIDES_URL</code>{" "}
              dans le fichier .env
            </p>
          )}
          {configured && (
            <p className="mt-2 truncate text-xs text-slate-400">{GUIDES_URL}</p>
          )}
        </div>
      </div>
    </div>
  );
}
