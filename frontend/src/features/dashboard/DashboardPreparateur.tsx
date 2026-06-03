import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { useTipAuth } from "../../context/TipAuthContext";
import GuidesDocCard from "./GuidesDocCard";
import { roleLabel } from "../auth/types";

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function DashboardPreparateur() {
  const { tipUser } = useTipAuth();

  return (
    <>
      <PageMeta title="Tableau de bord | TIP" description="Traumatec Impact Platform — Processing Team" />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Bonjour, {tipUser?.prenom}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Espace {roleLabel("preparateur")} — préparez vos paquets documentaires
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6 mb-6">
        <MetricCard label="Événements" value="—" hint="Sprint 1 — import Excel" />
        <MetricCard label="Prêts à générer" value="—" hint="Certificats + participants" />
        <MetricCard label="Générations (7 j)" value="—" hint="Historique DocGen" />
        <MetricCard label="En cours" value="—" hint="Jobs actifs" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Actions rapides</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/evenements"
                className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Voir les événements
              </Link>
            </div>
          </div>
        </div>
        <GuidesDocCard />
      </div>
    </>
  );
}
