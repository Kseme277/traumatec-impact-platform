import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import AuthLoadingScreen from "../components/auth/AuthLoadingScreen";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import GenerationEventsTable from "../features/documents/GenerationEventsTable";
import GenerationProcessGuide from "../features/documents/GenerationProcessGuide";
import PackageDueEventsPanel from "../features/events/PackageDueEventsPanel";
import { useEvents } from "../features/events/useEvents";
import type { EvenementFilters } from "../features/events/types";
import {
  distinctEventTypeFilterOptions,
  eventMatchesEventTypeFilter,
  eventMatchesSearch,
  isGeneratableEvent,
  isUpcomingEvent,
} from "../features/events/eventDates";
import { isEventPackageApproved } from "../features/documents/eventWorkflowUi";
import { needsPackageGenerationHighlight } from "../features/events/packageGenerationUrgency";
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

        <GenerationEventsTable
          events={filteredEvents}
          onOpen={(eventId) => navigate(`/documents/generation/${eventId}`)}
        />
      </ComponentCard>
    </>
  );
}
