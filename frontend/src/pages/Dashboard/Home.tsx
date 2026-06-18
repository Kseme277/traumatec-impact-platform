import TipSplashLoader from "../../components/brand/TipSplashLoader";
import PageMeta from "../../components/common/PageMeta";
import { useTipAuth } from "../../context/TipAuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import DashboardAdmin from "../../features/dashboard/DashboardAdmin";
import DashboardPreparateur from "../../features/dashboard/DashboardPreparateur";

export default function Home() {
  const { t } = useTranslation();
  const { tipUser, isLoading } = useTipAuth();

  if (isLoading || !tipUser) {
    return <TipSplashLoader message={t("dashboard.loading")} variant="fullscreen" />;
  }

  return (
    <>
      <PageMeta title={t("dashboard.metaTitle")} description={t("dashboard.metaDesc")} />
      {tipUser.role === "administrateur" ? <DashboardAdmin /> : <DashboardPreparateur />}
    </>
  );
}
