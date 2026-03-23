import { useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  Bot,
  CalendarRange,
  CheckCheck,
  Download,
  FileText,
  MessageCircleMore,
  Pencil,
  Reply,
  RotateCcw,
  Send,
  Trash2,
  UserCheck,
  UserRoundX,
  X,
} from "lucide-react";
import supportIcon from "@/assets/images/icon_support.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { chatService, ChatMessage, ChatThread } from "@/features/chat/services/chatService";
import { toast } from "sonner";

type CustomerChatWidgetProps = {
  language?: string;
};

type AssistantMode = "assistant" | "human";

type AssistantMessage = {
  id: string;
  sender: "ai" | "user";
  text: string;
  actions?: Array<{
    id: string;
    label: string;
    next: string;
  }>;
  canEscalate?: boolean;
};

const POLL_MS = 4000;

const safeSenderLabel = (message: Pick<ChatMessage, "sender_name" | "sender_role">, isTH: boolean) => {
  if (message.sender_role === "admin") {
    return "Admin nat";
  }
  return message.sender_name || (isTH ? "ลูกค้า" : "Customer");
};

const assistantFlows = {
  offline: {
    title: "อุปกรณ์ไม่ออนไลน์",
    answer:
      "ลองตรวจไฟเลี้ยงอุปกรณ์, อินเทอร์เน็ต, และรีสตาร์ตอุปกรณ์ 1 ครั้งก่อนนะครับ ถ้ายัง offline เกิน 30 นาที แนะนำให้ส่งต่อเจ้าหน้าที่ทันที",
  },
  login: {
    title: "เข้าสู่ระบบไม่ได้",
    answer:
      "ตรวจสอบอีเมลให้ถูกต้อง, ลองเข้าในเบราว์เซอร์อื่น หรือโหมดไม่ระบุตัวตน หากยังไม่ได้ให้คุยกับเจ้าหน้าที่เพื่อเช็กบัญชีและ log ระบบ",
  },
  sensor: {
    title: "ข้อมูลเซนเซอร์ไม่อัปเดต",
    answer:
      "ลองรีเฟรชหน้า dashboard, ตรวจว่าเลือก active device ถูกตัว และรออีก 1 รอบการ sync ถ้ายังค้างต่อเนื่องให้ส่งต่อเจ้าหน้าที่พร้อมเวลาที่พบปัญหา",
  },
  pairing: {
    title: "เชื่อมต่ออุปกรณ์ไม่สำเร็จ",
    answer:
      "ยืนยัน device id และ pairing code ให้ถูกต้อง แล้วลองอีกครั้งบนอินเทอร์เน็ตที่เสถียร หากระบบบอกว่าอุปกรณ์ถูกใช้งานแล้ว ให้คุยกับเจ้าหน้าที่เพื่อปลดผูกบัญชี",
  },
  urgent: {
    title: "แจ้งปัญหาเร่งด่วน",
    answer:
      "กรณีนี้แนะนำให้ส่งต่อเจ้าหน้าที่ทันที พร้อมแนบชื่ออุปกรณ์ เวลาเกิดเหตุ และภาพหน้าจอถ้ามี เพื่อให้ทีมตรวจสอบได้เร็วที่สุด",
  },
} as const;

const createAssistantWelcome = (): AssistantMessage => ({
  id: "assistant-welcome",
  sender: "ai",
  text: "สวัสดีครับ ผมช่วยคัดกรองปัญหาเบื้องต้นให้ก่อนได้ เลือกหัวข้อที่ใกล้เคียงกับปัญหาของคุณ แล้วถ้ายังไม่หายค่อยกดคุยกับเจ้าหน้าที่ครับ",
  actions: [
    { id: "offline", label: "อุปกรณ์ไม่ออนไลน์", next: "offline" },
    { id: "login", label: "เข้าสู่ระบบไม่ได้", next: "login" },
    { id: "sensor", label: "ข้อมูลไม่อัปเดต", next: "sensor" },
    { id: "pairing", label: "เชื่อมต่ออุปกรณ์ไม่ได้", next: "pairing" },
    { id: "urgent", label: "ปัญหาเร่งด่วน", next: "urgent" },
  ],
});

const formatTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString();
};

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
    page.drawText(text.slice(0, 140), {
      x: 40,
      y,
      size,
      font: isBold ? bold : font,
      color: rgb(0.12, 0.16, 0.24),
    });
    y -= size + 6;
  };

  writeLine(`Chat Transcript: ${thread?.customer_name || "Customer"}`, true, 16);
  writeLine(`Exported: ${new Date().toLocaleString()}`);
  writeLine("");
  messages.forEach((message) => {
    writeLine(`[${formatTime(message.created_at)}] ${safeSenderLabel(message, true)} (${message.sender_role})`, true);
    const lines = String(message.body || "").split("\n");
    lines.forEach((line) => writeLine(line || " "));
    writeLine("");
  });

  const bytes = await pdfDoc.save();
  const normalizedBytes = Uint8Array.from(bytes);
  downloadBlob(new Blob([normalizedBytes], { type: "application/pdf" }), `chat-thread-${thread?.id || "support"}.pdf`);
}

function exportTranscriptTxt(thread: ChatThread | null, messages: ChatMessage[]) {
  const content = [
    `Chat Transcript: ${thread?.customer_name || "Customer"}`,
    `Exported: ${new Date().toLocaleString()}`,
    "",
    ...messages.flatMap((message) => [
      `[${formatTime(message.created_at)}] ${safeSenderLabel(message, true)} (${message.sender_role})`,
      String(message.body || ""),
      "",
    ]),
  ].join("\n");
  downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), `chat-thread-${thread?.id || "support"}.txt`);
}

