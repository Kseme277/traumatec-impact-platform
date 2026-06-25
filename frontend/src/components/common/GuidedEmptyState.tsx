import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface GuidedEmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  children?: ReactNode;
  className?: string;
}

export default function GuidedEmptyState({
  icon: Icon,
  title,
  message,
  children,
  className = "",
}: GuidedEmptyStateProps) {
  return (
    <div
      className={`rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center dark:border-gray-700 dark:bg-white/[0.02] ${className}`}
    >
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10">
        <Icon className="size-7 text-brand-500" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 text-base font-medium text-gray-800 dark:text-white/90">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        {message}
      </p>
      {children ? <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{children}</div> : null}
    </div>
  );
}
