import { isGuidesConfigured, openGuides } from "../config/guides";

export default function GuidesSidebarWidget() {
  if (!isGuidesConfigured()) {
    return (
      <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-slate-50 px-4 py-5 text-center dark:bg-white/[0.03]">
        <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Guides procédures</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Définissez VITE_GUIDES_URL dans .env
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-brand-500/5 px-4 py-5 text-center dark:bg-brand-500/10">
      <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Guides procédures</h3>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Procédures métier et modèles AO Alliance
      </p>
      <button
        type="button"
        onClick={openGuides}
        className="flex w-full items-center justify-center rounded-lg bg-brand-500 p-3 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      >
        Ouvrir Guides
      </button>
    </div>
  );
}
