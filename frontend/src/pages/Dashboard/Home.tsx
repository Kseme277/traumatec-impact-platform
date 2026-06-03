import PageMeta from "../../components/common/PageMeta";
import { useTipAuth } from "../../context/TipAuthContext";
import DashboardAdmin from "../../features/dashboard/DashboardAdmin";
import DashboardPreparateur from "../../features/dashboard/DashboardPreparateur";

export default function Home() {
  const { tipUser, isLoading } = useTipAuth();

  if (isLoading || !tipUser) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="TIP — Traumatec Impact Platform" description="Tableau de bord TIP" />
      {tipUser.role === "administrateur" ? <DashboardAdmin /> : <DashboardPreparateur />}
    </>
  );
}
