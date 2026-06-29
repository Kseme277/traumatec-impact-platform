import { useAuth } from "@clerk/clerk-react";
import { Loader2, Send, Sparkles } from "lucide-react";
import ChatTypingDots from "./ChatTypingDots";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { assistantChat } from "../../api/assistant";
import { SEARCH_ENTRIES } from "../../config/searchIndex";
import { useCommandAssistant } from "../../context/CommandAssistantContext";
import { useTutorial } from "../../context/TutorialContext";
import { useTipAuth } from "../../context/TipAuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import { buildAssistantHelpText, getAssistantExampleCommands } from "../../lib/assistantExamples";
import AssistantMessageBody from "./AssistantMessageBody";
import { getApiToken } from "../../lib/clerkToken";
import { parseCommand, resolveNavigatePath } from "../../lib/commandParser";
import {
  listUpcomingEvents,
  runAnalyzeBudgetCommand,
  runAuditExportCommand,
  runCloseEventCommand,
  runCreateUserCommand,
  runGeneratePackageCommand,
  runResendInvitationCommand,
  runStorageGcCommand,
  runToggleUserCommand,
  searchEventsForCommand,
  searchUsersForCommand,
} from "../../lib/commandActions";
import type { Evenement } from "../../features/events/types";
import type { Utilisateur } from "../../features/auth/types";

type MessageRole = "user" | "assistant";

interface AssistantMessage {
  id: string;
  role: MessageRole;
  text: string;
  tone?: "default" | "success" | "error" | "pending";
  typing?: boolean;
}

type PendingIntentType =
  | "generate_package"
  | "analyze_budget"
  | "block_user"
  | "unblock_user"
  | "close_event"
  | "resend_invitation";

interface PendingChoice<T> {
  kind: "event" | "user";
  items: T[];
  intentType: PendingIntentType;
}

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isMacPlatform() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

