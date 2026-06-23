import { ApiError, parseApiDetail } from "./client";
import { getApiToken } from "../lib/clerkToken";
import type {
  PackageBundle,
  PackageImportJobStart,
  PackageImportProgress,
  PackageUploadResult,
  Parcours,
  PackageTemplate,
  TemplateEditorConfig,
  TemplateUploadResult,
} from "../features/documents/types";
import type { useAuth } from "@clerk/clerk-react";

type GetTokenFn = ReturnType<typeof useAuth>["getToken"];

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
const FETCH_TIMEOUT_MS = 15_000;
const BOOTSTRAP_TIMEOUT_MS = 600_000;
const PACKAGE_UPLOAD_TIMEOUT_MS = 120_000;
const PACKAGE_IMPORT_POLL_INTERVAL_MS = 800;

function withTimeout(ms = FETCH_TIMEOUT_MS, signal?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), ms);
  if (signal) {
    signal.addEventListener("abort", () => {
      window.clearTimeout(timeout);
      controller.abort();
    });
  }
  controller.signal.addEventListener(
    "abort",
    () => window.clearTimeout(timeout),
    { once: true },
  );
  return controller.signal;
}

export function fetchParcours(token: string | null) {
  return fetchJson<Parcours[]>("/v1/parcours/", token);
}

export function fetchPackageTypes(token: string | null) {
  return fetchJson<import("../features/documents/eventPackageTypes").EventPackageTypeCatalog>(
    "/v1/packages/types",
    token,
  );
}

export function fetchTemplates(
  token: string | null,
  options?: { theme?: string; packageType?: string; bundleId?: string },
) {
  const params = new URLSearchParams();
  if (options?.theme) params.set("theme", options.theme);
  if (options?.packageType) params.set("package_type", options.packageType);
  if (options?.bundleId) params.set("bundle_id", options.bundleId);
  const q = params.toString() ? `?${params}` : "";
  return fetchJson<PackageTemplate[]>(`/v1/templates${q}`, token);
}

export function fetchTemplateEditorConfig(
  token: string | null,
  templateId: string,
  mode: "view" | "edit" = "view",
) {
  const q = `?mode=${mode}`;
  return fetchJson<TemplateEditorConfig>(`/v1/templates/${templateId}/editor-config${q}`, token);
}

export function fetchPackageBundles(token: string | null, packageType?: string) {
  const q = packageType ? `?package_type=${encodeURIComponent(packageType)}` : "";
  return fetchJson<PackageBundle[]>(`/v1/packages/bundles${q}`, token);
}

