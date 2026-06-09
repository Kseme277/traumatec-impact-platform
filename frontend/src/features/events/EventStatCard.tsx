import type { ReactNode } from "react";

interface EventStatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  iconBgClassName: string;
}

export default function EventStatCard({
  label,
  value,
  icon,
  iconBgClassName,
}: EventStatCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClassName}`}
      >
        {icon}
      </div>
      <div className="mt-5">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <h4 className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</h4>
      </div>
    </div>
  );
}
