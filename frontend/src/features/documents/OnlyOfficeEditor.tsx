import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { confirmAction } from "../../lib/swal";

export interface OnlyOfficeEditorConfig {
  document_server_url: string;
  config: Record<string, unknown>;
  file_revision?: number;
}

interface OnlyOfficeEditorProps {
  editorConfig: OnlyOfficeEditorConfig | null;
  className?: string;
  onDocumentSaved?: () => void;
  /** Ouvre directement en plein écran (aperçu certificats — évite iframe 0×0). */
  autoFullscreen?: boolean;
  onClose?: () => void;
  /** Enregistrement explicite via bouton (pas d'autosave / pas de rechargement intempestif). */
  manualSave?: boolean;
  /** Révision courante du fichier (incrémentée côté serveur après enregistrement). */
  fileRevision?: number;
  /** Interroge le serveur jusqu'à détection d'une nouvelle révision (forcesave). */
  pollFileRevision?: () => Promise<number>;
  /** Enregistrement via command service backend (fiable pour les .doc). */
  onBackendForceSave?: () => Promise<{
    no_changes?: boolean;
    error?: number;
    saved?: boolean;
    timeout?: boolean;
    revision?: number;
  }>;
}

interface DocEditorInstance {
  destroyEditor?: () => void;
  serviceCommand?: (command: string, data?: string) => void;
}

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (id: string, config: Record<string, unknown>) => DocEditorInstance;
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
  manualSave = false,
  fileRevision = 0,
  pollFileRevision,
  onBackendForceSave,
}: OnlyOfficeEditorProps) {
  const { t } = useTranslation();
  const reactId = useId().replace(/:/g, "");
  const mountId = `onlyoffice-${reactId}`;
  const shellRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<DocEditorInstance | null>(null);
  const onDocumentSavedRef = useRef(onDocumentSaved);
  const savePendingRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const savePollRef = useRef<number | null>(null);
  const fileRevisionRef = useRef(fileRevision);
  const pollFileRevisionRef = useRef(pollFileRevision);
  const onBackendForceSaveRef = useRef(onBackendForceSave);
  const isDirtyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(autoFullscreen);
  const [editorHeight, setEditorHeight] = useState(() => computeEditorHeight(autoFullscreen));
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDirty, setIsDirty] = useState(false);
  const [savePending, setSavePending] = useState(false);

  const syncHeight = useCallback(() => {
    setEditorHeight(computeEditorHeight(isFullscreen));
  }, [isFullscreen]);

  useEffect(() => {
    onDocumentSavedRef.current = onDocumentSaved;
  }, [onDocumentSaved]);

  useEffect(() => {
    fileRevisionRef.current = editorConfig?.file_revision ?? fileRevision;
  }, [editorConfig, fileRevision]);

  useEffect(() => {
    pollFileRevisionRef.current = pollFileRevision;
  }, [pollFileRevision]);

  useEffect(() => {
    onBackendForceSaveRef.current = onBackendForceSave;
  }, [onBackendForceSave]);

  useEffect(() => {
    savePendingRef.current = savePending;
  }, [savePending]);

  const clearSavePoll = useCallback(() => {
    if (savePollRef.current !== null) {
      window.clearInterval(savePollRef.current);
      savePollRef.current = null;
    }
  }, []);

  const clearSaveTimeout = useCallback(() => {
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  const finishSave = useCallback(
    (success: boolean) => {
      if (!savePendingRef.current) return;
      clearSaveTimeout();
      clearSavePoll();
      savePendingRef.current = false;
      setSavePending(false);
      if (success) {
        setIsDirty(false);
        onDocumentSavedRef.current?.();
      } else {
        setError(t("documents.saveFailed"));
      }
    },
    [clearSavePoll, clearSaveTimeout, t],
  );

  const startSavePoll = useCallback(() => {
    const poll = pollFileRevisionRef.current;
    if (!poll) return;
    clearSavePoll();
    const baseline = fileRevisionRef.current;
    savePollRef.current = window.setInterval(() => {
      if (!savePendingRef.current) {
        clearSavePoll();
        return;
      }
      void poll()
        .then((revision) => {
          if (savePendingRef.current && revision > baseline) {
            finishSave(true);
          }
        })
        .catch(() => {
          /* ignore transient poll errors */
        });
    }, 1500);
  }, [clearSavePoll, finishSave]);

  const startSaveTimeout = useCallback(() => {
    clearSaveTimeout();
    saveTimeoutRef.current = window.setTimeout(() => {
      if (!savePendingRef.current) return;
      clearSaveTimeout();
      savePendingRef.current = false;
      setSavePending(false);
      setError(t("documents.saveTimeout"));
    }, 60000);
  }, [clearSaveTimeout, t]);

  useLayoutEffect(() => {
    if (editorConfig && autoFullscreen) {
      setIsFullscreen(true);
      setEditorHeight(computeEditorHeight(true));
    }
  }, [editorConfig, autoFullscreen]);

  useEffect(() => {
    if (!editorConfig) {
      setIsDirty(false);
      setSavePending(false);
    }
  }, [editorConfig]);

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
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const handleManualSave = useCallback(() => {
    if (savePendingRef.current) return;
    if (!onBackendForceSaveRef.current && !editorRef.current?.serviceCommand) return;
    setError(null);
    savePendingRef.current = true;
    setSavePending(true);
    startSaveTimeout();
    startSavePoll();
    editorRef.current?.serviceCommand("forcesave", "");

    void (async () => {
      const backendSave = onBackendForceSaveRef.current;
      if (!backendSave) return;
      try {
        const result = await backendSave();
        if (result.no_changes || result.error === 4) {
          finishSave(!isDirtyRef.current);
          return;
        }
        if (result.saved) {
          if (typeof result.revision === "number") {
            fileRevisionRef.current = result.revision;
          }
          finishSave(true);
          return;
        }
        if (result.timeout) {
          finishSave(false);
          return;
        }
        if (result.error !== undefined && result.error !== 0) {
          finishSave(false);
          return;
        }
      } catch {
        finishSave(false);
      }
    })();
  }, [finishSave, startSavePoll, startSaveTimeout]);

  const handleCancel = useCallback(async () => {
    if (isDirty) {
      const result = await confirmAction({
        title: t("documents.discardChangesTitle"),
        text: t("documents.discardChangesDesc"),
        confirmText: t("documents.cancelEditing"),
        cancelText: t("common.back"),
        icon: "warning",
      });
      if (!result.isConfirmed) return;
    }
    onClose?.();
  }, [isDirty, onClose, t]);

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
    setIsDirty(false);
    setSavePending(false);

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
        mountEl.style.width = isFullscreen ? `${window.innerWidth}px` : "100%";
        mountEl.className =
          "w-full rounded-lg border border-gray-200 dark:border-gray-700";
        shellRef.current.appendChild(mountEl);

        if (isFullscreen) {
          window.dispatchEvent(new Event("resize"));
        }

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
              if (cancelled) return;
              const dirty = event.data === true;
              setIsDirty(dirty);

              if (manualSave) {
                return;
              }

              if (!dirty) {
                onDocumentSavedRef.current?.();
              }
            },
            onRequestSaveResult: (event: { data?: boolean }) => {
              if (cancelled || !manualSave || !savePendingRef.current) return;
              if (event.data === true) {
                finishSave(true);
              }
            },
            onError: (event: { data?: { errorDescription?: string } }) => {
              const detail = event.data?.errorDescription ?? t("documents.onlyofficeError");
              clearSaveTimeout();
              clearSavePoll();
              setError(detail);
              setLoading(false);
              savePendingRef.current = false;
              setSavePending(false);
            },
          },
        };

        editorRef.current = new window.DocsAPI.DocEditor(mountId, config);

        if (isFullscreen) {
          window.setTimeout(() => {
            if (!cancelled) {
              window.dispatchEvent(new Event("resize"));
              setLoading(false);
            }
          }, 120);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("documents.onlyofficeUnavailable"));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearSaveTimeout();
      clearSavePoll();
      editorRef.current?.destroyEditor?.();
      editorRef.current = null;
      mountEl?.remove();
      shell.replaceChildren();
    };
  }, [
    editorConfig,
    editorHeight,
    isFullscreen,
    manualSave,
    mountId,
    t,
    containerReady,
    clearSavePoll,
    clearSaveTimeout,
    finishSave,
  ]);

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
      <div className="flex flex-wrap items-center justify-end gap-2">
        {manualSave ? (
          <>
            <button
              type="button"
              onClick={() => void handleCancel()}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {t("documents.cancelEditing")}
            </button>
            <button
              type="button"
              onClick={handleManualSave}
              disabled={!isDirty || savePending || loading}
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savePending ? t("documents.savingDocument") : t("documents.saveDocument")}
            </button>
          </>
        ) : onClose ? (
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
