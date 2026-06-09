import { getGuidesEntryUrl, isGuidesConfigured } from "../config/guides";
import { useTranslation } from "../i18n/useTranslation";

export default function GuidesSidebarWidget() {
  const { t } = useTranslation();

  if (!isGuidesConfigured()) {
    return (
      <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-slate-50 px-4 py-5 text-center dark:bg-white/[0.03]">
        <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{t("guides.title")}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("guides.notConfigured")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-brand-500/5 px-4 py-5 text-center dark:bg-brand-500/10">
      <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{t("guides.title")}</h3>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{t("guides.sidebarDesc")}</p>
      <a
        href={getGuidesEntryUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center rounded-lg bg-brand-500 p-3 text-sm font-medium text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      >
        {t("guides.openShort")}
      </a>
    </div>
  );
}
