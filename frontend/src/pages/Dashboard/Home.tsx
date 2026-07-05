import PageMeta from "../../components/common/PageMeta";
import SpinnerLoader from "../../components/common/SpinnerLoader";
import { useTipAuth } from "../../context/TipAuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import DashboardAdmin from "../../features/dashboard/DashboardAdmin";
import DashboardPreparateur from "../../features/dashboard/DashboardPreparateur";
import {
  DashboardControleProcedure,
  DashboardControleValidateur,
  DashboardSupportAdmin,
  DashboardValidateur,
} from "../../features/dashboard/WorkflowDashboards";

export default function Home() {
  const { t } = useTranslation();
  const { tipUser, isLoading, hasRole } = useTipAuth();

  if (isLoading || !tipUser) {
    return <SpinnerLoader message={t("dashboard.loading")} className="min-h-[50vh]" />;
  }

  let dashboard = <DashboardPreparateur />;
  if (hasRole("administrateur")) {
    dashboard = <DashboardAdmin />;
  } else if (hasRole("validateur") && hasRole("controle_procedure")) {
    dashboard = <DashboardControleValidateur />;
  } else if (hasRole("validateur")) {
    dashboard = <DashboardValidateur />;
  } else if (hasRole("controle_procedure")) {
    dashboard = <DashboardControleProcedure />;
  } else if (hasRole("support_administratif")) {
    dashboard = <DashboardSupportAdmin />;
  }

  return (
    <>
      <PageMeta title={t("dashboard.metaTitle")} description={t("dashboard.metaDesc")} />
      {dashboard}
    </>
  );
}
