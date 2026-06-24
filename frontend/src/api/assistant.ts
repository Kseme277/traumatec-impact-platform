import { apiFetch } from "./client";

export interface AssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantChatResponse {
  reply: string;
  source: "nvidia" | "local" | string;
  model: string | null;
  context_summary?: {
    events_total: number;
    search_events: number;
  };
}

export function assistantChat(
  token: string | null,
  message: string,
  history: AssistantChatMessage[] = [],
) {
  return apiFetch<AssistantChatResponse>("/v1/assistant/chat", token, {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}
