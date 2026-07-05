import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { ChevronRight, FileArchive } from "lucide-react";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import AuthLoadingScreen from "../components/auth/AuthLoadingScreen";
import GuidedEmptyState from "../components/common/GuidedEmptyState";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import Button from "../components/ui/button/Button";
import Badge from "../components/ui/badge/Badge";
import GenerationProcessGuide from "../features/documents/GenerationProcessGuide";
import PackageDueEventsPanel from "../features/events/PackageDueEventsPanel";
import { useEvents } from "../features/events/useEvents";
import type { EvenementFilters } from "../features/events/types";
import {
  distinctEventTypeFilterOptions,
  eventMatchesEventTypeFilter,
  eventMatchesSearch,
  formatEventDateRange,
  isGeneratableEvent,
  isUpcomingEvent,
} from "../features/events/eventDates";
import { isEventPackageApproved } from "../features/documents/eventWorkflowUi";
import { needsPackageGenerationHighlight } from "../features/events/packageGenerationUrgency";
import { statusColor, statusLabel } from "../features/events/types";
import { useTranslation } from "../i18n/useTranslation";

export default function DocumentsGenerationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const legacyEventId = searchParams.get("event");
  const { events, isLoading, loadEvents } = useEvents();
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");

  const generationEventFilters = useMemo<EvenementFilters>(
    () => ({ upcoming: true, project_status: "Open" }),
    [],
  );

  useEffect(() => {
    void loadEvents(generationEventFilters);
  }, [generationEventFilters, loadEvents]);

  const selectableEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          isUpcomingEvent(event) &&
          isGeneratableEvent(event) &&
          !isEventPackageApproved(event),
      ),
    [events],
  );

  const filteredEvents = useMemo(() => {
    return selectableEvents.filter(
      (event) =>
        eventMatchesSearch(event, eventSearchQuery) &&
        eventMatchesEventTypeFilter(event, eventTypeFilter),
    );
  }, [eventSearchQuery, eventTypeFilter, selectableEvents]);

  const eventTypeOptions = useMemo(
    () => distinctEventTypeFilterOptions(selectableEvents),
    [selectableEvents],
  );

  const packageDueEvents = useMemo(
    () => events.filter(needsPackageGenerationHighlight),
    [events],
  );

  if (legacyEventId) {
    return <Navigate to={`/documents/generation/${legacyEventId}`} replace />;
  }

  if (isLoading) {
    return <AuthLoadingScreen message={t("documents.loadingReady")} />;
  }

  return (
    <>
      <PageMeta
        title={`${t("documents.generationTitle")} | TIP`}
        description={t("documents.generationMeta")}
      />
      <AdminBreadcrumb
        pageTitle={t("documents.generationTitle")}
        crumbs={[
          { label: t("nav.documents"), to: "/documents/templates" },
          { label: t("nav.templates"), to: "/documents/templates" },
        ]}
      />

      <PackageDueEventsPanel events={packageDueEvents} className="mb-6" />

      <ComponentCard className="mb-6" desc={t("documents.generationListDesc")}>
        <GenerationProcessGuide hasEvent={false} eventReady={false} hasCompletedJob={false} />
      </ComponentCard>

      <ComponentCard title={t("documents.chooseEvent")} desc={t("documents.launchGenerationDesc")}>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("documents.searchEvent")}</Label>
            <Input
              value={eventSearchQuery}
              onChange={(e) => setEventSearchQuery(e.target.value)}
              placeholder={t("documents.searchEventPlaceholder")}
            />
          </div>
          <div>
            <Label>{t("documents.filterEventType")}</Label>
            <Select
              placeholder={t("documents.allEventTypes")}
              options={eventTypeOptions}
              value={eventTypeFilter}
              onChange={setEventTypeFilter}
            />
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <GuidedEmptyState
            icon={FileArchive}
            title={t("documents.noEligible")}
            message={t("ux.noEventsDesc")}
          >
            <Link to="/evenements">
              <Button size="sm" variant="outline">
                {t("documents.eventList")}
              </Button>
            </Link>
          </GuidedEmptyState>
        ) : (
          <ul className="space-y-3">
            {filteredEvents.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  className="group flex w-full items-start justify-between gap-4 rounded-2xl border border-gray-200 p-4 text-left transition-colors hover:border-brand-200 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:border-brand-500/30 dark:hover:bg-white/[0.03]"
                  onClick={() => navigate(`/documents/generation/${event.id}`)}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {event.project_number}
                      </span>
                      <Badge color={statusColor(event.status)} size="sm">
                        {statusLabel(event.status, t)}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-300">{event.title}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formatEventDateRange(event)} · {[event.city, event.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 size-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </ComponentCard>
    </>
  );
}
