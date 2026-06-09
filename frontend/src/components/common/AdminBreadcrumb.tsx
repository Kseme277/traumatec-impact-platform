import { Link } from "react-router";
import { useTranslation } from "../../i18n/useTranslation";

type Crumb = {
  label: string;
  to?: string;
};

interface AdminBreadcrumbProps {
  pageTitle: string;
  crumbs?: Crumb[];
}

function truncateBreadcrumbLabel(label: string, max = 42): string {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

export default function AdminBreadcrumb({ pageTitle, crumbs = [] }: AdminBreadcrumbProps) {
  const { t } = useTranslation();
  const shortTitle = truncateBreadcrumbLabel(pageTitle);

  return (
    <div className="mb-6 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <h1 className="min-w-0 max-w-full break-words text-xl font-semibold leading-snug text-gray-800 dark:text-white/90">
        {pageTitle}
      </h1>
      <nav aria-label={t("common.breadcrumb")} className="shrink-0">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
            >
              {t("nav.home")}
            </Link>
          </li>
          {crumbs.map((crumb) => (
            <li key={crumb.label} className="inline-flex min-w-0 items-center gap-1.5">
              <span className="text-sm text-gray-400" aria-hidden="true">
                /
              </span>
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="truncate text-sm text-gray-500 transition hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate text-sm text-gray-800 dark:text-white/90">{crumb.label}</span>
              )}
            </li>
          ))}
          <li className="inline-flex min-w-0 max-w-[14rem] items-center gap-1.5 sm:max-w-xs">
            <span className="text-sm text-gray-400" aria-hidden="true">
              /
            </span>
            <span
              className="truncate text-sm font-medium text-gray-800 dark:text-white/90"
              title={pageTitle}
            >
              {shortTitle}
            </span>
          </li>
        </ol>
      </nav>
    </div>
  );
}
