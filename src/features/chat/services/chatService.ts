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
  created_at: string;
}

export interface ChatUnreadSummary {
  unread_threads: number;
  unread_messages: number;
}

type ChatThreadListQuery = {
  mine?: boolean;
  unread?: boolean;
  archived?: boolean;
  q?: string;
  status?: ChatStatus;
};

type ChatMessageQuery = {
  startDate?: string;
  endDate?: string;
  limit?: number;
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
  async getMyThread(): Promise<{ thread: ChatThread; messages: ChatMessage[] }> {
    const response = await fetch(buildApiUrl("/chat/thread/me"), {
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

  async deleteMessage(messageId: number): Promise<ChatMessage> {
    const response = await fetch(buildApiUrl(`/chat/messages/${messageId}/delete`), {
      method: "POST",
      headers: getAuthHeaders(),
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
