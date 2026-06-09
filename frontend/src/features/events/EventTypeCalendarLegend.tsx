import { useTranslation } from "../../i18n/useTranslation";
import { eventTypeCalendarLegend } from "./eventTypeColors";

interface EventTypeCalendarLegendProps {
  className?: string;
}

export default function EventTypeCalendarLegend({ className = "" }: EventTypeCalendarLegendProps) {
  const { t } = useTranslation();
  const items = eventTypeCalendarLegend();

  return (
    <div
      className={`flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02] ${className}`}
    >
      <span className="w-full text-theme-xs font-medium text-gray-600 dark:text-gray-400">
        {t("events.calendarTypeLegend")}
      </span>
      {items.map((item) => (
        <div key={item.type} className="flex items-center gap-2">
          <span
            className={`event-fc-color fc-bg-${item.tone.toLowerCase()} inline-flex items-center gap-2 rounded-sm px-2 py-1`}
          >
            <span className="fc-daygrid-event-dot" />
            <span className="text-theme-xs text-gray-700">{item.type}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
