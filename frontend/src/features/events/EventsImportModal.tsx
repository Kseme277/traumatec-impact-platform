import { Modal } from "../../components/ui/modal";
import Button from "../../components/ui/button/Button";
import { useTranslation } from "../../i18n/useTranslation";
import EventsImportDropzone from "./EventsImportDropzone";
import type { ImportJobProgress } from "./types";

interface EventsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSubmitting?: boolean;
  importProgress?: ImportJobProgress | null;
  onImport: (file: File) => Promise<void>;
}

const EXCEL_COLUMNS = [
  "Title",
  "Activity",
  "Project number",
  "Start date",
  "End date",
  "Status",
    "Responsible person",
    "Organizer responsible",
    "Organizer email",
  "Location",
  "Country",
  "Region",
  "Cost center",
  "Participants (expected nb)",
  "Participants (real nb)",
  "Amount (CHF)",
  "Payments done (CHF)",
  "% paid",
  "Balance to pay (CHF)",
];

export default function EventsImportModal({
  isOpen,
  onClose,
  isSubmitting = false,
  importProgress = null,
  onImport,
}: EventsImportModalProps) {
  const { t } = useTranslation();

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="m-4 w-full max-w-[640px]"
      showCloseButton={!isSubmitting}
    >
      <div className="p-6 sm:p-8">
        <header className="mb-6 pr-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">
            {t("events.importModalTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {t("events.importModalDesc")}
          </p>
        </header>

        <EventsImportDropzone
          isSubmitting={isSubmitting}
          importProgress={importProgress}
          onImport={onImport}
        />

        <section
          className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]"
          aria-label={t("events.importColumns")}
        >
          <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("events.importColumns")}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {EXCEL_COLUMNS.map((column) => (
              <li
                key={column}
                className="rounded-lg bg-white px-2.5 py-1 text-theme-xs text-gray-700 shadow-theme-xs dark:bg-gray-900 dark:text-gray-300"
              >
                {column}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-theme-xs text-gray-500 dark:text-gray-500">
            {t("events.importColumnsExtra")}
          </p>
        </section>

        <footer className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? t("common.importing") : t("common.close")}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
