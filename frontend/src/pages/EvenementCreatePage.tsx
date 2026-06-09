import { useNavigate } from "react-router";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import EvenementForm from "../features/events/EvenementForm";
import { useEvents } from "../features/events/useEvents";
import { useTranslation } from "../i18n/useTranslation";
import type { EvenementPayload } from "../features/events/types";

export default function EvenementCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { create, isSubmitting } = useEvents();

  const handleSubmit = async (payload: EvenementPayload) => {
    const event = await create(payload);
    if (event) {
      navigate(`/evenements/${event.id}`);
    }
  };

  return (
    <>
      <PageMeta title={`${t("events.newEvent")} | TIP`} description={t("events.createEventDesc")} />
      <AdminBreadcrumb
        pageTitle={t("events.newEvent")}
        crumbs={[{ label: t("nav.events"), to: "/evenements" }]}
      />
      <ComponentCard title={t("events.createEvent")} desc={t("events.createEventDesc")}>
        <EvenementForm
          isSubmitting={isSubmitting}
          submitLabel={t("events.createSubmit")}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/evenements")}
        />
      </ComponentCard>
    </>
  );
}
