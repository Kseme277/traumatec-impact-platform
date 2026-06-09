import Button from "../ui/button/Button";
import { useTranslation } from "../../i18n/useTranslation";

interface DataTablePaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
}

export default function DataTablePagination({
  page,
  totalPages,
  totalItems,
  rangeStart,
  rangeEnd,
  onPageChange,
}: DataTablePaginationProps) {
  const { t } = useTranslation();

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-4 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("pagination.showing")}{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {rangeStart}–{rangeEnd}
        </span>{" "}
        {t("pagination.of")}{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">{totalItems}</span>{" "}
        {totalItems > 1 ? t("pagination.entriesPlural") : t("pagination.entries")}
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t("common.previous")}
        </Button>
        <span className="min-w-[4.5rem] text-center text-sm text-gray-600 dark:text-gray-300">
          {page} / {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("common.next")}
        </Button>
      </div>
    </div>
  );
}
