import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useTranslation } from "../../i18n/useTranslation";
import type { PackageTemplate } from "./types";

interface ReplacementField {
  sample?: string;
  context_key?: string;
  strategy?: string;
  section_kind?: string;
}

function readReplacementFields(template: PackageTemplate | null): ReplacementField[] {
  if (!template?.placeholders) return [];
  const raw = template.placeholders.replacement_fields;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is ReplacementField => typeof item === "object" && item !== null);
}

interface TemplateFileFieldsPanelProps {
  template: PackageTemplate | null;
}

export default function TemplateFileFieldsPanel({ template }: TemplateFileFieldsPanelProps) {
  const { t } = useTranslation();
  const fields = readReplacementFields(template);
  const classifier = template?.placeholders?.field_analysis_classifier;
  const sectionCount = template?.placeholders?.section_count;

  if (!template) return null;

  return (
    <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-900/30">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
          {t("documents.fileFieldsTitle")}
        </p>
        {typeof classifier === "string" && (
          <Badge color="light" size="sm">{String(classifier)}</Badge>
        )}
        {typeof sectionCount === "number" && (
          <Badge color="info" size="sm">
            {sectionCount} {t("documents.fileFieldsSections")}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("documents.fileFieldsDesc")}</p>

      {fields.length === 0 ? (
        <p className="mt-2 text-xs text-gray-500">{t("documents.fileFieldsEmpty")}</p>
      ) : (
        <div className="mt-3 max-h-48 overflow-auto rounded-lg border border-gray-100 dark:border-gray-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="px-2 py-1.5 text-[11px]">{t("documents.fileFieldsSample")}</TableCell>
                <TableCell isHeader className="px-2 py-1.5 text-[11px]">{t("documents.fileFieldsKey")}</TableCell>
                <TableCell isHeader className="px-2 py-1.5 text-[11px]">{t("documents.fileFieldsStrategy")}</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.slice(0, 24).map((field, index) => (
                <TableRow key={`${field.sample}-${index}`}>
                  <TableCell className="max-w-[180px] truncate px-2 py-1.5 text-xs" title={field.sample}>
                    {field.sample ?? "—"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-xs font-medium text-brand-700 dark:text-brand-300">
                    {field.context_key ?? "—"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-xs text-gray-500">
                    {field.strategy === "keep" ? t("documents.fileFieldsKeep") : t("documents.fileFieldsReplace")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
