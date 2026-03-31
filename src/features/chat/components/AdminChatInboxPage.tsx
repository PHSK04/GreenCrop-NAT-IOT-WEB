import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, MessageSquare, Pin, RefreshCw, Search, Send, ShieldAlert, UserCheck } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { chatService, ChatMessage, ChatThread } from "@/features/chat/services/chatService";
import { authService, AdminDbUserRow } from "@/features/auth/services/authService";

type AdminChatInboxPageProps = {
  language?: string;
};

const POLL_MS = 4000;

const safeSenderLabel = (message: Pick<ChatMessage, "sender_name" | "sender_role">, isTH: boolean) => {
  if (message.sender_role === "admin") {
    return "Admin nat";
  }
  return message.sender_name || (isTH ? "ลูกค้า" : "Customer");
};

const quickReplies = [
  "สวัสดีครับ ทีมงานกำลังตรวจสอบให้และจะอัปเดตโดยเร็วที่สุด",
  "ได้รับข้อมูลแล้วครับ รบกวนแจ้งเวลาเกิดปัญหาและชื่ออุปกรณ์เพิ่มเติม",
  "ทีมงานตรวจพบปัญหาแล้ว ตอนนี้กำลังดำเนินการแก้ไขให้ครับ",
];

const formatTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : "");

const formatMessageTime = (value?: string | null, locale = "th-TH") => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMessageDay = (value?: string | null, locale = "th-TH") => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const isSameCalendarDay = (left?: string | null, right?: string | null) => {
  if (!left || !right) return false;
  const a = new Date(left);
  const b = new Date(right);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const toDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDateTimeRange = (dateValue: string) => ({
  startDate: `${dateValue}T00:00`,
  endDate: `${dateValue}T23:59`,
});

const isMessageOnSelectedDate = (value: string | null | undefined, dateValue: string) => {
  if (!value || !dateValue) return false;
  return toDateInputValue(new Date(value)) === dateValue;
};

const threadHasActivityOnSelectedDate = (thread: ChatThread, dateValue: string) =>
  isMessageOnSelectedDate(
    thread.last_message_at || thread.updated_at || thread.created_at,
    dateValue,
  );

const compareThreads = (left: ChatThread, right: ChatThread) => {
  if (left.is_pinned !== right.is_pinned) return Number(right.is_pinned) - Number(left.is_pinned);
  const leftTime = new Date(left.last_message_at || left.updated_at || left.created_at || 0).getTime();
  const rightTime = new Date(right.last_message_at || right.updated_at || right.created_at || 0).getTime();
  if (leftTime !== rightTime) return rightTime - leftTime;
  return right.id - left.id;
};

const formatThreadPreview = (thread: ChatThread, isTH: boolean) => {
  const preview = String(thread.last_message_preview || "").trim();
  if (!preview) {
    return isTH ? "ยังไม่มีข้อความ" : "No messages yet";
  }

  if (thread.last_message_sender_role === "admin") {
    return `${isTH ? "คุณ" : "You"}: ${preview}`;
  }

  if (thread.last_message_sender_role === "user") {
    return `${isTH ? "ลูกค้า" : "Customer"}: ${preview}`;
  }

  return preview;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

async function exportTranscriptPdf(thread: ChatThread | null, messages: ChatMessage[]) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let y = 800;
  const writeLine = (text: string, isBold = false, size = 11) => {
    if (y < 50) {
      page = pdfDoc.addPage([595, 842]);
      y = 800;
    }
    page.drawText(text.slice(0, 140), { x: 40, y, size, font: isBold ? bold : font, color: rgb(0.12, 0.16, 0.24) });
    y -= size + 6;
  };
  writeLine(`Admin Transcript: ${thread?.customer_name || "Customer"}`, true, 16);
  writeLine(`Exported: ${new Date().toLocaleString()}`);
  writeLine("");
  messages.forEach((message) => {
    writeLine(`[${formatTime(message.created_at)}] ${safeSenderLabel(message, true)} (${message.sender_role})`, true);
    String(message.body || "").split("\n").forEach((line) => writeLine(line || " "));
    writeLine("");
  });
  const bytes = await pdfDoc.save();
  const normalizedBytes = Uint8Array.from(bytes);
  downloadBlob(new Blob([normalizedBytes], { type: "application/pdf" }), `admin-chat-${thread?.id || "thread"}.pdf`);
}

function exportTranscriptTxt(thread: ChatThread | null, messages: ChatMessage[]) {
  const text = [
    `Admin Transcript: ${thread?.customer_name || "Customer"}`,
    `Exported: ${new Date().toLocaleString()}`,
    "",
    ...messages.flatMap((message) => [
      `[${formatTime(message.created_at)}] ${safeSenderLabel(message, true)} (${message.sender_role})`,
      String(message.body || ""),
      "",
    ]),
  ].join("\n");
  downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `admin-chat-${thread?.id || "thread"}.txt`);
}