export function CustomerChatWidget({ language = "TH" }: CustomerChatWidgetProps) {
  const isTH = language === "TH";
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AssistantMode>("assistant");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([createAssistantWelcome()]);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyStart, setHistoryStart] = useState("");
  const [historyEnd, setHistoryEnd] = useState("");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const assistantListRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const latestAdminMessageIdRef = useRef<number | null>(null);
  const hasPrimedAdminMessageRef = useRef(false);
  const previousAssistantMessageCountRef = useRef(assistantMessages.length);

  const draftKey = useMemo(() => `chat_draft_${thread?.id || "pending"}`, [thread?.id]);
  const humanListRef = listRef;
  const locale = isTH ? "th-TH" : "en-US";

  const updateStickToBottom = () => {
    const node = humanListRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 80;
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const node = humanListRef.current;
    if (!node) return;
    node.scrollTo({
      top: node.scrollHeight,
      behavior,
    });
  };

  const scrollAssistantToBottom = (behavior: ScrollBehavior = "smooth") => {
    const node = assistantListRef.current;
    if (!node) return;
    node.scrollTo({
      top: node.scrollHeight,
      behavior,
    });
  };

  const loadChat = async (silently = false) => {
    if (!silently) setIsLoading(true);
    try {
      const data = await chatService.getMyThread();
      setThread(data.thread);
      setUnreadCount(data.thread.customer_unread_count || 0);
      if (historyStart || historyEnd) {
        const filtered = await chatService.getThreadMessages(data.thread.id, {
          startDate: historyStart || undefined,
          endDate: historyEnd || undefined,
        });
        setMessages(filtered.messages);
      } else {
        setMessages(data.messages);
      }
      setError("");
      await chatService.markRead(data.thread.id);
      setUnreadCount(0);
      if (!silently) {
        shouldStickToBottomRef.current = true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chat");
    } finally {
      if (!silently) setIsLoading(false);
    }
  };

  const refreshThreadState = async () => {
    try {
      const data = await chatService.getMyThread();
      setThread(data.thread);
      setUnreadCount(data.thread.customer_unread_count || 0);

      const latestAdminMessage = [...data.messages].reverse().find((message) => message.sender_role === "admin");
      if (!latestAdminMessage) return;

      if (!hasPrimedAdminMessageRef.current) {
        latestAdminMessageIdRef.current = latestAdminMessage.id;
        hasPrimedAdminMessageRef.current = true;
        return;
      }

      const hasNewAdminReply = latestAdminMessage.id !== latestAdminMessageIdRef.current;
      latestAdminMessageIdRef.current = latestAdminMessage.id;

      if (hasNewAdminReply && (!isOpen || mode !== "human")) {
        toast.success(isTH ? "เจ้าหน้าที่ตอบกลับแล้ว" : "Support replied", {
          description:
            String(latestAdminMessage.body || "").slice(0, 96) ||
            (isTH ? "เปิดแชทเพื่อดูข้อความล่าสุด" : "Open chat to see the latest reply."),
        });
      }
    } catch {
      // Ignore background refresh errors for badge/status updates.
    }
  };

  useEffect(() => {
    if (!isOpen || mode !== "human") return;
    loadChat().catch(() => {});
    const timer = window.setInterval(() => {
      loadChat(true).catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [isOpen, mode, historyStart, historyEnd]);

  useEffect(() => {
    refreshThreadState().catch(() => {});
    const timer = window.setInterval(() => {
      refreshThreadState().catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [isOpen, mode, isTH]);

  useEffect(() => {
    if (!isOpen) return;
    const next = localStorage.getItem(draftKey) || "";
    setDraft(next);
  }, [draftKey, isOpen]);

  useEffect(() => {
    if (!thread) return;
    localStorage.setItem(draftKey, draft);
  }, [draft, draftKey, thread]);

  useEffect(() => {
    if (!isOpen || mode !== "human") return;
    const hasNewMessages = messages.length > previousMessageCountRef.current;
    const shouldScroll = shouldStickToBottomRef.current || hasNewMessages;
    if (shouldScroll) {
      window.requestAnimationFrame(() => {
        scrollToBottom(hasNewMessages ? "smooth" : "auto");
      });
    }
    previousMessageCountRef.current = messages.length;
  }, [messages, isOpen, mode, humanListRef]);

  useEffect(() => {
    previousMessageCountRef.current = 0;
    shouldStickToBottomRef.current = true;
  }, [thread?.id, mode]);

  useEffect(() => {
    if (!isOpen || mode !== "assistant") return;
    const hasNewAssistantMessages = assistantMessages.length > previousAssistantMessageCountRef.current;
    window.requestAnimationFrame(() => {
      scrollAssistantToBottom(hasNewAssistantMessages ? "smooth" : "auto");
    });
    previousAssistantMessageCountRef.current = assistantMessages.length;
  }, [assistantMessages, isOpen, mode]);

  const resetAssistant = () => {
    setMode("assistant");
    setAssistantMessages([createAssistantWelcome()]);
    setError("");
  };

  const openHumanChat = async () => {
    setMode("human");
    await loadChat();
  };

  const handleAssistantAction = async (actionKey: string) => {
    const flow = assistantFlows[actionKey as keyof typeof assistantFlows];
    if (!flow) return;
    setAssistantMessages((current) => [
      ...current,
      { id: `user-${Date.now()}-${actionKey}`, sender: "user", text: flow.title },
      {
        id: `ai-${Date.now()}-${actionKey}`,
        sender: "ai",
        text: flow.answer,
        canEscalate: true,
      },
    ]);
  };

  const submitAssistantMessage = async () => {
    const body = draft.trim();
    if (!body) return;
    setAssistantMessages((current) => [
      ...current,
      { id: `user-free-${Date.now()}`, sender: "user", text: body },
      {
        id: `ai-free-${Date.now()}`,
        sender: "ai",
        text: "ผมแนะนำให้เริ่มจากตรวจอุปกรณ์, เครือข่าย, และลองรีเฟรชระบบก่อนครับ ถ้ายังไม่หาย สามารถกดคุยกับเจ้าหน้าที่เพื่อส่งต่อเคสได้ทันที",
        canEscalate: true,
      },
    ]);
    setDraft("");
  };

  const submitMessage = async () => {
    const body = draft.trim();
    if (!thread || !body) return;
    setIsSending(true);
    try {
      if (editingMessageId) {
        const updated = await chatService.editMessage(editingMessageId, body);
        setMessages((current) => current.map((message) => (message.id === updated.id ? updated : message)));
        setEditingMessageId(null);
      } else {
        const created = await chatService.sendMessage(thread.id, body, replyTo?.id || null);
        setMessages((current) => [...current, created]);
      }
      shouldStickToBottomRef.current = true;
      setDraft("");
      setReplyTo(null);
      localStorage.removeItem(draftKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const startEdit = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setDraft(String(message.body || ""));
    setReplyTo(null);
  };

  const removeMessage = async (messageId: number) => {
    if (!thread) return;
    const updated = await chatService.deleteMessage(messageId);
    setMessages((current) => current.map((message) => (message.id === updated.id ? updated : message)));
  };

  const updateCaseStatus = async (nextStatus: ChatThread["status"]) => {
    if (!thread) return;
    setIsSending(true);
    try {
      const updated = await chatService.updateThreadMeta(thread.id, { status: nextStatus });
      setThread(updated);
      setUnreadCount(updated.customer_unread_count || 0);
      toast.success(nextStatus === "closed"
        ? (isTH ? "ปิดเคสแล้ว" : "Case closed")
        : (isTH ? "เปิดเคสอีกครั้งแล้ว" : "Case reopened"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update case");
    } finally {
      setIsSending(false);
    }
  };

  const ownLastMessageRead =
    thread?.admin_last_read_at &&
    messages.length > 0 &&
    new Date(thread.admin_last_read_at).getTime() >= new Date(messages[messages.length - 1].created_at).getTime();

  const isClosedForCustomer = mode === "human" && thread?.status === "closed";
  const hasHistoryFilter = Boolean(historyStart || historyEnd);
  const assignedAdminName = thread?.assigned_admin_name?.trim();
  const statusToneClass =
    thread?.status === "closed"
      ? "bg-slate-400"
      : assignedAdminName
        ? "bg-emerald-500"
        : "bg-amber-500";
  const humanHeaderStatus = thread?.status === "closed"
    ? (isTH ? "ปิดเคสแล้ว" : "Case closed")
    : assignedAdminName
      ? `${assignedAdminName}${isTH ? " กำลังดูแลเคส" : " is handling this case"}`
      : thread?.status === "waiting"
        ? (isTH ? "รอเจ้าหน้าที่รับเคส" : "Waiting for support")
        : (isTH ? "มีเจ้าหน้าที่ดูแล" : "Support available");
  const humanHeaderMeta = thread?.status === "closed"
    ? (isTH ? "ดูประวัติได้ แต่ส่งข้อความต่อไม่ได้" : "History is available, but replies are disabled")
    : ownLastMessageRead
      ? (isTH ? "อ่านข้อความล่าสุดแล้ว" : "Latest message read")
      : unreadCount > 0
        ? (isTH ? `มีข้อความใหม่ ${unreadCount} ข้อความ` : `${unreadCount} new message${unreadCount > 1 ? "s" : ""}`)
        : (isTH ? "ตอบกลับแบบเรียลไทม์" : "Realtime replies");

  const assistantView = (
    <>
      <div
        ref={assistantListRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain touch-pan-y bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px] px-4 py-4"
      >
        {assistantMessages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
            <div className={`max-w-[88%] rounded-[1.6rem] px-4 py-3 shadow-sm ${message.sender === "user" ? "bg-emerald-600 text-white" : "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"}`}>
              <div className={`mb-1 text-[11px] ${message.sender === "user" ? "text-emerald-100" : "text-slate-500 dark:text-slate-400"}`}>
                {message.sender === "user" ? "คุณ" : "AI Support"}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-6">{message.text}</div>

              {message.actions && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => handleAssistantAction(action.next).catch(() => {})}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}

              {message.canEscalate && (
                <div className="mt-3">
                  <Button size="sm" className="rounded-full" onClick={() => openHumanChat().catch(() => {})}>
                    <MessageCircleMore className="mr-2 h-4 w-4" />
                    {isTH ? "คุยกับเจ้าหน้าที่" : "Chat with staff"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200/80 bg-white/96 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/96">
        <div className="mb-3 flex flex-wrap gap-2">
          {Object.entries(assistantFlows).map(([key, flow]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleAssistantAction(key).catch(() => {})}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:border-emerald-300 hover:text-foreground"
            >
              {flow.title}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={isTH ? "พิมพ์ปัญหาให้ AI ช่วยวิเคราะห์..." : "Describe your issue for AI support..."}
            className="h-12 rounded-2xl"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitAssistantMessage().catch(() => {});
              }
            }}
          />
          <Button className="h-12 rounded-2xl px-4" onClick={() => submitAssistantMessage().catch(() => {})} disabled={!draft.trim()}>
            <Send className="mr-2 h-4 w-4" />
            {isTH ? "ถาม AI" : "Ask AI"}
          </Button>
        </div>
      </div>
    </>
  );

  const humanView = (
    <>
      <div
        ref={listRef}
        onScroll={updateStickToBottom}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain touch-pan-y bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px] px-4 py-4"
      >
        {isLoading && <div className="text-sm text-slate-500">{isTH ? "กำลังโหลด..." : "Loading..."}</div>}
        {!isLoading && messages.length === 0 && (
          <div className="rounded-3xl bg-white/90 p-6 text-center text-sm text-slate-500 shadow-sm dark:bg-slate-900/80">
            {isTH ? "เริ่มพิมพ์เพื่อเปิดบทสนทนากับเจ้าหน้าที่ได้เลย" : "Send your first message to start the conversation."}
          </div>
        )}

        {messages.map((message, index) => {
          const isOwn = message.sender_role === "user";
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
              <div className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
                <div className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 shadow-sm ${isOwn ? "bg-emerald-600 text-white" : "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"}`}>
                  <div className={`mb-1 flex items-center gap-2 text-[11px] ${isOwn ? "text-emerald-100" : "text-slate-500 dark:text-slate-400"}`}>
                    <span>{safeSenderLabel(message, isTH)}</span>
                    <span className="opacity-70">{formatMessageTime(message.created_at, locale)}</span>
                    {message.edited_at ? <span className="opacity-70">{isTH ? "แก้ไขแล้ว" : "edited"}</span> : null}
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-6">{message.body}</div>
                  <div className={`mt-2 flex items-center justify-end gap-1 text-[11px] ${isOwn ? "text-emerald-100" : "text-slate-400"}`}>
                    {isOwn && (
                      <>
                        <button type="button" onClick={() => setReplyTo(message)} className="rounded-full p-1 hover:bg-white/10">
                          <Reply className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => startEdit(message)} className="rounded-full p-1 hover:bg-white/10">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => removeMessage(message.id)} className="rounded-full p-1 hover:bg-white/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-200/80 bg-white/96 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/96">
        {replyTo && (
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <div className="truncate">
              {isTH ? "กำลังตอบกลับ" : "Replying to"}: {replyTo.body}
            </div>
            <button type="button" onClick={() => setReplyTo(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {error && <div className="mb-2 text-xs text-red-500">{error}</div>}
        {isClosedForCustomer && (
          <div className="mb-3 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            {isTH ? "เคสนี้ถูกปิดแล้ว คุณยังย้อนดูประวัติได้ แต่จะไม่สามารถส่ง แก้ไข หรือลบข้อความได้" : "This case is closed. You can still view chat history, but you cannot send, edit, or delete messages."}
          </div>
        )}

        <div className="flex items-end gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={isTH ? "พิมพ์ข้อความถึงเจ้าหน้าที่..." : "Type a message to support..."}
            className="h-12 rounded-2xl"
            disabled={isClosedForCustomer}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitMessage().catch(() => {});
              }
            }}
          />
          <Button className="h-12 rounded-2xl px-4" onClick={() => submitMessage().catch(() => {})} disabled={isSending || !draft.trim() || isClosedForCustomer}>
            <Send className="mr-2 h-4 w-4" />
            {editingMessageId ? (isTH ? "อัปเดต" : "Update") : isTH ? "ส่ง" : "Send"}
          </Button>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>{isTH ? "draft จะถูกเก็บไว้ให้อัตโนมัติ" : "Draft is saved automatically"}</span>
          <Badge variant="outline" className="gap-1">
            {ownLastMessageRead ? <CheckCheck className="h-3.5 w-3.5" /> : null}
            {ownLastMessageRead ? (isTH ? "อ่านแล้ว" : "Read") : isTH ? "ส่งแล้ว" : "Sent"}
          </Badge>
        </div>
      </div>
    </>
  );

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
      {isOpen && (
        <div className="pointer-events-auto flex h-[min(100dvh-1rem,720px)] min-h-0 w-[min(440px,calc(100vw-1rem))] flex-col overflow-hidden overscroll-contain rounded-[1.5rem] border border-slate-200/80 bg-white/96 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:h-[min(78vh,720px)] sm:w-[min(440px,calc(100vw-1.5rem))] sm:rounded-[2rem] dark:border-slate-800 dark:bg-slate-950/96">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-3 sm:px-5 sm:py-4 dark:border-slate-800">
            <div className="min-w-0 flex items-center gap-3">
              <img src={supportIcon} alt="Support" className="h-10 w-10 rounded-full object-cover sm:h-11 sm:w-11" draggable={false} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900 sm:text-base dark:text-slate-100">
                  {mode === "assistant" ? (isTH ? "AI ช่วยตอบปัญหาเบื้องต้น" : "AI support assistant") : isTH ? "แชทคุยกับเจ้าหน้าที่" : "Chat with support"}
                </div>
                <div className="line-clamp-2 text-[11px] text-slate-500 sm:text-xs dark:text-slate-400">
                  {mode === "assistant"
                    ? isTH ? "เลือกปัญหาที่พบ แล้วให้ AI ช่วยตอบก่อน" : "Pick an issue and let AI guide you first"
                    : humanHeaderMeta}
                </div>
                {mode === "human" && (
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className={`h-2 w-2 rounded-full ${statusToneClass}`} />
                    <span className="truncate">{humanHeaderStatus}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="ml-2 flex shrink-0 items-center gap-1 sm:gap-2">
              {mode === "assistant" ? (
                <Button size="icon" variant="ghost" onClick={resetAssistant} title="Reset">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        title={isTH ? "กรองช่วงเวลา" : "Filter by date"}
                        className={hasHistoryFilter ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60" : ""}
                      >
                        <CalendarRange className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-2rem))] rounded-[1.25rem] p-3">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {isTH ? "กรองประวัติแชท" : "Filter chat history"}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {isTH ? "เลือกช่วงเวลาที่ต้องการดู" : "Choose the date range to review"}
                            </div>
                          </div>
                          {hasHistoryFilter && (
                            <Badge variant="outline" className="border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300">
                              {isTH ? "กำลังกรอง" : "Filtered"}
                            </Badge>
                          )}
                        </div>

                        <div className="grid gap-2">
                          <label className="grid gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{isTH ? "เริ่มจาก" : "From"}</span>
                            <input
                              type="datetime-local"
                              value={historyStart}
                              onChange={(event) => setHistoryStart(event.target.value)}
                              className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                            />
                          </label>
                          <label className="grid gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{isTH ? "ถึง" : "To"}</span>
                            <input
                              type="datetime-local"
                              value={historyEnd}
                              onChange={(event) => setHistoryEnd(event.target.value)}
                              className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                            />
                          </label>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 rounded-xl px-3 text-xs"
                            onClick={() => {
                              setHistoryStart("");
                              setHistoryEnd("");
                            }}
                          >
                            {isTH ? "ล้างช่วงเวลา" : "Clear range"}
                          </Button>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {hasHistoryFilter
                              ? (isTH ? "ระบบจะรีเฟรชแชทตามช่วงเวลานี้" : "Chat refreshes using this range")
                              : (isTH ? "ถ้าไม่เลือกจะแสดงทั้งหมด" : "Shows all messages by default")}
                          </div>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="icon" variant="ghost" onClick={() => exportTranscriptTxt(thread, messages)} title="TXT">
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => exportTranscriptPdf(thread, messages)} title="PDF">
                    <Download className="h-4 w-4" />
                  </Button>
                  {thread?.status === "closed" ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => updateCaseStatus("open").catch(() => {})}
                      title={isTH ? "เปิดเคสอีกครั้ง" : "Reopen case"}
                      disabled={isSending}
                    >
                      <UserCheck className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => updateCaseStatus("closed").catch(() => {})}
                      title={isTH ? "ปิดเคส" : "Close case"}
                      disabled={isSending}
                    >
                      <UserRoundX className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={resetAssistant} title="Back to AI">
                    <Bot className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button size="icon" variant="ghost" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {mode === "assistant" ? assistantView : humanView}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="pointer-events-auto relative transition hover:-translate-y-0.5"
        aria-label={isTH ? "เปิดแชทช่วยเหลือ" : "Open support chat"}
      >
        <img
          src={supportIcon}
          alt="Support"
          className="h-16 w-16 rounded-full object-cover shadow-[0_18px_40px_rgba(15,23,42,0.2)] sm:h-24 sm:w-24"
          draggable={false}
        />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-semibold text-white shadow-lg ring-2 ring-white dark:ring-slate-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
