import { useTranslation } from "../../i18n/useTranslation";
import ProjectStatusBadge from "./ProjectStatusBadge";

export default function ProjectStatusLegend() {
  const { t } = useTranslation();

  const items = [
    { status: "Open", desc: t("events.legendOpen") },
    { status: "Closed", desc: t("events.legendClosed") },
    { status: "Cancelled", desc: t("events.legendCancelled") },
  ] as const;

  return (
    <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
      {items.map((item) => (
        <div key={item.status} className="flex items-center gap-2">
          <ProjectStatusBadge projectStatus={item.status} />
          <span className="text-theme-xs text-gray-500 dark:text-gray-400">{item.desc}</span>
        </div>
      ))}
    </div>
  );
}
