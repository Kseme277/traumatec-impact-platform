import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import SpinnerLoader from "../components/common/SpinnerLoader";
import ModifMotDePasse from "../features/auth/ModifMotDePasse";
import { useTipAuth } from "../context/TipAuthContext";
import { useTranslation } from "../i18n/useTranslation";

export default function ProfilMotDePassePage() {
  const { t } = useTranslation();
  const { tipUser, isLoading } = useTipAuth();

  if (isLoading || !tipUser) {
    return <SpinnerLoader message={t("profile.loadingProfile")} className="min-h-[40vh]" />;
  }

  return (
    <>
      <PageMeta
        title={`${t("profile.passwordPageTitle")} | ${t("common.appName")}`}
        description={t("profile.passwordPageMeta")}
      />
      <PageBreadcrumb pageTitle={t("profile.passwordPageTitle")} />
      <ModifMotDePasse />
    </>
  );
}
