import { Link } from "react-router";
import Button from "../../components/ui/button/Button";
import { getGuidesEntryUrl, isGuidesConfigured } from "../../config/guides";
import { useTranslation } from "../../i18n/useTranslation";
import { DocsIcon, FileIcon } from "../../icons";

export default function DocumentsModuleCard({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const guidesConfigured = isGuidesConfigured();

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15">
          <DocsIcon className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            {t("documents.moduleTitle")}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("documents.moduleDesc")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {guidesConfigured ? (
              <a
                href={getGuidesEntryUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                {t("guides.open")}
              </a>
            ) : null}
            <Link to="/documents/templates">
              <Button size="sm" variant={guidesConfigured ? "outline" : "primary"}>
                {t("documents.templatesTip")}
              </Button>
            </Link>
            <Link to="/documents/generation">
              <Button size="sm" variant="outline">
                <FileIcon className="mr-2 size-4" />
                {t("documents.generationTip")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
