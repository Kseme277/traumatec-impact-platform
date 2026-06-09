import TipAnimatedLogo from "../../components/brand/TipAnimatedLogo";
import PageMeta from "../../components/common/PageMeta";
import { useTipAuth } from "../../context/TipAuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import DashboardAdmin from "../../features/dashboard/DashboardAdmin";
import DashboardPreparateur from "../../features/dashboard/DashboardPreparateur";

export default function Home() {
  const { t } = useTranslation();
  const { tipUser, isLoading } = useTipAuth();

  if (isLoading || !tipUser) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <TipAnimatedLogo size="lg" showWordmark showPlatformName showSlogan animate />
        <p className="text-sm text-slate-500">{t("dashboard.loading")}</p>
      </div>
    );
  }

  return (
    <>
      <PageMeta title={t("dashboard.metaTitle")} description={t("dashboard.metaDesc")} />
      {tipUser.role === "administrateur" ? <DashboardAdmin /> : <DashboardPreparateur />}
    </>
  );
}