async function startPackageZipUpload(
  token: string | null,
  file: File,
  options?: { packageType?: string; notes?: string; activate?: boolean },
): Promise<PackageImportJobStart> {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.packageType) formData.append("package_type", options.packageType);
  if (options?.notes) formData.append("notes", options.notes);
  formData.append("activate", String(options?.activate ?? true));

  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}/v1/packages/upload`, {
    method: "POST",
    headers,
    body: formData,
    signal: withTimeout(PACKAGE_UPLOAD_TIMEOUT_MS),
  });

  if (!response.ok) {
    let detail = "Import ZIP impossible";
    try {
      detail = parseApiDetail(await response.json(), detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }
  return response.json() as Promise<PackageImportJobStart>;
}

export async function fetchPackageImportProgress(jobId: string): Promise<PackageImportProgress> {
  const response = await fetch(`${API_BASE}/v1/packages/import-jobs/${jobId}`);

  if (!response.ok) {
    let detail = "Suivi d'import impossible";
    try {
      detail = parseApiDetail(await response.json(), detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }
  return response.json() as Promise<PackageImportProgress>;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function uploadPackageZip(
  token: string | null,
  file: File,
  options?: {
    packageType?: string;
    notes?: string;
    activate?: boolean;
    onProgress?: (progress: PackageImportProgress) => void;
  },
): Promise<PackageUploadResult> {
  options?.onProgress?.({
    job_id: "",
    status: "pending",
    phase: "upload",
    processed: 0,
    total: 0,
    percent: 0,
    message: "Envoi du fichier ZIP…",
    filename: file.name,
    current_file: null,
    use_ai: true,
    result: null,
    error: null,
  });

  const start = await startPackageZipUpload(token, file, options);

  for (;;) {
    const progress = await fetchPackageImportProgress(start.job_id);
    options?.onProgress?.(progress);

    if (progress.status === "completed" && progress.result) {
      return progress.result;
    }

    if (progress.status === "failed") {
      throw new ApiError(progress.error ?? progress.message ?? "Import ZIP impossible", 500);
    }

    await wait(PACKAGE_IMPORT_POLL_INTERVAL_MS);
  }
}

export async function bootstrapSystemPackages(
  token: string | null,
  force = false,
): Promise<{ imported: number; message: string }> {
  const headers = new Headers();
  headers.set("Content-Type", "application/x-www-form-urlencoded");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}/v1/packages/bootstrap`, {
    method: "POST",
    headers,
    body: new URLSearchParams({ force: String(force) }),
    signal: withTimeout(BOOTSTRAP_TIMEOUT_MS),
  });

  if (!response.ok) {
    let detail = "Import système impossible";
    try {
      detail = parseApiDetail(await response.json(), detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }
  return response.json() as Promise<{ imported: number; message: string }>;
}

export async function downloadPackageTypeZip(
  getToken: GetTokenFn,
  packageType: string,
  fallbackName: string,
): Promise<void> {
  const token = await getApiToken(getToken);
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(
    `${API_BASE}/v1/packages/types/${encodeURIComponent(packageType)}/download`,
    { headers, signal: withTimeout() },
  );
  if (!response.ok) {
    let detail = "Téléchargement ZIP impossible";
    try {
      detail = parseApiDetail(await response.json(), detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? fallbackName;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadPackageBundleZip(
  getToken: GetTokenFn,
  bundleId: string,
  fallbackName: string,
): Promise<void> {
  const token = await getApiToken(getToken);
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}/v1/packages/bundles/${bundleId}/download`, {
    headers,
    signal: withTimeout(),
  });
  if (!response.ok) {
    let detail = "Téléchargement ZIP impossible";
    try {
      detail = parseApiDetail(await response.json(), detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? fallbackName;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function activatePackageBundle(token: string | null, bundleId: string) {
  return fetchJson<PackageBundle>(`/v1/packages/bundles/${bundleId}/activate`, token, {
    method: "POST",
  });
}

export async function deletePackageBundle(token: string | null, bundleId: string): Promise<void> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}/v1/packages/bundles/${bundleId}`, {
    method: "DELETE",
    headers,
  });
  if (!response.ok) {
    let detail = "Suppression impossible";
    try {
      detail = parseApiDetail(await response.json(), detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }
}

export async function deleteTemplate(token: string | null, templateId: string): Promise<void> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}/v1/templates/${templateId}`, {
    method: "DELETE",
    headers,
  });
  if (!response.ok) {
    let detail = "Suppression impossible";
    try {
      detail = parseApiDetail(await response.json(), detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }
}

export async function downloadTemplate(
  getToken: GetTokenFn,
  templateId: string,
): Promise<{ blob: Blob; filename: string }> {
  const token = await getApiToken(getToken);
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}/v1/templates/${templateId}/download`, { headers });
  if (!response.ok) {
    let detail = "Téléchargement impossible";
    try {
      detail = parseApiDetail(await response.json(), detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? "template.docx";
  const blob = await response.blob();
  return { blob, filename };
}

export async function replaceTemplateFile(
  getToken: GetTokenFn,
  templateId: string,
  file: File,
): Promise<TemplateUploadResult> {
  const token = await getApiToken(getToken);
  if (!token) {
    throw new ApiError("Session expirée. Reconnectez-vous.", 401);
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/v1/templates/${templateId}/file`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    let detail = "Mise à jour impossible";
    try {
      detail = parseApiDetail(await response.json(), detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }

  return response.json() as Promise<TemplateUploadResult>;
}

async function fetchJson<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    signal: options.signal ?? withTimeout(),
  });

  if (!response.ok) {
    let detail = "Une erreur est survenue";
    try {
      detail = parseApiDetail(await response.json(), detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }

  return response.json() as Promise<T>;
}
