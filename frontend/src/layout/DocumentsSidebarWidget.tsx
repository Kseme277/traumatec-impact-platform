import { Link } from "react-router";
import {
  getGuidesEntryUrl,
  GUIDES_ADMIN_HANDOFF_ROUTE,
  isGuidesConfigured,
} from "../config/guides";
import { useTipAuth } from "../context/TipAuthContext";
import { useTranslation } from "../i18n/useTranslation";
import { DocsIcon, FileIcon } from "../icons";

export default function DocumentsSidebarWidget() {
  const { t } = useTranslation();
  const { isAdmin, hasRole } = useTipAuth();

  return (
    <div
      data-tour="guides-widget"
      className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-brand-500/5 px-4 py-5 text-center dark:bg-brand-500/10"
    >
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">{t("guides.title")}</h3>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">{t("guides.desc")}</p>
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
      <DocumentsQuickLinks isAdmin={isAdmin} hasRole={hasRole} />
    </div>
  );
}

export function DocumentsQuickLinks({
  isAdmin,
  hasRole,
}: {
  isAdmin: boolean;
  hasRole: (role: "administrateur" | "support_administratif" | "controle_procedure" | "validateur") => boolean;
}) {
  const { t } = useTranslation();
  const showTemplates = isAdmin;
  const showGeneration = isAdmin || hasRole("support_administratif");

  if (!showTemplates && !showGeneration) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {showTemplates ? (
        <Link
          to="/documents/templates"
          className="inline-flex items-center gap-2 text-xs text-brand-500 hover:underline"
        >
          <DocsIcon className="size-4" />
          {t("nav.templates")}
        </Link>
      ) : null}
      {showGeneration ? (
        <Link
          to="/documents/generation"
          className="inline-flex items-center gap-2 text-xs text-brand-500 hover:underline"
        >
          <FileIcon className="size-4" />
          {t("nav.generation")}
        </Link>
      ) : null}
    </div>
  );
}
