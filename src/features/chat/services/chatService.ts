export type ChatStatus = "open" | "waiting" | "closed";
export type ChatPriority = "low" | "normal" | "high" | "urgent";
export type ChatSenderRole = "user" | "admin";

export interface ChatThread {
  id: number;
  customer_user_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  subject?: string | null;
  status: ChatStatus;
  priority: ChatPriority;
  assigned_admin_id?: number | null;
  assigned_admin_name?: string | null;
  is_archived: boolean;
  is_pinned: boolean;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  last_message_sender_role?: ChatSenderRole | null;
  last_message_sender_name?: string | null;
  customer_unread_count: number;
  admin_unread_count: number;
  customer_last_read_at?: string | null;
  admin_last_read_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  closed_at?: string | null;
}

export interface ChatMessage {
  id: number;
  thread_id: number;
  sender_user_id: number;
  sender_name: string;
  sender_role: ChatSenderRole;
  message_type: string;
  body?: string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
  reply_to_message_id?: number | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  deleted_for_user_at?: string | null;
  deleted_for_admin_at?: string | null;
  deleted_for_everyone_at?: string | null;
  created_at: string;
}

export interface ChatUnreadSummary {
  unread_threads: number;
  unread_messages: number;
}

export interface ChatTypingStatus {
  admin_typing: boolean;
  admin_name?: string | null;
  user_typing: boolean;
  user_name?: string | null;
}

