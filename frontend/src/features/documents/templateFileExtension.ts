const ONLYOFFICE_WORD_EXTENSIONS = new Set([
  "doc",
  "docx",
  "odt",
  "rtf",
  "txt",
  "docm",
  "dotx",
  "dot",
]);

const ONLYOFFICE_SPREADSHEET_EXTENSIONS = new Set(["xlsx", "xls", "ods", "csv"]);

const ONLYOFFICE_EXTENSIONS = new Set([
  ...ONLYOFFICE_WORD_EXTENSIONS,
  ...ONLYOFFICE_SPREADSHEET_EXTENSIONS,
]);

export function templateFileExtension(filePath: string): string {
  const base = filePath.split("/").pop() ?? filePath;
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function isOnlyofficeEditable(filePath: string): boolean {
  return ONLYOFFICE_EXTENSIONS.has(templateFileExtension(filePath));
}

export function isSpreadsheetFile(filePath: string): boolean {
  return ONLYOFFICE_SPREADSHEET_EXTENSIONS.has(templateFileExtension(filePath));
}
