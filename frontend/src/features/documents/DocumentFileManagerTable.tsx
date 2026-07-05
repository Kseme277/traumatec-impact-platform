import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useTranslation } from "../../i18n/useTranslation";
import {
  DocumentFileNameCell,
  fileCategoryFromPath,
  formatDocumentFileDate,
} from "./documentFilePresentation";
import { templateFileExtension } from "./templateFileExtension";

export interface DocumentFileManagerRow {
  id: string;
  name: string;
  filePath: string;
  subtitle?: string;
  category?: string;
  modifiedAt?: string | null;
  isActive?: boolean;
}

interface DocumentFileManagerTableProps {
  rows: DocumentFileManagerRow[];
  renderActions?: (row: DocumentFileManagerRow) => ReactNode;
  emptyMessage?: string;
  minWidthClass?: string;
}

export default function DocumentFileManagerTable({
  rows,
  renderActions,
  emptyMessage,
  minWidthClass = "min-w-[760px]",
}: DocumentFileManagerTableProps) {
  const { t, locale } = useTranslation();
  const localeTag = locale.startsWith("en") ? "en-GB" : "fr-FR";
  const hasActions = Boolean(renderActions);

  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
        {emptyMessage ?? t("documents.fileTableEmpty")}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table className={`${minWidthClass} w-full`}>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
              {t("documents.fileTable.fileName")}
            </TableCell>
            <TableCell
              isHeader
              className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
            >
              {t("documents.fileTable.category")}
            </TableCell>
            <TableCell
              isHeader
              className="hidden px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 sm:table-cell"
            >
              {t("documents.fileTable.format")}
            </TableCell>
            <TableCell
              isHeader
              className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
            >
              {t("documents.fileTable.modified")}
            </TableCell>
            {hasActions ? (
              <TableCell
                isHeader
                className="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {t("documents.fileTable.action")}
              </TableCell>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={
                row.isActive
                  ? "bg-brand-50/60 dark:bg-brand-500/10"
                  : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
              }
            >
              <TableCell className="px-5 py-4 text-start sm:px-6">
                <DocumentFileNameCell
                  name={row.name}
                  filePath={row.filePath}
                  subtitle={row.subtitle}
                />
              </TableCell>
              <TableCell className="px-4 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                {row.category ?? fileCategoryFromPath(row.filePath, t)}
              </TableCell>
              <TableCell className="hidden px-4 py-4 text-start text-theme-sm uppercase text-gray-500 dark:text-gray-400 sm:table-cell">
                {templateFileExtension(row.filePath) || "—"}
              </TableCell>
              <TableCell className="px-4 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                {formatDocumentFileDate(row.modifiedAt, localeTag)}
              </TableCell>
              {hasActions ? (
                <TableCell className="px-4 py-4 text-end align-middle">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {renderActions?.(row)}
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
