import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import SpinnerLoader from "../components/common/SpinnerLoader";
import { useTipAuth } from "../context/TipAuthContext";
import { useTranslation } from "../i18n/useTranslation";
import MonProfilForm from "../features/profile/MonProfilForm";

export default function UserProfiles() {
  const { t } = useTranslation();
  const { tipUser, isLoading } = useTipAuth();

  if (isLoading || !tipUser) {
    return <SpinnerLoader message={t("profile.loadingProfile")} className="min-h-[40vh]" />;
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