export default function CommandAssistant() {
  const { isOpen, close, open, consumeSeedMessage } = useCommandAssistant();
  const { startTutorial } = useTutorial();
  const { getToken } = useAuth();
  const { isAdmin } = useTipAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<PendingChoice<Evenement | Utilisateur> | null>(null);
  const seedSubmitRef = useRef<string | null>(null);

  const appendMessage = useCallback((message: Omit<AssistantMessage, "id">) => {
    setMessages((prev) => [...prev, { ...message, id: nextId() }]);
  }, []);

  const updateLastAssistant = useCallback((text: string, tone: AssistantMessage["tone"] = "default") => {
    setMessages((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i -= 1) {
        if (copy[i].role === "assistant" && copy[i].tone === "pending") {
          copy[i] = { ...copy[i], text, tone, typing: false };
          return copy;
        }
      }
      copy.push({ id: nextId(), role: "assistant", text, tone });
      return copy;
    });
  }, []);

  const showHelp = useCallback(() => {
    appendMessage({
      role: "assistant",
      text: buildAssistantHelpText(t, { isAdmin }),
    });
  }, [appendMessage, isAdmin, t]);

  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      seedSubmitRef.current = null;
      return;
    }
    setInput("");
    setPendingChoice(null);
    const seed = consumeSeedMessage();
    setMessages([{ id: nextId(), role: "assistant", text: t("assistant.welcome") }]);
    if (seed) {
      seedSubmitRef.current = seed;
    }
  }, [consumeSeedMessage, isOpen, t]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isRunning, pendingChoice]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        if (isOpen) close();
        else open();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close, isOpen, open]);

  const executeGenerate = useCallback(
    async (event: Evenement) => {
      appendMessage({ role: "assistant", text: t("assistant.generating"), tone: "pending" });
      const result = await runGeneratePackageCommand(getToken, event, (progress) => {
        updateLastAssistant(progress, "pending");
      });
      updateLastAssistant(result.message, result.success ? "success" : "error");
      if (result.detail) {
        appendMessage({ role: "assistant", text: result.detail, tone: result.success ? "success" : "error" });
      }
      if (result.success) {
        navigate(`/documents/generation?event=${event.id}`);
      }
    },
    [appendMessage, getToken, navigate, t, updateLastAssistant],
  );

  const executeToggleUser = useCallback(
    async (user: Utilisateur, intentType: "block_user" | "unblock_user") => {
      appendMessage({ role: "assistant", text: t("assistant.processing"), tone: "pending" });
      const result = await runToggleUserCommand(getToken, user, { type: intentType, userQuery: "" });
      updateLastAssistant(result.message, result.success ? "success" : "error");
      if (result.detail) {
        appendMessage({ role: "assistant", text: result.detail, tone: result.success ? "success" : "error" });
      }
    },
    [appendMessage, getToken, t, updateLastAssistant],
  );

  const executeCloseEvent = useCallback(
    async (event: Evenement) => {
      appendMessage({ role: "assistant", text: t("assistant.processing"), tone: "pending" });
      const result = await runCloseEventCommand(getToken, event);
      updateLastAssistant(result.message, result.success ? "success" : "error");
      if (result.detail) {
        appendMessage({ role: "assistant", text: result.detail, tone: result.success ? "success" : "error" });
      }
    },
    [appendMessage, getToken, t, updateLastAssistant],
  );

  const executeAnalyzeBudget = useCallback(
    async (event: Evenement) => {
      appendMessage({ role: "assistant", text: t("assistant.processing"), tone: "pending" });
      const result = await runAnalyzeBudgetCommand(getToken, event);
      updateLastAssistant(result.message, result.success ? "success" : "error");
      if (result.detail) {
        appendMessage({ role: "assistant", text: result.detail, tone: result.success ? "success" : "error" });
      }
    },
    [appendMessage, getToken, t, updateLastAssistant],
  );

  const executeResendInvitation = useCallback(
    async (user: Utilisateur) => {
      appendMessage({ role: "assistant", text: t("assistant.processing"), tone: "pending" });
      const result = await runResendInvitationCommand(getToken, user);
      updateLastAssistant(result.message, result.success ? "success" : "error");
      if (result.detail) {
        appendMessage({ role: "assistant", text: result.detail, tone: result.success ? "success" : "error" });
      }
    },
    [appendMessage, getToken, t, updateLastAssistant],
  );

  const pickEvent = useCallback(
    async (events: Evenement[], intentType: "generate_package" | "close_event" | "analyze_budget", query: string) => {
      if (events.length === 0) {
        appendMessage({
          role: "assistant",
          text: t("assistant.noEvent").replace("{query}", query),
          tone: "error",
        });
        return;
      }
      if (events.length === 1) {
        if (intentType === "generate_package") await executeGenerate(events[0]);
        else if (intentType === "analyze_budget") await executeAnalyzeBudget(events[0]);
        else await executeCloseEvent(events[0]);
        return;
      }
      setPendingChoice({ kind: "event", items: events, intentType });
      appendMessage({ role: "assistant", text: t("assistant.pickEvent") });
    },
    [appendMessage, executeAnalyzeBudget, executeCloseEvent, executeGenerate, t],
  );

  const pickUser = useCallback(
    async (users: Utilisateur[], intentType: PendingIntentType, query: string) => {
      if (users.length === 0) {
        appendMessage({
          role: "assistant",
          text: t("assistant.noUser").replace("{query}", query),
          tone: "error",
        });
        return;
      }
      if (users.length === 1) {
        if (intentType === "block_user" || intentType === "unblock_user") {
          await executeToggleUser(users[0], intentType);
        } else if (intentType === "resend_invitation") {
          await executeResendInvitation(users[0]);
        }
        return;
      }
      setPendingChoice({ kind: "user", items: users, intentType });
      appendMessage({ role: "assistant", text: t("assistant.pickUser") });
    },
    [appendMessage, executeResendInvitation, executeToggleUser, t],
  );

  const askAi = useCallback(
    async (text: string, priorMessages: AssistantMessage[]) => {
      appendMessage({ role: "assistant", text: "", tone: "pending", typing: true });
      try {
        const token = await getApiToken(getToken);
        const history = priorMessages
          .filter((message) => message.tone !== "pending")
          .map((message) => ({ role: message.role, content: message.text }));
        const response = await assistantChat(token, text, history);
        updateLastAssistant(response.reply, "default");
      } catch {
        updateLastAssistant(t("assistant.aiError"), "error");
      }
    },
    [appendMessage, getToken, t, updateLastAssistant],
  );

  const handleSubmit = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || isRunning) return;

      setInput("");
      setPendingChoice(null);
      appendMessage({ role: "user", text });

      const intent = parseCommand(text);

      if (intent.type === "help") {
        showHelp();
        return;
      }

      if (intent.type === "start_tutorial") {
        close();
        window.setTimeout(() => startTutorial(), 200);
        return;
      }

      if (intent.type === "unknown") {
        setIsRunning(true);
        try {
          await askAi(text, messages);
        } finally {
          setIsRunning(false);
        }
        return;
      }

      setIsRunning(true);
      try {
        if (intent.type === "list_events") {
          appendMessage({ role: "assistant", text: t("assistant.processing"), tone: "pending" });
          const result = await listUpcomingEvents(getToken);
          updateLastAssistant(result.message, result.success ? "success" : "error");
          if (result.detail) {
            appendMessage({ role: "assistant", text: result.detail, tone: "success" });
          }
          return;
        }

        if (intent.type === "navigate") {
          const target = resolveNavigatePath(intent.label, SEARCH_ENTRIES, isAdmin);
          if (!target) {
            appendMessage({
              role: "assistant",
              text: t("assistant.noPage").replace("{query}", intent.label),
              tone: "error",
            });
            return;
          }
          appendMessage({
            role: "assistant",
            text: t("assistant.navigating").replace("{page}", target.label),
            tone: "success",
          });
          close();
          navigate(target.path);
          return;
        }

        if (intent.type === "generate_package") {
          const events = await searchEventsForCommand(getToken, intent.eventQuery);
          await pickEvent(events, "generate_package", intent.eventQuery);
          return;
        }

        if (intent.type === "close_event") {
          const events = await searchEventsForCommand(getToken, intent.eventQuery);
          await pickEvent(events, "close_event", intent.eventQuery);
          return;
        }

        if (intent.type === "analyze_budget") {
          const events = await searchEventsForCommand(getToken, intent.eventQuery);
          await pickEvent(events, "analyze_budget", intent.eventQuery);
          return;
        }

        if (intent.type === "create_user") {
          if (!isAdmin) {
            appendMessage({ role: "assistant", text: t("assistant.adminOnly"), tone: "error" });
            return;
          }
          appendMessage({ role: "assistant", text: t("assistant.processing"), tone: "pending" });
          const result = await runCreateUserCommand(getToken, {
            prenom: intent.prenom,
            nom: intent.nom,
            email: intent.email,
            role: intent.role,
          });
          updateLastAssistant(result.message, result.success ? "success" : "error");
          if (result.detail) {
            appendMessage({ role: "assistant", text: result.detail, tone: result.success ? "success" : "error" });
          }
          return;
        }

        if (intent.type === "run_storage_gc" || intent.type === "run_audit_export") {
          if (!isAdmin) {
            appendMessage({ role: "assistant", text: t("assistant.adminOnly"), tone: "error" });
            return;
          }
          appendMessage({ role: "assistant", text: t("assistant.processing"), tone: "pending" });
          const result =
            intent.type === "run_storage_gc"
              ? await runStorageGcCommand(getToken, intent.purgeAll)
              : await runAuditExportCommand(getToken);
          updateLastAssistant(result.message, result.success ? "success" : "error");
          if (result.detail) {
            appendMessage({ role: "assistant", text: result.detail, tone: result.success ? "success" : "error" });
          }
          return;
        }

        if (intent.type === "block_user" || intent.type === "unblock_user" || intent.type === "resend_invitation") {
          if (!isAdmin) {
            appendMessage({ role: "assistant", text: t("assistant.adminOnly"), tone: "error" });
            return;
          }
          const users = await searchUsersForCommand(getToken, intent.userQuery);
          await pickUser(users, intent.type, intent.userQuery);
        }
      } finally {
        setIsRunning(false);
      }
    },
    [
      appendMessage,
      askAi,
      close,
      getToken,
      input,
      isAdmin,
      isRunning,
      messages,
      navigate,
      pickEvent,
      pickUser,
      showHelp,
      startTutorial,
      t,
      updateLastAssistant,
    ],
  );

  useEffect(() => {
    if (!isOpen || isRunning || !seedSubmitRef.current) return;
    const seed = seedSubmitRef.current;
    seedSubmitRef.current = null;
    void handleSubmit(seed);
  }, [handleSubmit, isOpen, isRunning]);

  const handlePick = async (item: Evenement | Utilisateur) => {
    if (!pendingChoice || isRunning) return;
    setIsRunning(true);
    setPendingChoice(null);
    try {
      if (pendingChoice.kind === "event") {
        const event = item as Evenement;
        if (pendingChoice.intentType === "generate_package") await executeGenerate(event);
        else if (pendingChoice.intentType === "analyze_budget") await executeAnalyzeBudget(event);
        else if (pendingChoice.intentType === "close_event") await executeCloseEvent(event);
      } else {
        const user = item as Utilisateur;
        if (pendingChoice.intentType === "resend_invitation") {
          await executeResendInvitation(user);
        } else {
          await executeToggleUser(user, pendingChoice.intentType as "block_user" | "unblock_user");
        }
      }
    } finally {
      setIsRunning(false);
    }
  };

  const shortcutLabel = isMacPlatform() ? "⌘⇧A" : "Ctrl+Shift+A";
  const suggestions = useMemo(
    () => getAssistantExampleCommands(t, { isAdmin }),
    [isAdmin, t],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-99999 flex items-end justify-center bg-gray-900/50 px-4 pb-6 pt-24 backdrop-blur-[2px] sm:items-start sm:pt-20"
      onClick={close}
    >
      <div
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        aria-label={t("assistant.dialogLabel")}
        className="flex h-[min(640px,calc(100vh-6rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">{t("assistant.title")}</h2>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{t("assistant.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            {t("common.cancel")}
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                  <Sparkles className="size-4" />
                </span>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  message.role === "user"
                    ? "bg-brand-500 text-white"
                    : message.tone === "error"
                      ? "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300"
                      : message.tone === "success"
                        ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300"
                        : message.tone === "pending"
                          ? "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300"
                          : "bg-gray-50 text-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                }`}
              >
                {message.tone === "pending" && message.typing ? (
                  <ChatTypingDots />
                ) : (
                  <>
                    {message.tone === "pending" && (
                      <Loader2 className="mr-2 inline size-4 animate-spin align-[-2px]" />
                    )}
                    {message.role === "assistant" && message.tone !== "pending" ? (
                      <AssistantMessageBody text={message.text} />
                    ) : (
                      <span className="whitespace-pre-wrap">{message.text}</span>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {pendingChoice && (
            <div className="space-y-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("assistant.chooseOne")}</p>
              {pendingChoice.items.map((item) => (
                <button
                  key={pendingChoice.kind === "event" ? (item as Evenement).id : (item as Utilisateur).id}
                  type="button"
                  onClick={() => void handlePick(item)}
                  className="flex w-full flex-col rounded-xl px-3 py-2 text-left transition hover:bg-brand-50 dark:hover:bg-brand-500/10"
                >
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {pendingChoice.kind === "event"
                      ? (item as Evenement).title
                      : `${(item as Utilisateur).prenom} ${(item as Utilisateur).nom}`}
                  </span>
                  <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {pendingChoice.kind === "event"
                      ? `${(item as Evenement).project_number} · ${(item as Evenement).city ?? ""}`
                      : (item as Utilisateur).email}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            {t("assistant.examplesLabel")}
          </p>
          <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void handleSubmit(suggestion)}
                disabled={isRunning}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-brand-500/10"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 p-4 dark:border-gray-800">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder={t("assistant.placeholder")}
              disabled={isRunning}
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white/90"
            />
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isRunning || !input.trim()}
              className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{t("assistant.hint")}</span>
            <span>{shortcutLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
