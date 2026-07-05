import { useTranslation } from "../../i18n/useTranslation";

export default function ImportFlowDiagram() {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">{t("imports.flowTitle")}</h4>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">{t("imports.flowDesc")}</p>
      <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs leading-relaxed text-gray-700 dark:bg-gray-900 dark:text-gray-300">
{`flowchart TB
  subgraph templates [Templates documentaires]
    A[Cours / Séminaire / Faculty] --> B[Type ex. OP_C]
    B --> C[Version ZIP active]
    C --> D[Fichiers Word/Excel]
  end

  subgraph events [Import événements]
    E1[Télécharger tip-import-evenements.xlsx] --> E2[Remplir Projects.xlsx]
    E2 --> E3[Importer plan annuel]
    E3 --> E4[Événements TIP]
  end

  subgraph participants [Import certificats]
    P1[Télécharger tip-import-participants-certificats.xlsx] --> P2[Remplir participants]
    P2 --> P3[Importer sur événement]
    P3 --> P4[Génération certificats]
  end

  E4 --> P3
  D --> P4`}
      </pre>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-3 dark:border-brand-500/20 dark:bg-brand-500/5">
          <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">1. {t("imports.flowStepTemplates")}</p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{t("imports.flowStepTemplatesDesc")}</p>
        </div>
        <div className="rounded-lg border border-sky-100 bg-sky-50/50 p-3 dark:border-sky-500/20 dark:bg-sky-500/5">
          <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">2. {t("imports.flowStepEvents")}</p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{t("imports.flowStepEventsDesc")}</p>
        </div>
        <div className="rounded-lg border border-success-100 bg-success-50/50 p-3 dark:border-success-500/20 dark:bg-success-500/5">
          <p className="text-xs font-semibold text-success-700 dark:text-success-300">3. {t("imports.flowStepParticipants")}</p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{t("imports.flowStepParticipantsDesc")}</p>
        </div>
      </div>
    </div>
  );
}
