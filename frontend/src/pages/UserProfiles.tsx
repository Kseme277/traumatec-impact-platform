import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import AuthLoadingScreen from "../components/auth/AuthLoadingScreen";
import { useTipAuth } from "../context/TipAuthContext";
import { useTranslation } from "../i18n/useTranslation";
import MonProfilForm from "../features/profile/MonProfilForm";

export default function UserProfiles() {
  const { t } = useTranslation();
  const { tipUser, isLoading } = useTipAuth();

  if (isLoading || !tipUser) {
    return <AuthLoadingScreen message={t("profile.loadingProfile")} />;
  }

  return (
    <>
      <PageMeta
        title={`${t("profile.title")} | ${t("common.appName")}`}
        description={t("profile.identityDesc")}
      />
      <PageBreadcrumb pageTitle={t("profile.title")} />
      <MonProfilForm />
    </>
  );
}
