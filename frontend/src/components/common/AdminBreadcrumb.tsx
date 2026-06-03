import { Link } from "react-router";

type Crumb = {
  label: string;
  to?: string;
};

interface AdminBreadcrumbProps {
  pageTitle: string;
  crumbs?: Crumb[];
}

export default function AdminBreadcrumb({ pageTitle, crumbs = [] }: AdminBreadcrumbProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{pageTitle}</h2>
      <nav aria-label="Fil d'Ariane">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
            >
              Accueil
            </Link>
          </li>
          {crumbs.map((crumb) => (
            <li key={crumb.label} className="inline-flex items-center gap-1.5">
              <span className="text-sm text-gray-400">/</span>
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="text-sm text-gray-500 transition hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-sm text-gray-800 dark:text-white/90">{crumb.label}</span>
              )}
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5">
            <span className="text-sm text-gray-400">/</span>
            <span className="text-sm text-gray-800 dark:text-white/90">{pageTitle}</span>
          </li>
        </ol>
      </nav>
    </div>
  );
}
