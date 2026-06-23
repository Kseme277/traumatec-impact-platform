import { useTranslation } from "../../i18n/useTranslation";
import { PACKAGE_GENERATION_LEAD_MONTHS } from "./packageGenerationUrgency";

export default function PackageGenerationLegend() {
  const { t } = useTranslation();

  return (
    <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
      {t("events.packageDueLegend").replace("{months}", String(PACKAGE_GENERATION_LEAD_MONTHS))}
    </p>
  );
}
