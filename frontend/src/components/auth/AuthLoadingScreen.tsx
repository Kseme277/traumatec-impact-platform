import GridShape from "../common/GridShape";
import PageMeta from "../common/PageMeta";
import { useTranslation } from "../../i18n/useTranslation";

interface AuthLoadingScreenProps {
  message?: string;
}

export default function AuthLoadingScreen({ message }: AuthLoadingScreenProps) {
  const { t } = useTranslation();
  const displayMessage = message ?? t("auth.loadingWorkspace");

  return (
    <>
      <PageMeta
        title={`${t("auth.loadingPage")} | ${t("common.appName")}`}
        description={t("auth.loadingPage")}
      />
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 z-1">
        <GridShape />
        <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
          <div
            className="mb-6 size-12 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500"
            role="status"
            aria-label={t("auth.loadingPage")}
          />
          <p className="text-sm text-gray-600 dark:text-gray-400 sm:text-base">{displayMessage}</p>
        </div>
      </div>
    </>
  );
}