export interface AiChatSession {
  id: number;
  user_id: number;
  user_name?: string | null;
  user_email?: string | null;
  device_id?: string | null;
  title?: string | null;
  status: string;
  escalated_thread_id?: number | null;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AiChatMessage {
  id: number;
  session_id: number;
  sender_role: "user" | "ai" | "system";
  body: string;
  intent?: string | null;
  page_context?: string | null;
  machine_status?: string | null;
  should_escalate?: boolean;
  created_at: string;
}

export interface AiSensorLearningSample {
  id: number;
  tenant_id: string;
  user_id?: number | null;
  device_id?: string | null;
  sensor_data_id?: number | null;
  sample_source?: string | null;
  feature_json: string;
  label: string;
  risk_score: number;
  action_hint?: string | null;
  captured_at?: string | null;
  created_at?: string | null;
}

export interface AiSensorLearningSummary {
  tenant_id: string;
  device_id?: string | null;
  total_samples: number;
  labels: Record<string, number>;
  samples: AiSensorLearningSample[];
  backfill?: {
    scanned: number;
    captured: number;
  };
  isolation?: {
    mode: string;
    tenant_id: string;
    user_id: number | string;
    note?: string;
  };
}

type ChatThreadListQuery = {
  mine?: boolean;
  unread?: boolean;
  archived?: boolean;
  q?: string;
  status?: ChatStatus;
  startDate?: string;
  endDate?: string;
};

type ChatMessageQuery = {
  startDate?: string;
  endDate?: string;
  limit?: number;
  includeRelated?: boolean;
};

type AiChatQuery = {
  deviceId?: string;
  limit?: number;
};

type AiChatExchangePayload = {
  deviceId?: string;
  userMessage: string;
  aiMessage: string;
  currentPage?: string;
  machineStatus?: string;
  intent?: string;
  shouldEscalate?: boolean;
};

type AiChatRespondPayload = Omit<AiChatExchangePayload, "aiMessage"> & {
  fallbackAiMessage?: string;
};

const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const SESSION_KEY = "smart_iot_session";

const buildApiUrl = (path: string) => `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

const getAuthHeaders = () => {
  let token = "";
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      token = parsed?.token || parsed?.user?.token || "";
    }
  } catch {
    token = "";
  }
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const toQueryString = (query?: Record<string, string | number | boolean | undefined>) => {
  if (!query) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const raw = params.toString();
  return raw ? `?${raw}` : "";
};

const parseJson = async <T>(response: Response, fallback: string): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || fallback);
  }
  return response.json();
};

export const chatService = {
  async getMyAiSession(query?: AiChatQuery): Promise<{ session: AiChatSession; messages: AiChatMessage[] }> {
    const response = await fetch(buildApiUrl(`/ai-chat/session/me${toQueryString(query)}`), {
      headers: getAuthHeaders(),
    });
    return parseJson(response, "Failed to load NAT AI chat");
  },

  async appendAiExchange(payload: AiChatExchangePayload): Promise<{ session: AiChatSession; messages: AiChatMessage[] }> {
    const response = await fetch(buildApiUrl("/ai-chat/session/me/messages"), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return parseJson(response, "Failed to save NAT AI chat");
  },

  async generateAiReply(payload: AiChatRespondPayload): Promise<{
    session: AiChatSession;
    messages: AiChatMessage[];
    provider?: string;
    controller_intent?: string;
    controller_risk?: unknown;
    controller_actions?: unknown[];
    max_output_tokens?: number;
  }> {
    const response = await fetch(buildApiUrl("/ai-chat/session/me/respond"), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return parseJson(response, "Failed to generate NAT AI reply");
  },

  async clearMyAiSession(query?: Pick<AiChatQuery, "deviceId">): Promise<{ session: AiChatSession; messages: AiChatMessage[] }> {
    const response = await fetch(buildApiUrl(`/ai-chat/session/me/messages${toQueryString(query)}`), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return parseJson(response, "Failed to reset NAT AI chat");
  },

  async getMySensorLearning(query?: { deviceId?: string; limit?: number; backfill?: "auto" | "true" | "false" }): Promise<AiSensorLearningSummary> {
    const response = await fetch(buildApiUrl(`/ai/sensor-learning/me${toQueryString(query)}`), {
      headers: getAuthHeaders(),
    });
    return parseJson(response, "Failed to load AI learning data");
  },

  async backfillMySensorLearning(payload?: { deviceId?: string; limit?: number }): Promise<AiSensorLearningSummary> {
    const response = await fetch(buildApiUrl("/ai/sensor-learning/me/backfill"), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload || {}),
    });
    return parseJson(response, "Failed to backfill AI learning data");
  },

  async getMyThread(query?: ChatMessageQuery): Promise<{ thread: ChatThread; messages: ChatMessage[] }> {
    const response = await fetch(buildApiUrl(`/chat/thread/me${toQueryString(query)}`), {
      headers: getAuthHeaders(),
    });
    return parseJson(response, "Failed to load chat");
  },

  async listThreads(query?: ChatThreadListQuery): Promise<ChatThread[]> {
    const response = await fetch(buildApiUrl(`/chat/threads${toQueryString(query)}`), {
      headers: getAuthHeaders(),
    });
    return parseJson(response, "Failed to load chats");
  },

  async getThreadMessages(threadId: number, query?: ChatMessageQuery): Promise<{ thread: ChatThread; messages: ChatMessage[] }> {
    const response = await fetch(buildApiUrl(`/chat/threads/${threadId}/messages${toQueryString(query)}`), {
      headers: getAuthHeaders(),
    });
    return parseJson(response, "Failed to load messages");
  },

  async sendMessage(threadId: number, body: string, replyToMessageId?: number | null): Promise<ChatMessage> {
    const response = await fetch(buildApiUrl(`/chat/threads/${threadId}/messages`), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        body,
        reply_to_message_id: replyToMessageId ?? null,
      }),
    });
    const data = await parseJson<{ message: ChatMessage }>(response, "Failed to send message");
    return data.message;
  },

  async markRead(threadId: number): Promise<void> {
    const response = await fetch(buildApiUrl(`/chat/threads/${threadId}/read`), {
      method: "POST",
      headers: getAuthHeaders(),
    });
    await parseJson(response, "Failed to mark chat as read");
  },

  async getTypingStatus(threadId: number): Promise<ChatTypingStatus> {
    const response = await fetch(buildApiUrl(`/chat/threads/${threadId}/typing`), {
      headers: getAuthHeaders(),
    });
    return parseJson(response, "Failed to load typing state");
  },

  async setTypingStatus(threadId: number, isTyping: boolean): Promise<ChatTypingStatus> {
    const response = await fetch(buildApiUrl(`/chat/threads/${threadId}/typing`), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_typing: isTyping }),
    });
    return parseJson(response, "Failed to update typing state");
  },

  async updateThreadMeta(
    threadId: number,
    payload: Partial<Pick<ChatThread, "status" | "priority" | "is_archived" | "is_pinned" | "assigned_admin_id">>,
  ): Promise<ChatThread> {
    const response = await fetch(buildApiUrl(`/chat/threads/${threadId}/meta`), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await parseJson<{ thread: ChatThread }>(response, "Failed to update chat");
    return data.thread;
  },

  async editMessage(messageId: number, body: string): Promise<ChatMessage> {
    const response = await fetch(buildApiUrl(`/chat/messages/${messageId}`), {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ body }),
    });
    const data = await parseJson<{ message: ChatMessage }>(response, "Failed to edit message");
    return data.message;
  },

  async deleteMessage(messageId: number, scope: "self" | "everyone" = "self"): Promise<ChatMessage> {
    const response = await fetch(buildApiUrl(`/chat/messages/${messageId}/delete`), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ scope }),
    });
    const data = await parseJson<{ message: ChatMessage }>(response, "Failed to delete message");
    return data.message;
  },

  async getUnreadSummary(): Promise<ChatUnreadSummary> {
    const response = await fetch(buildApiUrl("/chat/unread-summary"), {
      headers: getAuthHeaders(),
    });
    return parseJson(response, "Failed to load unread summary");
  },
};
