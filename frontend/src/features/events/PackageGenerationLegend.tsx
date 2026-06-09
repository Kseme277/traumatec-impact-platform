import { useTranslation } from "../../i18n/useTranslation";
import { PACKAGE_GENERATION_LEAD_MONTHS } from "./packageGenerationUrgency";

export default function PackageGenerationLegend() {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-error-100 bg-error-50/50 px-4 py-3 text-xs text-gray-600 dark:border-error-500/20 dark:bg-error-500/5 dark:text-gray-300">
      <span className="inline-flex items-center gap-2">
        <span
          className="size-3 shrink-0 rounded-sm bg-error-100 ring-2 ring-error-400 dark:bg-error-500/25 dark:ring-error-400"
          aria-hidden
        />
        <span>
          {t("events.packageDueLegend").replace("{months}", String(PACKAGE_GENERATION_LEAD_MONTHS))}
        </span>
      </span>
    </div>
  );
}
