import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import SpinnerLoader from "../components/common/SpinnerLoader";
import EvenementForm from "../features/events/EvenementForm";
import { useEvents } from "../features/events/useEvents";
import { useTranslation } from "../i18n/useTranslation";
import type { Evenement, EvenementPayload } from "../features/events/types";

export default function EvenementEditPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { loadEvent, update, isSubmitting } = useEvents();
  const [event, setEvent] = useState<Evenement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    void loadEvent(id)
      .then(setEvent)
      .catch(() => setEvent(null))
      .finally(() => setIsLoading(false));
  }, [id, loadEvent]);

  const handleSubmit = async (payload: EvenementPayload) => {
    if (!id) return;
    const updated = await update(id, payload);
    if (updated) {
      navigate(`/evenements/${id}`);
    }
  };

  if (isLoading) {
    return <SpinnerLoader message={t("common.loading")} className="min-h-[50vh]" />;
  }

  if (!event) {
    return null;
  }

  return (
    <>
      <PageMeta title={`${t("common.edit")} — ${event.title}`} description={t("events.editEventDesc")} />
      <AdminBreadcrumb
        pageTitle={t("events.editEvent")}
        crumbs={[
          { label: t("nav.events"), to: "/evenements" },
          { label: event.title, to: `/evenements/${event.id}` },
        ]}
      />
      <ComponentCard title={t("events.editEvent")} desc={t("events.editEventDesc")}>
        <EvenementForm
          initial={event}
          isSubmitting={isSubmitting}
          submitLabel={t("events.saveChanges")}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/evenements/${event.id}`)}
        />
      </ComponentCard>
    </>
  );
}
