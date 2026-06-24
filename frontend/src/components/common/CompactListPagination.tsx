import Button from "../ui/button/Button";
import { useTranslation } from "../../i18n/useTranslation";

interface CompactListPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
}

export default function CompactListPagination({
  page,
  totalPages,
  totalItems,
  rangeStart,
  rangeEnd,
  onPageChange,
}: CompactListPaginationProps) {
  const { t } = useTranslation();

  if (totalItems === 0 || totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-white/5">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {rangeStart}–{rangeEnd}
        </span>{" "}
        / {totalItems}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="!px-2.5 !py-1.5 text-xs"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t("common.previous")}
        </Button>
        <span className="min-w-[2.75rem] text-center text-xs text-gray-600 dark:text-gray-300">
          {page}/{totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="!px-2.5 !py-1.5 text-xs"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("common.next")}
        </Button>
      </div>
    </div>
  );
}
