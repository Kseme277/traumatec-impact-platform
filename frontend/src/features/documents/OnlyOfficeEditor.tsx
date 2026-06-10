import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";

export interface OnlyOfficeEditorConfig {
  document_server_url: string;
  config: Record<string, unknown>;
}

interface OnlyOfficeEditorProps {
  editorConfig: OnlyOfficeEditorConfig | null;
  className?: string;
  onDocumentSaved?: () => void;
  /** Ouvre directement en plein écran (aperçu certificats — évite iframe 0×0). */
  autoFullscreen?: boolean;
  onClose?: () => void;
}

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (
        id: string,
        config: Record<string, unknown>,
      ) => { destroyEditor?: () => void };
    };
  }
}

const SCRIPT_ID = "onlyoffice-docs-api";
const MIN_CONTAINER_PX = 280;

function computeEditorHeight(fullscreen: boolean): number {
  return fullscreen ? Math.max(480, window.innerHeight - 56) : Math.max(720, window.innerHeight - 200);
}

function loadOnlyOfficeScript(documentServerUrl: string, t: (key: string) => string): Promise<void> {
  const src = `${documentServerUrl.replace(/\/$/, "")}/web-apps/apps/api/documents/api.js`;
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing && existing.src === src) {
    return Promise.resolve();
  }
  if (existing) {
    existing.remove();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(t("documents.onlyofficeScriptFailed")));
    document.body.appendChild(script);
  });
}

function documentMountKey(editorConfig: OnlyOfficeEditorConfig): string {
  const doc = editorConfig.config.document as { key?: string; url?: string } | undefined;
  return doc?.key ?? doc?.url ?? editorConfig.document_server_url;
}

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export default function OnlyOfficeEditor({
  editorConfig,
  className = "",
  onDocumentSaved,
  autoFullscreen = false,
  onClose,
}: OnlyOfficeEditorProps) {
  const { t } = useTranslation();
  const reactId = useId().replace(/:/g, "");
  const mountId = `onlyoffice-${reactId}`;
  const shellRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<{ destroyEditor?: () => void } | null>(null);
  const onDocumentSavedRef = useRef(onDocumentSaved);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editorHeight, setEditorHeight] = useState(() => computeEditorHeight(false));
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const syncHeight = useCallback(() => {
    setEditorHeight(computeEditorHeight(isFullscreen));
  }, [isFullscreen]);

  useEffect(() => {
    onDocumentSavedRef.current = onDocumentSaved;
  }, [onDocumentSaved]);

  useEffect(() => {
    if (editorConfig && autoFullscreen) {
      setIsFullscreen(true);
    }
  }, [editorConfig, autoFullscreen]);

  useEffect(() => {
    syncHeight();
    window.addEventListener("resize", syncHeight);
    return () => window.removeEventListener("resize", syncHeight);
  }, [syncHeight]);

  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const updateSize = () => {
      const rect = shell.getBoundingClientRect();
      setContainerSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [editorConfig, isFullscreen]);

  const containerReady =
    isFullscreen ||
    (containerSize.width >= MIN_CONTAINER_PX && containerSize.height >= MIN_CONTAINER_PX);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    if (!editorConfig || !containerReady) {
      editorRef.current?.destroyEditor?.();
      editorRef.current = null;
      if (!editorConfig) {
        shell.replaceChildren();
        setError(null);
        setLoading(false);
      }
      return;
    }

    let cancelled = false;
    const mountKey = documentMountKey(editorConfig);
    setLoading(true);
    setError(null);

    let mountEl: HTMLDivElement | null = null;

    void (async () => {
      try {
        await loadOnlyOfficeScript(editorConfig.document_server_url, t);
        await waitForNextFrame();
        if (cancelled || !window.DocsAPI || !shellRef.current) {
          return;
        }

        editorRef.current?.destroyEditor?.();
        editorRef.current = null;
        shellRef.current.replaceChildren();

        const heightPx = `${editorHeight}px`;

        mountEl = document.createElement("div");
        mountEl.id = mountId;
        mountEl.dataset.onlyofficeKey = mountKey;
        mountEl.style.height = heightPx;
        mountEl.style.minHeight = heightPx;
        mountEl.style.width = "100%";
        mountEl.className =
          "w-full rounded-lg border border-gray-200 dark:border-gray-700";
        shellRef.current.appendChild(mountEl);

        const config = {
          ...editorConfig.config,
          height: heightPx,
          width: "100%",
          events: {
            onAppReady: () => {
              if (!cancelled) setLoading(false);
            },
            onDocumentReady: () => {
              if (!cancelled) setLoading(false);
            },
            onDocumentStateChange: (event: { data?: boolean }) => {
              if (event.data === false) {
                onDocumentSavedRef.current?.();
              }
            },
            onError: (event: { data?: { errorDescription?: string } }) => {
              const detail = event.data?.errorDescription ?? t("documents.onlyofficeError");
              setError(detail);
              setLoading(false);
            },
          },
        };

        editorRef.current = new window.DocsAPI.DocEditor(mountId, config);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("documents.onlyofficeUnavailable"));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      editorRef.current?.destroyEditor?.();
      editorRef.current = null;
      mountEl?.remove();
      shell.replaceChildren();
    };
  }, [editorConfig, editorHeight, mountId, t, containerReady, containerSize.width]);

  if (!editorConfig) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-500 dark:text-gray-400">{t("documents.onlyofficeSelect")}</span>
      </div>
    );
  }

  const shellClass = isFullscreen
    ? "fixed inset-0 z-[100000] flex flex-col bg-white p-3 dark:bg-gray-900"
    : `flex w-full flex-col gap-3 ${className}`;

  return (
    <div className={shellClass}>
      <div className="flex items-center justify-end gap-2">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {t("documents.closeEditor")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {isFullscreen ? t("documents.onlyofficeExitFullscreen") : t("documents.onlyofficeFullscreen")}
        </button>
      </div>

      {error ? (
        <div
          className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
          role="alert"
        >
          <p className="font-medium">{error}</p>
          <p className="mt-1 text-theme-xs text-error-600/90 dark:text-error-400/90">
            {t("documents.onlyofficeCheck")} ({editorConfig.document_server_url}).
          </p>
        </div>
      ) : null}

      <div
        className="relative w-full flex-1"
        style={{ minHeight: editorHeight }}
      >
        {loading || !containerReady ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-900/50"
            role="status"
            aria-live="polite"
          >
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {!containerReady
                ? t("documents.onlyofficeLayoutWait")
                : t("documents.onlyofficeEditorLoading")}
            </span>
          </div>
        ) : null}
        <div
          ref={shellRef}
          className="h-full w-full"
          style={{ minHeight: editorHeight }}
        />
      </div>
    </div>
  );
}
