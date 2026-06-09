import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import AuthLoadingScreen from "../components/auth/AuthLoadingScreen";
import ModifMotDePasse from "../features/auth/ModifMotDePasse";
import { useTipAuth } from "../context/TipAuthContext";
import { useTranslation } from "../i18n/useTranslation";

export default function ProfilMotDePassePage() {
  const { t } = useTranslation();
  const { tipUser, isLoading } = useTipAuth();

  if (isLoading || !tipUser) {
    return <AuthLoadingScreen message={t("profile.loadingProfile")} />;
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
