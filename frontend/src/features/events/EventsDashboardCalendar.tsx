import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg, EventContentArg } from "@fullcalendar/core";
import { useTranslation } from "../../i18n/useTranslation";
import ComponentCard from "../../components/common/ComponentCard";
import TableLoader from "../../components/common/TableLoader";
import type { DashboardEventStats } from "./types";
import { isEventOpen } from "./projectStatus";
import {
  filterCalendarForYear,
  filterCalendarStartingInRange,
  getCurrentCalendarYear,
  getMonthBounds,
  toCalendarMonthEvent,
} from "./eventDates";
import EventTypeCalendarLegend from "./EventTypeCalendarLegend";

interface EventsDashboardCalendarProps {
  calendar: DashboardEventStats["calendar"];
  calendarYear?: number;
  isLoading?: boolean;
}

function resolveVisibleRange(arg: DatesSetArg): { start: string; end: string } {
  return getMonthBounds(arg.view.currentStart);
}

function renderCalendarEventContent(eventInfo: EventContentArg) {
  const tone = String(eventInfo.event.extendedProps.calendar ?? "Primary");
  const colorClass = `fc-bg-${tone.toLowerCase()}`;
  return (
    <div className={`event-fc-color flex fc-event-main ${colorClass} rounded-sm`}>
      <div className="fc-daygrid-event-dot" />
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
}

export default function EventsDashboardCalendar({
  calendar,
  calendarYear = getCurrentCalendarYear(),
  isLoading = false,
}: EventsDashboardCalendarProps) {
  const navigate = useNavigate();
  const { t, localeTag } = useTranslation();

  const initialDate =
    calendarYear === getCurrentCalendarYear()
      ? new Date().toISOString().slice(0, 10)
      : `${calendarYear}-01-01`;

  const [visibleRange, setVisibleRange] = useState(() =>
    getMonthBounds(new Date(`${initialDate}T12:00:00`)),
  );

  const openYearEvents = useMemo(
    () =>
      filterCalendarForYear(calendar, calendarYear).filter((item) =>
        isEventOpen(item.project_status),
      ),
    [calendar, calendarYear],
  );

  const periodEvents = useMemo(
    () => filterCalendarStartingInRange(openYearEvents, visibleRange.start, visibleRange.end),
    [openYearEvents, visibleRange],
  );

  const calendarEvents = useMemo(
    () => periodEvents.map(toCalendarMonthEvent),
    [periodEvents],
  );

  const handleDatesSet = (arg: DatesSetArg) => {
    const next = resolveVisibleRange(arg);
    setVisibleRange((prev) =>
      prev.start === next.start && prev.end === next.end ? prev : next,
    );
  };

  const handleEventClick = (info: EventClickArg) => {
    navigate(`/evenements/${info.event.id}`);
  };

  const yearRange = {
    start: `${calendarYear}-01-01`,
    end: `${calendarYear + 1}-01-01`,
  };

  const periodLabel = new Date(`${visibleRange.start}T12:00:00`).toLocaleDateString(localeTag, {
    month: "long",
    year: "numeric",
  });

  if (isLoading) {
    return (
      <ComponentCard
        title={`${t("events.calendar")} ${calendarYear}`}
        desc={t("events.calendarLoadingDesc")}
      >
        <TableLoader message={t("events.calendarLoading")} />
      </ComponentCard>
    );
  }

  return (
    <ComponentCard
      title={`${t("events.calendar")} ${calendarYear}`}
      desc={`${t("events.calendarStartDayHint")} — ${periodLabel} (${periodEvents.length})`}
    >
      <EventTypeCalendarLegend className="mb-4" />
      <div className="custom-calendar events-calendar">
        <FullCalendar
          eventContent={renderCalendarEventContent}
          plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate={initialDate}
          validRange={yearRange}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,listMonth",
          }}
          buttonText={{
            today: t("events.calendarToday"),
            month: t("events.calendarMonth"),
            list: t("events.calendarList"),
          }}
          views={{
            listMonth: {
              type: "list",
              duration: { months: 1 },
              buttonText: t("events.calendarList"),
              noEventsContent: t("events.calendarNoEvents"),
            },
          }}
          locale={localeTag.startsWith("en") ? "en-gb" : "fr"}
          height="auto"
          datesSet={handleDatesSet}
          events={calendarEvents}
          eventClick={handleEventClick}
          dayMaxEvents={3}
          moreLinkClick="popover"
          displayEventTime={false}
          eventDisplay="block"
        />
      </div>
    </ComponentCard>
  );
}
