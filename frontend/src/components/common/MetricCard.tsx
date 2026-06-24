import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";

export interface MetricCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  iconBgClassName: string;
  to?: string;
  hint?: string;
  onClick?: () => void;
}

const cardClassName =
  "group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition dark:border-gray-800 dark:bg-white/[0.03] md:p-6";

const interactiveClassName =
  "cursor-pointer hover:border-brand-200 hover:shadow-theme-sm hover:-translate-y-0.5 dark:hover:border-brand-500/30 dark:hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30";

function MetricCardContent({ label, value, icon, iconBgClassName, hint, interactive }: MetricCardProps & { interactive?: boolean }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBgClassName}`}
        >
          {icon}
        </div>
        {interactive ? (
          <ChevronRight
            className="size-5 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-gray-600 dark:group-hover:text-brand-400"
            aria-hidden
          />
        ) : null}
      </div>
      <div className="mt-5 min-w-0">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <h4 className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</h4>
        {hint ? (
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
        ) : null}
      </div>
    </>
  );
}

export default function MetricCard({ label, value, icon, iconBgClassName, to, hint, onClick }: MetricCardProps) {
  const interactive = Boolean(to || onClick);

  if (to) {
    return (
      <Link to={to} className={`${cardClassName} ${interactiveClassName}`} aria-label={`${label}: ${value}`}>
        <MetricCardContent
          label={label}
          value={value}
          icon={icon}
          iconBgClassName={iconBgClassName}
          hint={hint ?? undefined}
          interactive
        />
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${cardClassName} ${interactiveClassName} w-full text-left`}
        aria-label={`${label}: ${value}`}
      >
        <MetricCardContent
          label={label}
          value={value}
          icon={icon}
          iconBgClassName={iconBgClassName}
          hint={hint}
          interactive
        />
      </button>
    );
  }

  return (
    <div className={cardClassName}>
      <MetricCardContent label={label} value={value} icon={icon} iconBgClassName={iconBgClassName} hint={hint} />
    </div>
  );
}
