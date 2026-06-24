import {
  getGuidesEntryUrl,
  GUIDES_ADMIN_HANDOFF_ROUTE,
  isGuidesConfigured,
} from "../config/guides";
import { useTipAuth } from "../context/TipAuthContext";
import { useTranslation } from "../i18n/useTranslation";

export default function DocumentsSidebarWidget() {
  const { t } = useTranslation();
  const { isAdmin } = useTipAuth();

  return (
    <div
      data-tour="guides-widget"
      className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-brand-500/5 px-4 py-5 text-center dark:bg-brand-500/10"
    >
      <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">{t("guides.title")}</h3>
      {isGuidesConfigured() ? (
        <div className="flex flex-col gap-2">
          <a
            href={getGuidesEntryUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center rounded-lg bg-brand-500 p-3 text-sm font-medium text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            {t("guides.open")}
          </a>
          {isAdmin ? (
            <a
              href={GUIDES_ADMIN_HANDOFF_ROUTE}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center rounded-lg border border-brand-500/40 bg-white p-3 text-sm font-medium text-brand-600 transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:bg-gray-900 dark:text-brand-400 dark:hover:bg-brand-500/10"
            >
              {t("guides.adminOpen")}
            </a>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("guides.notConfigured")}</p>
      )}
    </div>
  );
}
