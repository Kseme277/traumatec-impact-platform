import { useState } from "react";
import PageMeta from "../components/common/PageMeta";
import MlCorrelationCharts from "../features/analytics/MlCorrelationCharts";
import PredictiveGauges from "../features/analytics/PredictiveGauges";
import { useTranslation } from "../i18n/useTranslation";

export default function PredictionsPage() {
  const { t } = useTranslation();
  const [selectedEventId, setSelectedEventId] = useState("");

  return (
    <>
      <PageMeta title={t("analytics.pageTitle")} description={t("analytics.pageDesc")} />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">{t("analytics.pageHeading")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("analytics.pageDesc")}</p>
      </div>
      <div className="space-y-8">
        <PredictiveGauges selectedEventId={selectedEventId} onSelectedEventIdChange={setSelectedEventId} />
        <MlCorrelationCharts
          highlightEventId={selectedEventId || undefined}
          onSelectEvent={setSelectedEventId}
        />
      </div>
    </>
  );
}
