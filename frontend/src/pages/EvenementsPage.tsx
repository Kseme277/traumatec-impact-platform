import PageMeta from "../components/common/PageMeta";

export default function EvenementsPage() {
  return (
    <>
      <PageMeta title="Événements | TIP" description="Liste des événements — Sprint 1" />
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Événements</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Module disponible au Sprint 1 — import Projects.xlsx et fiche événement.
        </p>
      </div>
    </>
  );
}
