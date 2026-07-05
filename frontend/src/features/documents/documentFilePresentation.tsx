import type { LucideIcon } from "lucide-react";
import {
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Presentation,
} from "lucide-react";
import { templateFileExtension } from "./templateFileExtension";

type TranslateFn = (key: string) => string;

const ICON_WRAPPER =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/60";

const ICON_CLASSES: Record<string, string> = {
  document: "text-brand-600 dark:text-brand-400",
  spreadsheet: "text-success-600 dark:text-success-400",
  pdf: "text-error-600 dark:text-error-400",
  presentation: "text-warning-600 dark:text-warning-400",
  image: "text-purple-600 dark:text-purple-400",
  other: "text-gray-500 dark:text-gray-400",
};

function resolveFileKind(ext: string): keyof typeof ICON_CLASSES {
  if (["doc", "docx", "odt", "rtf", "txt", "docm", "dot", "dotx"].includes(ext)) {
    return "document";
  }
  if (["xlsx", "xls", "ods", "csv"].includes(ext)) {
    return "spreadsheet";
  }
  if (ext === "pdf") return "pdf";
  if (["ppt", "pptx", "odp"].includes(ext)) {
    return "presentation";
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
    return "image";
  }
  return "other";
}

function iconForKind(kind: keyof typeof ICON_CLASSES): LucideIcon {
  if (kind === "spreadsheet") return FileSpreadsheet;
  if (kind === "pdf") return FileText;
  if (kind === "presentation") return Presentation;
  if (kind === "image") return FileImage;
  if (kind === "document") return FileText;
  return File;
}

export function fileCategoryFromPath(filePath: string, t: TranslateFn): string {
  const kind = resolveFileKind(templateFileExtension(filePath));
  const key = `documents.fileCategory.${kind}`;
  const translated = t(key);
  return translated === key ? kind : translated;
}

export function formatDocumentFileDate(value: string | null | undefined, localeTag: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(localeTag, { day: "2-digit", month: "short", year: "numeric" });
}

interface FileTypeIconProps {
  filePath: string;
  className?: string;
}

export function FileTypeIcon({ filePath, className = "" }: FileTypeIconProps) {
  const ext = templateFileExtension(filePath);
  const kind = resolveFileKind(ext);
  const Icon = iconForKind(kind);
  return (
    <span className={`${ICON_WRAPPER} ${className}`.trim()}>
      <Icon className={`size-5 ${ICON_CLASSES[kind]}`} aria-hidden />
    </span>
  );
}

interface DocumentFileNameCellProps {
  name: string;
  filePath: string;
  subtitle?: string;
}

export function DocumentFileNameCell({ name, filePath, subtitle }: DocumentFileNameCellProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <FileTypeIcon filePath={filePath} />
      <div className="min-w-0">
        <p className="truncate font-medium text-gray-800 dark:text-white/90" title={name}>
          {name}
        </p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500" title={subtitle}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