export function AdminChatInboxPage({ language = "TH" }: AdminChatInboxPageProps) {
  const isTH = language === "TH";
  const todayDateValue = toDateInputValue(new Date());
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [admins, setAdmins] = useState<AdminDbUserRow[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "mine" | "archive">("all");
  const [selectedInboxDate, setSelectedInboxDate] = useState("");
  const [matchingThreadIdsByDate, setMatchingThreadIdsByDate] = useState<number[] | null>(null);
  const [isInboxDateLoading, setIsInboxDateLoading] = useState(false);
  const [historyStart, setHistoryStart] = useState("");
  const [historyEnd, setHistoryEnd] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);
  const [typingCustomerName, setTypingCustomerName] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const dateFilterCacheRef = useRef<Record<string, number[]>>({});
  const shouldStickToBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const typingTimeoutRef = useRef<number | null>(null);
  const locale = isTH ? "th-TH" : "en-US";

  const updateStickToBottom = () => {
    const node = listRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 80;
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
  };

  const filteredThreadsByDay = useMemo(() => {
    if (!selectedInboxDate) return threads;
    if (matchingThreadIdsByDate === null) return [];
    const matchingIds = new Set(matchingThreadIdsByDate);
    return threads.filter((thread) => matchingIds.has(thread.id));
  }, [matchingThreadIdsByDate, selectedInboxDate, threads]);

  const selectedThread = useMemo(
    () => filteredThreadsByDay.find((thread) => thread.id === selectedThreadId) || null,
    [filteredThreadsByDay, selectedThreadId],
  );
  const selectedDateLabel = useMemo(() => {
    if (!selectedInboxDate) return isTH ? "ทุกวัน" : "All dates";
    if (selectedInboxDate === todayDateValue) return isTH ? "วันนี้" : "Today";
    return new Date(selectedInboxDate).toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [isTH, locale, selectedInboxDate, todayDateValue]);

  const loadThreads = async (silently = false) => {
    if (!silently) setIsLoading(true);
    try {
      const nextThreads = await (
        filter === "all"
          ? (() => {
              return Promise.all([
                chatService.listThreads({
                  q: query || undefined,
                  archived: false,
                }),
                chatService.listThreads({
                  q: query || undefined,
                  archived: true,
                }),
              ]).then(([activeThreads, archivedThreads]) => {
                const mergedThreads = [...activeThreads, ...archivedThreads];
                const uniqueThreads = Array.from(new Map(mergedThreads.map((thread) => [thread.id, thread])).values());
                return uniqueThreads.sort(compareThreads);
              });
            })()
          : chatService.listThreads({
              q: query || undefined,
              mine: filter === "mine",
              unread: filter === "unread",
              archived: filter === "archive",
            })
      );
      setThreads(nextThreads);
      setSelectedThreadId((current) => current ?? nextThreads[0]?.id ?? null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chats");
    } finally {
      if (!silently) setIsLoading(false);
    }
  };

  const loadMessages = async (threadId: number, silently = false) => {
    try {
      const data = await chatService.getThreadMessages(threadId, {
        startDate: historyStart || undefined,
        endDate: historyEnd || undefined,
      });
      setMessages(data.messages);
      setThreads((current) =>
        current.map((thread) => {
          if (thread.id !== threadId) return thread;
          return {
            ...thread,
            ...data.thread,
            admin_unread_count: 0,
            last_message_preview:
              data.messages[data.messages.length - 1]?.body ||
              data.thread.last_message_preview ||
              thread.last_message_preview,
            last_message_at:
              data.messages[data.messages.length - 1]?.created_at ||
              data.thread.last_message_at ||
              thread.last_message_at,
          };
        }),
      );
      await chatService.markRead(threadId);
      if (!silently) {
        shouldStickToBottomRef.current = true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    }
  };

  const loadTypingStatus = async (threadId: number) => {
    try {
      const typingState = await chatService.getTypingStatus(threadId);
      setIsCustomerTyping(Boolean(typingState.user_typing));
      setTypingCustomerName(String(typingState.user_name || selectedThread?.customer_name || "Customer"));
    } catch {
      // Ignore transient typing errors.
    }
  };

  const reportAdminTyping = (isTyping: boolean) => {
    if (!selectedThread) return;
    chatService.setTypingStatus(selectedThread.id, isTyping).catch(() => {});
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTyping) {
      typingTimeoutRef.current = window.setTimeout(() => {
        if (selectedThread) {
          chatService.setTypingStatus(selectedThread.id, false).catch(() => {});
        }
        typingTimeoutRef.current = null;
      }, 3000);
    }
  };

  useEffect(() => {
    loadThreads().catch(() => {});
    authService.getAdminDbUsers({ role: "admin", limit: 100 }).then(setAdmins).catch(() => {});
  }, []);

  useEffect(() => {
    loadThreads(true).catch(() => {});
  }, [query, filter]);

  useEffect(() => {
    let cancelled = false;

    const loadThreadsForSelectedDate = async () => {
      if (!selectedInboxDate) {
        setMatchingThreadIdsByDate(threads.map((thread) => thread.id));
        setIsInboxDateLoading(false);
        return;
      }

      const cacheKey = `${selectedInboxDate}:${threads
        .map((thread) => `${thread.id}-${thread.last_message_at || thread.updated_at || thread.created_at || ""}`)
        .join("|")}`;
      const cachedThreadIds = dateFilterCacheRef.current[cacheKey];

      if (cachedThreadIds) {
        setMatchingThreadIdsByDate(cachedThreadIds);
      }

      setIsInboxDateLoading(!cachedThreadIds);
      try {
        const results = await Promise.all(
          threads.map(async (thread) => {
            try {
              if (threadHasActivityOnSelectedDate(thread, selectedInboxDate)) {
                return thread.id;
              }

              const dateRange = toDateTimeRange(selectedInboxDate);
              const data = await chatService.getThreadMessages(thread.id, {
                ...dateRange,
                limit: 1,
              });
              const hasMessagesOnSelectedDate = data.messages.some((message) =>
                isMessageOnSelectedDate(message.created_at, selectedInboxDate),
              );
              return hasMessagesOnSelectedDate ? thread.id : null;
            } catch {
              return null;
            }
          }),
        );

        if (!cancelled) {
          const nextMatchingIds = results.filter((id): id is number => id !== null);
          dateFilterCacheRef.current[cacheKey] = nextMatchingIds;
          setMatchingThreadIdsByDate(nextMatchingIds);
        }
      } finally {
        if (!cancelled) {
          setIsInboxDateLoading(false);
        }
      }
    };

    loadThreadsForSelectedDate().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedInboxDate, threads]);

  useEffect(() => {
    setSelectedThreadId((current) => {
      if (current && filteredThreadsByDay.some((thread) => thread.id === current)) return current;
      return filteredThreadsByDay[0]?.id ?? null;
    });
  }, [filteredThreadsByDay]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadThreads(true).catch(() => {});
      if (selectedThreadId) {
        loadMessages(selectedThreadId, true).catch(() => {});
        loadTypingStatus(selectedThreadId).catch(() => {});
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [selectedThreadId, query, filter, historyStart, historyEnd]);

  useEffect(() => {
    if (!selectedThreadId) return;
    loadMessages(selectedThreadId).catch(() => {});
    loadTypingStatus(selectedThreadId).catch(() => {});
  }, [selectedThreadId, historyStart, historyEnd]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedThreadId) return;
    setIsCustomerTyping(false);
  }, [selectedThreadId]);

  useEffect(() => {
    const hasNewMessages = messages.length > previousMessageCountRef.current;
    const shouldScroll = shouldStickToBottomRef.current || hasNewMessages;
    if (shouldScroll) {
      window.requestAnimationFrame(() => {
        scrollToBottom(hasNewMessages ? "smooth" : "auto");
      });
    }
    previousMessageCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    previousMessageCountRef.current = 0;
    shouldStickToBottomRef.current = true;
  }, [selectedThreadId]);

  const sendMessage = async () => {
    if (!selectedThread || !draft.trim()) return;
    const created = await chatService.sendMessage(selectedThread.id, draft.trim());
    setMessages((current) => [...current, created]);
    shouldStickToBottomRef.current = true;
    setDraft("");
    reportAdminTyping(false);
    loadThreads(true).catch(() => {});
  };

  const updateMeta = async (payload: Partial<Pick<ChatThread, "status" | "priority" | "is_archived" | "is_pinned" | "assigned_admin_id">>) => {
    if (!selectedThread) return;
    const updated = await chatService.updateThreadMeta(selectedThread.id, payload);
    setThreads((current) => current.map((thread) => (thread.id === updated.id ? updated : thread)));
  };

  const resetToAllThreads = () => {
    setSelectedInboxDate("");
    setFilter("all");
    setSelectedThreadId(threads[0]?.id ?? null);
  };

  const refreshInbox = async () => {
    setIsRefreshing(true);
    try {
      await loadThreads(true);
      if (selectedThreadId) {
        await loadMessages(selectedThreadId, true);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const selectedFilterLabel = useMemo(() => {
    if (filter === "unread") return isTH ? "ยังไม่อ่าน" : "Unread";
    if (filter === "mine") return isTH ? "ของฉัน" : "Mine";
    if (filter === "archive") return "Archive";
    return isTH ? "ทุกแชท" : "All chats";
  }, [filter, isTH]);

  return (
    <div className="box-border flex h-full max-h-full min-h-0 flex-col overflow-hidden p-8">
      <div className="mb-6 shrink-0 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{isTH ? "ศูนย์แชทลูกค้า" : "Customer Chat Inbox"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isTH ? "ดูแชทใหม่, assign งาน, ย้อนประวัติ และดาวน์โหลด transcript ได้จากที่เดียว" : "Manage live chats, ownership, history, and transcript exports in one place."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{threads.filter((thread) => thread.admin_unread_count > 0).length} {isTH ? "ยังไม่อ่าน" : "unread"}</Badge>
          <Badge variant="outline">{threads.length} {isTH ? "ห้อง" : "threads"}</Badge>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 overflow-hidden xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden border-border bg-card/80">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                {isTH ? "Inbox" : "Inbox"}
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => refreshInbox().catch(() => {})}
                disabled={isRefreshing}
                title={isTH ? "รีเฟรชรายการแชท" : "Refresh chat list"}
                aria-label={isTH ? "รีเฟรชรายการแชท" : "Refresh chat list"}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-10" placeholder={isTH ? "ค้นหาจากชื่อ อีเมล หรือข้อความ" : "Search by customer, email, or message"} />
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {isTH ? "วันของข้อความ" : "Message date"}
              </div>
              <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className={selectedInboxDate === todayDateValue
                  ? "rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-5 text-white hover:from-emerald-400 hover:to-teal-400"
                  : "rounded-full border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-950/30"}
                onClick={() => setSelectedInboxDate(todayDateValue)}
              >
                {isTH ? "วันนี้" : "Today"}
              </Button>
              <Button
                variant="ghost"
                className={!selectedInboxDate
                  ? "rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-5 text-white hover:from-emerald-400 hover:to-teal-400"
                  : "rounded-full border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-950/30"}
                onClick={resetToAllThreads}
              >
                {isTH ? "ทุกวัน" : "All dates"}
              </Button>
              <input
                type="date"
                value={selectedInboxDate}
                onChange={(event) => setSelectedInboxDate(event.target.value)}
                className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm"
              />
            </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">
              {isTH ? "กำลังดู:" : "Showing:"} <span className="font-semibold">{selectedDateLabel}</span> · <span className="font-semibold">{selectedFilterLabel}</span>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {isTH ? "รายการแชท" : "Chat scope"}
              </div>
              <div className="grid grid-cols-2 gap-2">
              {[
                { id: "all", label: isTH ? "ทุกแชท" : "All chats" },
                { id: "unread", label: isTH ? "ยังไม่อ่าน" : "Unread" },
                { id: "mine", label: isTH ? "ของฉัน" : "Mine" },
                { id: "archive", label: isTH ? "Archive" : "Archive" },
              ].map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={filter === item.id
                    ? "rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 text-white shadow-[0_12px_24px_rgba(45,212,191,0.2)] hover:from-emerald-400 hover:to-teal-400"
                    : "rounded-full border border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"}
                  onClick={() => {
                    const nextFilter = item.id as typeof filter;
                    if (nextFilter === "all") {
                      resetToAllThreads();
                      return;
                    }
                    setFilter(nextFilter);
                    setSelectedThreadId(null);
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {(isLoading || isInboxDateLoading) && <div className="text-sm text-muted-foreground">{isTH ? "กำลังโหลด..." : "Loading..."}</div>}
              {!isLoading && !isInboxDateLoading && filteredThreadsByDay.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {isTH ? `ไม่พบแชทสำหรับ ${selectedDateLabel} · ${selectedFilterLabel}` : `No chat threads for ${selectedDateLabel} · ${selectedFilterLabel}`}
                </div>
              )}
              {filteredThreadsByDay.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${selectedThreadId === thread.id ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20" : "border-border bg-background/70 hover:border-emerald-300"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{thread.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{thread.customer_email}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {thread.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
                      {thread.admin_unread_count > 0 && <Badge>{thread.admin_unread_count}</Badge>}
                    </div>
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{formatThreadPreview(thread, isTH)}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <Badge variant="outline">{thread.status}</Badge>
                    <Badge variant="outline">{thread.priority}</Badge>
                    {thread.assigned_admin_name && <Badge variant="outline">{thread.assigned_admin_name}</Badge>}
                    <span className="ml-auto text-muted-foreground">{formatTime(thread.last_message_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden border-border bg-card/80">
          <CardHeader className="shrink-0 border-b border-border">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>{selectedThread?.customer_name || (isTH ? "เลือกห้องแชท" : "Select a thread")}</CardTitle>
                <div className="mt-1 text-sm text-muted-foreground">
                  {isCustomerTyping
                    ? `${typingCustomerName || selectedThread?.customer_name || (isTH ? "ลูกค้า" : "Customer")}${isTH ? " กำลังพิมพ์..." : " is typing..."}`
                    : selectedThread?.customer_email || (isTH ? "ดูประวัติและตอบกลับจากฝั่งแอดมิน" : "Review conversation history and reply from admin")}
                </div>
              </div>
              {selectedThread && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="grid gap-1 rounded-2xl border border-border bg-background/70 px-3 py-2">
                    <div className="text-[11px] text-muted-foreground">{isTH ? "เริ่มจาก" : "From"}</div>
                    <input
                      type="datetime-local"
                      value={historyStart}
                      onChange={(event) => setHistoryStart(event.target.value)}
                      className="h-9 rounded-xl border border-border bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="grid gap-1 rounded-2xl border border-border bg-background/70 px-3 py-2">
                    <div className="text-[11px] text-muted-foreground">{isTH ? "ถึง" : "To"}</div>
                    <input
                      type="datetime-local"
                      value={historyEnd}
                      onChange={(event) => setHistoryEnd(event.target.value)}
                      className="h-9 rounded-xl border border-border bg-background px-3 text-sm"
                    />
                  </div>
                  <select
                    className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                    value={selectedThread.status}
                    onChange={(event) => updateMeta({ status: event.target.value as ChatThread["status"] }).catch(() => {})}
                  >
                    <option value="open">{isTH ? "กำลังคุย" : "Open"}</option>
                    <option value="waiting">{isTH ? "รอตอบ" : "Waiting"}</option>
                    <option value="closed">{isTH ? "ปิดเคส" : "Closed"}</option>
                  </select>
                  <select
                    className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                    value={selectedThread.assigned_admin_id || ""}
                    onChange={(event) => updateMeta({ assigned_admin_id: event.target.value ? Number(event.target.value) : null }).catch(() => {})}
                  >
                    <option value="">{isTH ? "ยังไม่ assign" : "Unassigned"}</option>
                    {admins.map((admin) => (
                      <option key={String(admin.id)} value={String(admin.id)}>
                        {admin.name}
                      </option>
                    ))}
                  </select>
                  <Button variant="outline" size="icon" onClick={() => updateMeta({ is_pinned: !selectedThread.is_pinned }).catch(() => {})}>
                    <Pin className={`h-4 w-4 ${selectedThread.is_pinned ? "text-amber-500" : ""}`} />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => exportTranscriptTxt(selectedThread, messages)}>
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => exportTranscriptPdf(selectedThread, messages)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => { setHistoryStart(""); setHistoryEnd(""); }}>
                    {isTH ? "ล้างช่วงเวลา" : "Clear range"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
            {!selectedThread ? (
              <div className="flex min-h-[560px] items-center justify-center px-6">
                <div className="max-w-md text-center">
                  <div className="text-base font-medium text-foreground">
                    {isTH ? "เลือกห้องแชทจาก inbox ด้านซ้าย" : "Select a conversation from the inbox"}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {isTH
                      ? `ตอนนี้กำลังดูรายการของ ${selectedDateLabel} หากหาไม่เจอให้เปลี่ยนวันหรือกด "ทั้งหมด"`
                      : `You are currently viewing threads for ${selectedDateLabel}. Change the date or select "All dates" if needed.`}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 grid gap-3 border-b border-border p-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-muted/40 p-4">
                    <div className="mb-1 flex items-center gap-2 text-sm font-medium"><UserCheck className="h-4 w-4 text-emerald-600" />{isTH ? "ผู้รับผิดชอบ" : "Owner"}</div>
                    <div className="text-sm text-muted-foreground">{selectedThread.assigned_admin_name || (isTH ? "ยังไม่กำหนด" : "Unassigned")}</div>
                  </div>
                  <div className="rounded-2xl bg-muted/40 p-4">
                    <div className="mb-1 flex items-center gap-2 text-sm font-medium"><ShieldAlert className="h-4 w-4 text-amber-500" />{isTH ? "สถานะเคส" : "Status"}</div>
                    <div className="text-sm text-muted-foreground">{selectedThread.status}</div>
                  </div>
                  <div className="rounded-2xl bg-muted/40 p-4">
                    <div className="mb-1 text-sm font-medium">{isTH ? "ประวัติลูกค้า" : "History"}</div>
                    <div className="text-sm text-muted-foreground">{messages.length} {isTH ? "ข้อความที่บันทึกไว้" : "messages stored"}</div>
                    {(historyStart || historyEnd) && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {isTH ? "กำลังกรองตามช่วงวันเวลา" : "Filtered by selected date range"}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  ref={listRef}
                  onScroll={updateStickToBottom}
                  className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px] p-4"
                >
                  {messages.map((message, index) => {
                    const isAdminMessage = message.sender_role === "admin";
                    const previousMessage = index > 0 ? messages[index - 1] : null;
                    const shouldShowDayDivider = !previousMessage || !isSameCalendarDay(previousMessage.created_at, message.created_at);
                    return (
                      <div key={message.id} className="space-y-3">
                        {shouldShowDayDivider && (
                          <div className="sticky top-0 z-10 flex justify-center py-1">
                            <div className="rounded-full border border-slate-200/80 bg-white/92 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/92 dark:text-slate-300">
                              {formatMessageDay(message.created_at, locale)}
                            </div>
                          </div>
                        )}
                        <div className={`flex ${isAdminMessage ? "justify-end" : "justify-start"} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
                          <div className={`max-w-[80%] rounded-[1.5rem] px-4 py-3 shadow-sm ${isAdminMessage ? "bg-emerald-600 text-white dark:bg-emerald-600" : "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"}`}>
                            <div className={`mb-1 flex items-center gap-2 text-[11px] ${isAdminMessage ? "text-emerald-100" : "text-slate-500 dark:text-slate-400"}`}>
                              <span>{safeSenderLabel(message, isTH)}</span>
                              <span className="opacity-70">{formatMessageTime(message.created_at, locale)}</span>
                            </div>
                            <div className="whitespace-pre-wrap text-sm leading-6">{message.body}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="shrink-0 space-y-3 border-t border-border p-4">
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply}
                        type="button"
                        onClick={() => setDraft(reply)}
                        className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:border-emerald-300 hover:text-foreground"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>

                  {error && <div className="text-xs text-red-500">{error}</div>}
                  {isCustomerTyping && (
                    <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">
                      <span>{typingCustomerName || selectedThread.customer_name}{isTH ? " กำลังพิมพ์" : " is typing"}</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                      </span>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <Input
                      value={draft}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setDraft(nextValue);
                        reportAdminTyping(nextValue.trim().length > 0);
                      }}
                      placeholder={isTH ? "พิมพ์ข้อความตอบกลับ..." : "Type your reply..."}
                      className="h-12 rounded-2xl"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          sendMessage().catch(() => {});
                        }
                      }}
                    />
                    <Button className="h-12 rounded-2xl px-4" onClick={() => sendMessage().catch(() => {})} disabled={!draft.trim()}>
                      <Send className="mr-2 h-4 w-4" />
                      {isTH ? "ส่ง" : "Send"}
                    </Button>
                    <Button variant="outline" className="h-12 rounded-2xl" onClick={() => updateMeta({ is_archived: !selectedThread.is_archived }).catch(() => {})}>
                      {selectedThread.is_archived ? (isTH ? "คืนจาก archive" : "Unarchive") : "Archive"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
