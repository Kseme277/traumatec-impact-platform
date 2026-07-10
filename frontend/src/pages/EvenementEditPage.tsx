import { useNavigate, useParams } from "react-router";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import SpinnerLoader from "../components/common/SpinnerLoader";
import EvenementForm from "../features/events/EvenementForm";
import { useEvents } from "../features/events/useEvents";
import { useTranslation } from "../i18n/useTranslation";
import type { EvenementPayload } from "../features/events/types";
import { fetchEvent } from "../api/events";
import { useTipSWR } from "../lib/swr";

export default function EvenementEditPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { update, isSubmitting } = useEvents();

  const { data: event, isLoading } = useTipSWR(
    id ? (["event", id] as const) : null,
    (token) => fetchEvent(token, id!),
  );

  const showLoading = isLoading && !event;

  const handleSubmit = async (payload: EvenementPayload) => {
    if (!id) return;
    const updated = await update(id, payload);
    if (updated) {
      navigate(`/evenements/${id}`);
    }
  };

  if (showLoading) {
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
