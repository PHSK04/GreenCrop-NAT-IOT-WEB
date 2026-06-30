import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  Bot,
  CalendarRange,
  Download,
  FileText,
  Minus,
  MessageCircleMore,
  Pencil,
  Plus,
  Reply,
  RotateCcw,
  Send,
  Trash2,
  UserCheck,
  UserRoundX,
  X,
} from "lucide-react";
import natAssistantImage from "@/assets/images/generated/nat_ai_assistant_full.png";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { chatService, ChatMessage, ChatThread } from "@/features/chat/services/chatService";
import { toast } from "sonner";
import { useActiveDeviceId } from "@/hooks/useActiveDeviceId";
import { useMachine } from "@/contexts/MachineContext";

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
const LAUNCHER_POSITION_KEY = "nat_assistant_launcher_position";
const LAUNCHER_SCALE_KEY = "nat_assistant_launcher_scale";
const LAUNCHER_BASE_WIDTH = 144;
const LAUNCHER_BASE_HEIGHT = 184;
const LAUNCHER_MIN_SCALE = 0.85;
const LAUNCHER_MAX_SCALE = 1.35;

type LauncherPosition = {
  x: number;
  y: number;
};

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

const createAssistantWelcome = (isTH = true): AssistantMessage => ({
  id: "assistant-welcome",
  sender: "ai",
  text: isTH
    ? "สวัสดีครับ ผมคือ NAT AI ผู้ช่วยประจำระบบ GreenCropNAT ผมช่วยตรวจสถานะเครื่อง วิเคราะห์อาการเบื้องต้น และส่งต่อเจ้าหน้าที่ได้ในหน้าต่างเดียวครับ"
    : "Hi, I am NAT AI for GreenCropNAT. I can check machine status, guide troubleshooting, and hand off to support in one place.",
  actions: [
    { id: "status", label: isTH ? "ตรวจสถานะเครื่อง" : "Check machine status", next: "status" },
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

const compareThreads = (left: ChatThread, right: ChatThread) => {
  const leftTime = new Date(left.last_message_at || left.updated_at || left.created_at || 0).getTime();
  const rightTime = new Date(right.last_message_at || right.updated_at || right.created_at || 0).getTime();
  if (leftTime !== rightTime) return rightTime - leftTime;
  return right.id - left.id;
};

const clampLauncherScale = (value: number) =>
  Math.min(LAUNCHER_MAX_SCALE, Math.max(LAUNCHER_MIN_SCALE, Number(value.toFixed(2))));

const getDefaultLauncherPosition = (scale = 1): LauncherPosition => {
  if (typeof window === "undefined") return { x: 16, y: 360 };
  const margin = 12;
  return {
    x: Math.max(margin, window.innerWidth - LAUNCHER_BASE_WIDTH * scale - margin),
    y: Math.max(margin, window.innerHeight - LAUNCHER_BASE_HEIGHT * scale - 78),
  };
};

const clampLauncherPosition = (position: LauncherPosition, scale = 1): LauncherPosition => {
  if (typeof window === "undefined") return position;
  const margin = 8;
  const maxX = Math.max(margin, window.innerWidth - LAUNCHER_BASE_WIDTH * scale - margin);
  const maxY = Math.max(margin, window.innerHeight - LAUNCHER_BASE_HEIGHT * scale - margin);
  return {
    x: Math.min(maxX, Math.max(margin, position.x)),
    y: Math.min(maxY, Math.max(margin, position.y)),
  };
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

function NatAssistantAvatar({
  compact = false,
  statusClass = "bg-emerald-500",
}: {
  compact?: boolean;
  statusClass?: string;
}) {
  return (
    <div
      className={`nat-assistant-avatar relative shrink-0 ${compact ? "h-16 w-14" : "h-36 w-28 sm:h-40 sm:w-32"}`}
      aria-hidden="true"
    >
      <div className="nat-assistant-halo absolute inset-x-0 bottom-0 h-3/5 rounded-full bg-[radial-gradient(circle,rgba(110,231,183,0.38),rgba(125,211,252,0.2)_48%,rgba(251,207,232,0.12)_68%,transparent_82%)] blur-xl" />
      <span className="nat-assistant-sparkle absolute left-1 top-8 z-20 h-1.5 w-1.5 rounded-full bg-pink-200 shadow-[0_0_12px_rgba(251,207,232,0.88)]" />
      <span className="nat-assistant-sparkle nat-assistant-sparkle-delay absolute right-0 top-14 z-20 h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(165,243,252,0.88)]" />
      <span className="nat-assistant-sparkle nat-assistant-sparkle-late absolute bottom-10 left-2 z-20 h-1.5 w-1.5 rounded-full bg-emerald-200 shadow-[0_0_10px_rgba(167,243,208,0.88)]" />
      <img
        src={natAssistantImage}
        alt=""
        className={`nat-assistant-robot-image relative z-10 h-full w-full object-contain ${compact ? "[--nat-scale:1.45]" : "[--nat-scale:1.08]"}`}
        draggable={false}
      />
      <div className="absolute right-2 top-5 z-20 rounded-full bg-white/90 p-0.5 shadow-[0_4px_10px_rgba(15,118,110,0.16)]">
        <span className={`block ${compact ? "h-2.5 w-2.5" : "h-3 w-3"} rounded-full ${statusClass}`} />
      </div>
    </div>
  );
}

export function CustomerChatWidget({ language = "TH" }: CustomerChatWidgetProps) {
  const isTH = language === "TH";
  const activeDeviceId = useActiveDeviceId();
  const {
    mqttStatus,
    boardConnected,
    pump1On,
    pump2On,
    locked,
    redOn,
    floatAlarm,
    phValue,
    ecValue,
    tempValue,
    phOk,
  } = useMachine();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AssistantMode>("assistant");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([createAssistantWelcome(isTH)]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
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
  const [messagePendingDelete, setMessagePendingDelete] = useState<ChatMessage | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isHistoryFilterOpen, setIsHistoryFilterOpen] = useState(false);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const [typingAdminName, setTypingAdminName] = useState("");
  const [launcherPosition, setLauncherPosition] = useState<LauncherPosition | null>(null);
  const [launcherScale, setLauncherScale] = useState(1);
  const [isDraggingLauncher, setIsDraggingLauncher] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const assistantListRef = useRef<HTMLDivElement | null>(null);
  const launcherDragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressLauncherClickRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const latestAdminMessageIdRef = useRef<number | null>(null);
  const hasPrimedAdminMessageRef = useRef(false);
  const previousAssistantMessageCountRef = useRef(assistantMessages.length);
  const typingTimeoutRef = useRef<number | null>(null);

  const draftKey = useMemo(() => `chat_draft_${selectedThreadId || thread?.id || "pending"}`, [selectedThreadId, thread?.id]);
  const humanListRef = listRef;
  const locale = isTH ? "th-TH" : "en-US";
  const selectedThread = useMemo(
    () => threads.find((item) => item.id === selectedThreadId) || thread,
    [selectedThreadId, thread, threads],
  );

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

  const loadThreads = async () => {
    const rows = await chatService.listThreads();
    const orderedRows = [...rows].sort(compareThreads);
    setThreads(orderedRows);
    setSelectedThreadId((current) => {
      if (current && orderedRows.some((item) => item.id === current)) return current;
      return orderedRows[0]?.id ?? null;
    });
    return orderedRows;
  };

  const loadChat = async (silently = false) => {
    if (!silently) setIsLoading(true);
    try {
      const data = await chatService.getMyThread({
        startDate: historyStart || undefined,
        endDate: historyEnd || undefined,
      });
      setThread(data.thread);
      setUnreadCount(data.thread.customer_unread_count || 0);
      setMessages(data.messages);
      setThreads((current) => {
        const next = current.some((item) => item.id === data.thread.id)
          ? current.map((item) => (item.id === data.thread.id ? data.thread : item))
          : [data.thread, ...current];
        return [...next].sort(compareThreads);
      });
      setSelectedThreadId(data.thread.id);
      const typingState = await chatService.getTypingStatus(data.thread.id).catch(() => null);
      if (typingState) {
        setIsAdminTyping(Boolean(typingState.admin_typing));
        setTypingAdminName(String(typingState.admin_name || data.thread.assigned_admin_name || "Admin nat"));
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

  const loadSelectedThreadMessages = async (threadId: number, silently = false) => {
    if (!silently) setIsLoading(true);
    try {
      const data = await chatService.getThreadMessages(threadId, {
        startDate: historyStart || undefined,
        endDate: historyEnd || undefined,
      });
      setThread(data.thread);
      setMessages(data.messages);
      setThreads((current) => {
        const next = current.some((item) => item.id === data.thread.id)
          ? current.map((item) => (item.id === data.thread.id ? data.thread : item))
          : [data.thread, ...current];
        return [...next].sort(compareThreads);
      });
      const typingState = await chatService.getTypingStatus(data.thread.id).catch(() => null);
      if (typingState) {
        setIsAdminTyping(Boolean(typingState.admin_typing));
        setTypingAdminName(String(typingState.admin_name || data.thread.assigned_admin_name || "Admin nat"));
      }
      setError("");
      await chatService.markRead(data.thread.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chat");
    } finally {
      if (!silently) setIsLoading(false);
    }
  };

  const reportCustomerTyping = (isTyping: boolean) => {
    const activeThread = selectedThread || thread;
    if (!activeThread || mode !== "human") return;
    chatService.setTypingStatus(activeThread.id, isTyping).catch(() => {});
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTyping) {
      typingTimeoutRef.current = window.setTimeout(() => {
        chatService.setTypingStatus(activeThread.id, false).catch(() => {});
        typingTimeoutRef.current = null;
      }, 3000);
    }
  };

  const refreshThreadState = async () => {
    try {
      const nextThreads = await loadThreads();
      const targetThreadId = selectedThreadId || nextThreads[0]?.id;
      const data = targetThreadId
        ? await chatService.getThreadMessages(targetThreadId)
        : await chatService.getMyThread();

      setThread(data.thread);
      setUnreadCount(
        nextThreads.reduce((sum, item) => sum + Number(item.customer_unread_count || 0), 0) ||
        data.thread.customer_unread_count ||
        0,
      );

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
    loadThreads()
      .then((items) => {
        if (items.length === 0) return loadChat();
        return undefined;
      })
      .catch(() => {
        loadChat().catch(() => {});
      });
    const timer = window.setInterval(() => {
      loadThreads().catch(() => {});
      if (selectedThreadId) {
        loadSelectedThreadMessages(selectedThreadId, true).catch(() => {});
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [isOpen, mode, historyStart, historyEnd, selectedThreadId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const savedScale = Number(localStorage.getItem(LAUNCHER_SCALE_KEY) || "1");
    const nextScale = Number.isFinite(savedScale) ? clampLauncherScale(savedScale) : 1;
    setLauncherScale(nextScale);

    try {
      const rawPosition = localStorage.getItem(LAUNCHER_POSITION_KEY);
      const parsedPosition = rawPosition ? JSON.parse(rawPosition) as LauncherPosition : null;
      if (
        parsedPosition &&
        Number.isFinite(parsedPosition.x) &&
        Number.isFinite(parsedPosition.y)
      ) {
        setLauncherPosition(clampLauncherPosition(parsedPosition, nextScale));
        return;
      }
    } catch {
      localStorage.removeItem(LAUNCHER_POSITION_KEY);
    }

    setLauncherPosition(getDefaultLauncherPosition(nextScale));
  }, []);

  useEffect(() => {
    if (!launcherPosition) return;
    localStorage.setItem(LAUNCHER_POSITION_KEY, JSON.stringify(launcherPosition));
  }, [launcherPosition]);

  useEffect(() => {
    localStorage.setItem(LAUNCHER_SCALE_KEY, String(launcherScale));
    setLauncherPosition((current) => current ? clampLauncherPosition(current, launcherScale) : current);
  }, [launcherScale]);

  useEffect(() => {
    const handleResize = () => {
      setLauncherPosition((current) => clampLauncherPosition(current || getDefaultLauncherPosition(launcherScale), launcherScale));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [launcherScale]);

  useEffect(() => {
    if (isOpen && mode === "human" && thread) return;
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (selectedThread || thread) {
      chatService.setTypingStatus((selectedThread || thread)!.id, false).catch(() => {});
    }
  }, [isOpen, mode, selectedThread, thread]);

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
    if (!isOpen || mode !== "human" || !selectedThreadId) return;
    loadSelectedThreadMessages(selectedThreadId).catch(() => {});
  }, [historyEnd, historyStart, isOpen, mode, selectedThreadId]);

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
    setAssistantMessages([createAssistantWelcome(isTH)]);
    setError("");
  };

  const openHumanChat = async () => {
    setMode("human");
    const items = await loadThreads().catch(() => []);
    if (items.length === 0) {
      await loadChat();
      return;
    }
    setSelectedThreadId((current) => current ?? items[0]?.id ?? null);
  };

  const handleAssistantAction = async (actionKey: string) => {
    if (actionKey === "status") {
      setAssistantMessages((current) => [
        ...current,
        { id: `user-${Date.now()}-status`, sender: "user", text: isTH ? "ตรวจสถานะเครื่อง" : "Check machine status" },
        {
          id: `ai-${Date.now()}-status`,
          sender: "ai",
          text: buildMachineStatusAnswer(),
          canEscalate: machineNeedsAttention || !liveSignal,
        },
      ]);
      return;
    }

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
    const activeThread = selectedThread || thread;
    if (!activeThread || !body) return;
    setIsSending(true);
    try {
      if (editingMessageId) {
        const updated = await chatService.editMessage(editingMessageId, body);
        setMessages((current) => current.map((message) => (message.id === updated.id ? updated : message)));
        setEditingMessageId(null);
      } else {
        const created = await chatService.sendMessage(activeThread.id, body, replyTo?.id || null);
        setMessages((current) => [...current, created]);
        setThreads((current) => current.map((item) => (
          item.id === activeThread.id
            ? {
                ...item,
                last_message_at: created.created_at,
                last_message_preview: created.body,
                last_message_sender_role: created.sender_role,
                last_message_sender_name: created.sender_name,
              }
            : item
        )).sort(compareThreads));
      }
      shouldStickToBottomRef.current = true;
      setDraft("");
      setReplyTo(null);
      localStorage.removeItem(draftKey);
      reportCustomerTyping(false);
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

  const removeMessage = async (messageId: number, scope: "self" | "everyone") => {
    if (!selectedThread && !thread) return;
    const updated = await chatService.deleteMessage(messageId, scope);
    setMessages((current) =>
      scope === "self"
        ? current.filter((message) => message.id !== messageId)
        : current.map((message) => (message.id === updated.id ? updated : message)),
    );
    setMessagePendingDelete(null);
  };

  const updateCaseStatus = async (nextStatus: ChatThread["status"]) => {
    const activeThread = selectedThread || thread;
    if (!activeThread) return;
    setIsSending(true);
    try {
      const updated = await chatService.updateThreadMeta(activeThread.id, { status: nextStatus });
      setThread(updated);
      setThreads((current) => current.map((item) => (item.id === updated.id ? updated : item)));
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
    (selectedThread || thread)?.admin_last_read_at &&
    messages.length > 0 &&
    new Date(String((selectedThread || thread)?.admin_last_read_at)).getTime() >= new Date(messages[messages.length - 1].created_at).getTime();

  const isClosedForCustomer = mode === "human" && (selectedThread || thread)?.status === "closed";
  const hasHistoryFilter = Boolean(historyStart || historyEnd);
  const assignedAdminName = (selectedThread || thread)?.assigned_admin_name?.trim();
  const liveSignal = mqttStatus === "connected" && boardConnected;
  const machineNeedsAttention = boardConnected && (locked || redOn || floatAlarm || !phOk);
  const activePumpCount = [pump1On, pump2On].filter(Boolean).length;
  const natStatusText = machineNeedsAttention
    ? isTH ? "พบสัญญาณเตือน" : "Needs attention"
    : liveSignal
      ? isTH ? "เฝ้าเครื่องอยู่" : "Monitoring"
      : isTH ? "รอสัญญาณเครื่อง" : "Waiting for signal";
  const natStatusTone = machineNeedsAttention
    ? "bg-amber-500"
    : liveSignal
      ? "bg-emerald-500"
      : "bg-slate-400";
  const formatTelemetryValue = (value: number, digits: number) =>
    Number.isFinite(value) && value > 0 ? value.toFixed(digits) : "--";
  const buildMachineStatusAnswer = () => {
    const lines = [
      isTH ? `สถานะเครื่อง${activeDeviceId ? ` ${activeDeviceId}` : ""}: ${natStatusText}` : `Machine${activeDeviceId ? ` ${activeDeviceId}` : ""}: ${natStatusText}`,
      isTH ? `MQTT: ${mqttStatus === "connected" ? "เชื่อมต่อ" : "ยังไม่เชื่อมต่อ"}` : `MQTT: ${mqttStatus}`,
      isTH ? `บอร์ด: ${boardConnected ? "ออนไลน์" : "ยังไม่มีสัญญาณ"}` : `Board: ${boardConnected ? "online" : "no signal"}`,
      isTH ? `ปั๊มทำงาน: ${activePumpCount}/2 ตัว` : `Running pumps: ${activePumpCount}/2`,
      `pH ${formatTelemetryValue(phValue, 2)} | EC ${formatTelemetryValue(ecValue, 2)} | Temp ${formatTelemetryValue(tempValue, 1)}`,
    ];

    if (machineNeedsAttention) {
      lines.push(isTH
        ? "คำแนะนำ: ตรวจ alarm น้ำ, lock, และค่า pH ก่อนสั่งงานต่อ ถ้าไม่แน่ใจกดคุยกับเจ้าหน้าที่ได้เลยครับ"
        : "Suggestion: check water alarm, lock state, and pH before sending more commands. Escalate to support if unsure.");
    } else if (liveSignal) {
      lines.push(isTH
        ? "คำแนะนำ: ระบบดูปกติ ผมจะช่วยเฝ้าดูสัญญาณและแจ้งเมื่อมีค่าที่ควรตรวจสอบครับ"
        : "Suggestion: the system looks normal. I will keep watching for values that need attention.");
    } else {
      lines.push(isTH
        ? "คำแนะนำ: ถ้าเพิ่งเปิดเครื่องให้รอ sync สักครู่ ถ้ายังไม่มาให้ตรวจ Wi-Fi, ไฟเลี้ยง และ MQTT ครับ"
        : "Suggestion: if the device just started, wait for sync. Otherwise check Wi-Fi, power, and MQTT.");
    }

    return lines.join("\n");
  };
  const statusToneClass =
    (selectedThread || thread)?.status === "closed"
      ? "bg-slate-400"
      : assignedAdminName
        ? "bg-emerald-500"
        : "bg-amber-500";
  const humanHeaderStatus = (selectedThread || thread)?.status === "closed"
    ? (isTH ? "ปิดเคสแล้ว" : "Case closed")
    : assignedAdminName
      ? `${assignedAdminName}${isTH ? " กำลังดูแลเคส" : " is handling this case"}`
      : (selectedThread || thread)?.status === "waiting"
        ? (isTH ? "รอเจ้าหน้าที่รับเคส" : "Waiting for support")
        : (isTH ? "มีเจ้าหน้าที่ดูแล" : "Support available");
  const humanHeaderMeta = (selectedThread || thread)?.status === "closed"
    ? (isTH ? "ดูประวัติได้ แต่ส่งข้อความต่อไม่ได้" : "History is available, but replies are disabled")
    : isAdminTyping
      ? `${typingAdminName || "Admin nat"}${isTH ? " กำลังพิมพ์..." : " is typing..."}`
    : ownLastMessageRead
      ? (isTH ? "อ่านข้อความล่าสุดแล้ว" : "Latest message read")
      : unreadCount > 0
        ? (isTH ? `มีข้อความใหม่ ${unreadCount} ข้อความ` : `${unreadCount} new message${unreadCount > 1 ? "s" : ""}`)
        : (isTH ? "ตอบกลับแบบเรียลไทม์" : "Realtime replies");
  const launcherSpeech = unreadCount > 0
    ? (isTH ? `มีข้อความใหม่ ${unreadCount} ข้อความครับ` : `${unreadCount} new support message${unreadCount > 1 ? "s" : ""}.`)
    : machineNeedsAttention
      ? (isTH ? "ผมพบสัญญาณเตือน กดให้ผมช่วยตรวจได้ครับ" : "I found an alert. Tap me to inspect it.")
      : liveSignal
        ? (isTH ? "เครื่องออนไลน์ ผมเฝ้าดูให้อยู่ครับ" : "Device is online. I am watching it.")
        : (isTH ? "ผมรอสัญญาณเครื่องอยู่ครับ" : "I am waiting for the device signal.");
  const launcherSpeechSideClass = launcherPosition && launcherPosition.x < 210
    ? "left-[78%] origin-left"
    : "right-[78%] origin-right";
  const launcherStyle = launcherPosition
    ? {
        left: `${launcherPosition.x}px`,
        top: `${launcherPosition.y}px`,
        transform: `scale(${launcherScale})`,
      }
    : {
        right: "0.5rem",
        bottom: "calc(4.5rem + env(safe-area-inset-bottom))",
        transform: `scale(${launcherScale})`,
      };

  const updateLauncherScale = (delta: number) => {
    setLauncherScale((current) => clampLauncherScale(current + delta));
  };

  const handleLauncherPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    launcherDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingLauncher(true);
  };

  const handleLauncherPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = launcherDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const movedDistance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (movedDistance > 4) {
      drag.moved = true;
    }
    setLauncherPosition(clampLauncherPosition({
      x: event.clientX - drag.offsetX,
      y: event.clientY - drag.offsetY,
    }, launcherScale));
  };

  const handleLauncherPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = launcherDragRef.current;
    if (drag?.pointerId === event.pointerId) {
      suppressLauncherClickRef.current = drag.moved;
      launcherDragRef.current = null;
      window.setTimeout(() => {
        suppressLauncherClickRef.current = false;
      }, 0);
    }
    setIsDraggingLauncher(false);
  };

  const handleLauncherClick = () => {
    if (suppressLauncherClickRef.current) return;
    setIsOpen(true);
  };

  const assistantView = (
    <>
      <div
        ref={assistantListRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain touch-pan-y bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_35%),linear-gradient(to_right,rgba(16,185,129,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.06)_1px,transparent_1px)] bg-[size:auto,24px_24px,24px_24px] px-4 py-4"
      >
        {assistantMessages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
            <div className={`max-w-[88%] rounded-[1.35rem] px-4 py-3 shadow-sm ${message.sender === "user" ? "bg-emerald-600 text-white" : "border border-emerald-100 bg-white text-slate-900 dark:border-emerald-950 dark:bg-slate-900 dark:text-slate-100"}`}>
              <div className={`mb-1 text-[11px] ${message.sender === "user" ? "text-emerald-100" : "text-slate-500 dark:text-slate-400"}`}>
                {message.sender === "user" ? "คุณ" : "NAT AI"}
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
          <button
            type="button"
            onClick={() => handleAssistantAction("status").catch(() => {})}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
          >
            {isTH ? "ตรวจสถานะเครื่อง" : "Check machine status"}
          </button>
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
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain touch-pan-y bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px] px-3 py-3 sm:space-y-4 sm:px-4 sm:py-4"
      >
        {isLoading && <div className="text-sm text-slate-500">{isTH ? "กำลังโหลด..." : "Loading..."}</div>}
        {!isLoading && messages.length === 0 && (
          <div className="rounded-3xl bg-white/90 p-6 text-center text-sm text-slate-500 shadow-sm dark:bg-slate-900/80">
            {isTH ? "เริ่มพิมพ์เพื่อเปิดบทสนทนากับเจ้าหน้าที่ได้เลย" : "Send your first message to start the conversation."}
          </div>
        )}

        {messages.map((message, index) => {
          const isOwn = message.sender_role === "user";
          const isMessageReadByAdmin = Boolean(
            isOwn &&
            (selectedThread || thread)?.admin_last_read_at &&
            new Date(String((selectedThread || thread)?.admin_last_read_at)).getTime() >= new Date(message.created_at).getTime(),
          );
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
                <div className={`max-w-[88%] rounded-[1.35rem] px-3 py-3 shadow-sm sm:max-w-[85%] sm:rounded-[1.5rem] sm:px-4 ${isOwn ? "bg-emerald-600 text-white" : "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"}`}>
                  <div className={`mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] ${isOwn ? "text-emerald-100" : "text-slate-500 dark:text-slate-400"}`}>
                    <span className="max-w-full truncate">{safeSenderLabel(message, isTH)}</span>
                    <span className="opacity-70">{formatMessageTime(message.created_at, locale)}</span>
                    {message.edited_at ? <span className="opacity-70">{isTH ? "แก้ไขแล้ว" : "edited"}</span> : null}
                    {message.deleted_for_everyone_at ? <span className="opacity-70">{isTH ? "ลบแล้ว" : "deleted"}</span> : null}
                  </div>
                  <div className="whitespace-pre-wrap break-words text-[15px] leading-6 sm:text-sm">{message.body}</div>
                  <div className={`mt-2 flex items-center justify-end gap-1.5 text-[11px] ${isOwn ? "text-emerald-100" : "text-slate-400"}`}>
                    {isOwn && (
                      <>
                        {isMessageReadByAdmin ? <span className="mr-1 opacity-90">{isTH ? "อ่านแล้ว" : "Read"}</span> : null}
                        {!message.deleted_for_everyone_at ? <button type="button" onClick={() => setReplyTo(message)} className="rounded-full p-1.5 hover:bg-white/10">
                          <Reply className="h-3.5 w-3.5" />
                        </button> : null}
                        {!message.deleted_for_everyone_at ? <button type="button" onClick={() => startEdit(message)} className="rounded-full p-1.5 hover:bg-white/10">
                          <Pencil className="h-3.5 w-3.5" />
                        </button> : null}
                        {!message.deleted_for_everyone_at ? <button type="button" onClick={() => setMessagePendingDelete(message)} className="rounded-full p-1.5 hover:bg-white/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button> : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-200/80 bg-white/96 px-3 py-3 pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.25rem))] sm:px-4 sm:py-4 dark:border-slate-800 dark:bg-slate-950/96">
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
        {isAdminTyping && !isClosedForCustomer && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">
            <span>{typingAdminName || "Admin nat"}{isTH ? " กำลังพิมพ์" : " is typing"}</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
            </span>
          </div>
        )}
        {isClosedForCustomer && (
          <div className="mb-3 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            {isTH ? "เคสนี้ถูกปิดแล้ว คุณยังย้อนดูประวัติได้ แต่จะไม่สามารถส่ง แก้ไข หรือลบข้อความได้" : "This case is closed. You can still view chat history, but you cannot send, edit, or delete messages."}
          </div>
        )}

        <div className="flex items-end gap-2">
          <Input
            value={draft}
            onChange={(event) => {
              const nextValue = event.target.value;
              setDraft(nextValue);
              if (mode === "human" && !isClosedForCustomer) {
                reportCustomerTyping(nextValue.trim().length > 0);
              }
            }}
            placeholder={isTH ? "พิมพ์ข้อความถึงเจ้าหน้าที่..." : "Type a message to support..."}
            className="h-12 rounded-2xl text-base sm:text-sm"
            disabled={isClosedForCustomer}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitMessage().catch(() => {});
              }
            }}
          />
          <Button className="h-12 min-w-12 rounded-2xl px-3 sm:px-4" onClick={() => submitMessage().catch(() => {})} disabled={isSending || !draft.trim() || isClosedForCustomer}>
            <Send className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{editingMessageId ? (isTH ? "อัปเดต" : "Update") : isTH ? "ส่ง" : "Send"}</span>
          </Button>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>{isTH ? "draft จะถูกเก็บไว้ให้อัตโนมัติ" : "Draft is saved automatically"}</span>
          <Badge variant="outline">{isTH ? "ส่งแล้ว" : "Sent"}</Badge>
        </div>
      </div>
    </>
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <style>{`
        @keyframes natAssistantFloat {
          0%, 100% { transform: translateY(0) rotate(-1.5deg) scale(var(--nat-scale, 1)); }
          50% { transform: translateY(-8px) rotate(1.8deg) scale(var(--nat-scale, 1)); }
        }

        @keyframes natAssistantGlow {
          0%, 100% { opacity: 0.38; transform: scale(0.94); }
          50% { opacity: 0.78; transform: scale(1.04); }
        }

        @keyframes natAssistantSparkle {
          0%, 100% { opacity: 0.18; transform: translateY(0) scale(0.78); }
          48% { opacity: 0.9; transform: translateY(-8px) scale(1.12); }
        }

        @keyframes natAssistantNudge {
          0%, 100% { transform: translateX(0) rotate(-1.5deg) scale(var(--nat-scale, 1)); }
          45% { transform: translateX(-2px) rotate(-3deg) scale(var(--nat-scale, 1)); }
          55% { transform: translateX(2px) rotate(2.5deg) scale(var(--nat-scale, 1)); }
        }

        .nat-assistant-robot-image {
          animation: natAssistantFloat 3.4s ease-in-out infinite;
          transform-origin: 50% 82%;
          filter: drop-shadow(0 18px 20px rgba(6, 78, 59, 0.22)) drop-shadow(0 0 12px rgba(110, 231, 183, 0.2));
        }

        .nat-assistant-halo {
          animation: natAssistantGlow 2.8s ease-in-out infinite;
        }

        .nat-assistant-sparkle {
          animation: natAssistantSparkle 2.5s ease-in-out infinite;
        }

        .nat-assistant-sparkle-delay {
          animation-delay: 0.55s;
        }

        .nat-assistant-sparkle-late {
          animation-delay: 1.1s;
        }

        .nat-assistant-launch:hover .nat-assistant-robot-image {
          animation: natAssistantFloat 1.8s ease-in-out infinite, natAssistantNudge 0.36s ease-in-out 1;
        }

        @media (prefers-reduced-motion: reduce) {
          .nat-assistant-robot-image,
          .nat-assistant-halo,
          .nat-assistant-sparkle,
          .nat-assistant-launch:hover .nat-assistant-robot-image {
            animation: none !important;
          }
        }
      `}</style>
      {isOpen && (
        <div className="pointer-events-auto fixed inset-x-0 bottom-0 top-0 flex min-h-0 flex-col overflow-hidden overscroll-contain rounded-none border border-emerald-100 bg-white/98 shadow-[0_26px_70px_rgba(15,118,110,0.18)] backdrop-blur-xl sm:inset-x-auto sm:bottom-8 sm:right-8 sm:top-auto sm:h-[min(74vh,680px)] sm:w-[min(410px,calc(100vw-1.5rem))] sm:rounded-[1.75rem] dark:border-emerald-950 dark:bg-slate-950/98">
          <div className="relative flex items-start justify-between overflow-hidden border-b border-emerald-100 bg-gradient-to-r from-white via-emerald-50 to-cyan-50 px-3 py-3 sm:items-center sm:px-5 sm:py-4 dark:border-emerald-950 dark:from-slate-950 dark:via-emerald-950/30 dark:to-cyan-950/20">
            <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-emerald-200/35 blur-3xl dark:bg-emerald-500/10" />
            <div className="min-w-0 flex items-start gap-3">
              <NatAssistantAvatar compact statusClass={natStatusTone} />
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-base font-black leading-5 text-slate-900 sm:truncate sm:text-base dark:text-slate-100">
                  {mode === "assistant" ? (isTH ? "NAT AI ช่วยเหลือ" : "NAT AI assistant") : isTH ? "แชทคุยกับเจ้าหน้าที่" : "Chat with support"}
                </div>
                <div className="line-clamp-2 pr-2 text-[12px] leading-5 text-slate-500 sm:text-xs dark:text-slate-400">
                  {mode === "assistant"
                    ? isTH ? "ตรวจสถานะเครื่อง + ช่วยไล่ปัญหาในปุ่มเดียว" : "Machine status and troubleshooting in one place"
                    : humanHeaderMeta}
                </div>
                {mode === "assistant" ? (
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className={`h-2 w-2 rounded-full ${natStatusTone}`} />
                    <span className="truncate">{natStatusText}</span>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className={`h-2 w-2 rounded-full ${statusToneClass}`} />
                    <span className="truncate">{humanHeaderStatus}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="ml-2 flex shrink-0 flex-wrap justify-end gap-1 sm:flex-nowrap sm:gap-2">
              {mode === "assistant" ? (
                <Button size="icon" variant="ghost" onClick={resetAssistant} title="Reset">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Sheet open={isHistoryFilterOpen} onOpenChange={setIsHistoryFilterOpen}>
                    <SheetTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        title={isTH ? "กรองช่วงเวลา" : "Filter by date"}
                        aria-label={isTH ? "กรองช่วงเวลา" : "Filter by date"}
                        className={hasHistoryFilter ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60" : ""}
                      >
                        <CalendarRange className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent
                      side="bottom"
                      className="rounded-t-[28px] border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <SheetHeader className="pb-2">
                        <SheetTitle>{isTH ? "กรองประวัติแชท" : "Filter chat history"}</SheetTitle>
                        <SheetDescription>
                          {isTH ? "เลือกช่วงเวลาที่ต้องการดูข้อความ" : "Choose the date range you want to review."}
                        </SheetDescription>
                      </SheetHeader>
                      <div className="grid gap-3 px-4 pb-4">
                        <div className="grid gap-2">
                          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                            {isTH ? "เคสที่เคยส่ง" : "Your chat cases"}
                          </div>
                          {threads.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                              {isTH ? "ยังไม่มีเคสในระบบ" : "No chat cases yet"}
                            </div>
                          ) : (
                            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                              {threads.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedThreadId(item.id);
                                    setIsHistoryFilterOpen(false);
                                  }}
                                  className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                                    selectedThreadId === item.id
                                      ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium">#{item.id}</span>
                                    <span className="text-[11px] opacity-75">{item.status}</span>
                                  </div>
                                  <div className="mt-1 line-clamp-2 text-xs opacity-80">
                                    {item.last_message_preview || (isTH ? "ยังไม่มีข้อความ" : "No messages yet")}
                                  </div>
                                  <div className="mt-1 text-[11px] opacity-70">
                                    {formatTime(item.last_message_at || item.created_at)}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {hasHistoryFilter && (
                          <Badge variant="outline" className="w-fit border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300">
                            {isTH ? "กำลังกรอง" : "Filtered"}
                          </Badge>
                        )}
                        <label className="grid gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{isTH ? "เริ่มจาก" : "From"}</span>
                          <input
                            type="datetime-local"
                            value={historyStart}
                            onChange={(event) => setHistoryStart(event.target.value)}
                            className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                          />
                        </label>
                        <label className="grid gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{isTH ? "ถึง" : "To"}</span>
                          <input
                            type="datetime-local"
                            value={historyEnd}
                            onChange={(event) => setHistoryEnd(event.target.value)}
                            className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                          />
                        </label>
                        <div className="flex items-center justify-between gap-3 pt-1">
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
                          <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
                            {hasHistoryFilter
                              ? (isTH ? "ระบบจะรีเฟรชตามช่วงเวลานี้" : "Chat refreshes using this range")
                              : (isTH ? "ถ้าไม่เลือกจะแสดงทั้งหมด" : "Shows all messages by default")}
                          </div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => exportTranscriptTxt(selectedThread || thread, messages)}
                    title={isTH ? "ดาวน์โหลดเป็นไฟล์ข้อความ" : "Download as text"}
                    aria-label={isTH ? "ดาวน์โหลดเป็นไฟล์ข้อความ" : "Download as text"}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => exportTranscriptPdf(selectedThread || thread, messages)}
                    title={isTH ? "ดาวน์โหลดเป็น PDF" : "Download as PDF"}
                    aria-label={isTH ? "ดาวน์โหลดเป็น PDF" : "Download as PDF"}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {(selectedThread || thread)?.status === "closed" ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => updateCaseStatus("open").catch(() => {})}
                      title={isTH ? "เปิดเคสอีกครั้ง" : "Reopen case"}
                      aria-label={isTH ? "เปิดเคสอีกครั้ง" : "Reopen case"}
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
                      aria-label={isTH ? "ปิดเคส" : "Close case"}
                      disabled={isSending}
                    >
                      <UserRoundX className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={resetAssistant}
                    title={isTH ? "กลับไปหน้า AI" : "Back to AI"}
                    aria-label={isTH ? "กลับไปหน้า AI" : "Back to AI"}
                  >
                    <Bot className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                title={isTH ? "ปิดหน้าต่างแชท" : "Close chat"}
                aria-label={isTH ? "ปิดหน้าต่างแชท" : "Close chat"}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {mode === "assistant" ? assistantView : humanView}
        </div>
      )}

      <Dialog open={Boolean(messagePendingDelete)} onOpenChange={(open) => !open && setMessagePendingDelete(null)}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle>{isTH ? "เลือกวิธีลบข้อความ" : "Choose how to delete this message"}</DialogTitle>
            <DialogDescription>
              {isTH
                ? "คุณสามารถลบเฉพาะฝั่งตัวเอง หรือถอนข้อความสำหรับทุกคนได้เหมือนแชตทั่วไป"
                : "You can remove the message only from your side or delete it for everyone."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            {messagePendingDelete?.body || (isTH ? "ไม่มีข้อความ" : "No message")}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="rounded-2xl"
              onClick={() => setMessagePendingDelete(null)}
            >
              {isTH ? "ยกเลิก" : "Cancel"}
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                onClick={() => messagePendingDelete && removeMessage(messagePendingDelete.id, "self").catch(() => {})}
              >
                {isTH ? "ลบเฉพาะฉัน" : "Delete for me"}
              </Button>
              <Button
                type="button"
                className="rounded-2xl bg-rose-600 hover:bg-rose-700"
                onClick={() => messagePendingDelete && removeMessage(messagePendingDelete.id, "everyone").catch(() => {})}
              >
                {isTH ? "ลบสำหรับทุกคน" : "Delete for everyone"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isOpen && (
        <div
          className="pointer-events-auto fixed z-40 h-44 w-36 transition-transform duration-150"
          style={launcherStyle}
        >
          <div
            className={`nat-assistant-speech absolute top-4 z-30 max-w-[190px] rounded-[1.15rem] border border-emerald-100 bg-white/94 px-3 py-2 text-[11px] font-semibold leading-4 text-emerald-900 shadow-[0_14px_34px_rgba(15,118,110,0.16)] backdrop-blur transition ${launcherSpeechSideClass} ${isDraggingLauncher ? "scale-95 opacity-65" : "opacity-100"}`}
          >
            <div className="flex items-start gap-2">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${natStatusTone}`} />
              <span>{isDraggingLauncher ? (isTH ? "วางตรงนี้ได้เลยครับ" : "Drop me here.") : launcherSpeech}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLauncherClick}
            onPointerDown={handleLauncherPointerDown}
            onPointerMove={handleLauncherPointerMove}
            onPointerUp={handleLauncherPointerUp}
            onPointerCancel={handleLauncherPointerUp}
            className={`nat-assistant-launch relative grid h-full w-full touch-none place-items-center bg-transparent p-0 text-left transition hover:-translate-y-1 ${isDraggingLauncher ? "cursor-grabbing" : "cursor-grab"}`}
            aria-label={isTH ? "ลากหรือเปิด NAT AI ช่วยเหลือ" : "Drag or open NAT AI assistant"}
            title={isTH ? "ลากเพื่อย้าย หรือคลิกเพื่อเปิด NAT AI" : "Drag to move, or click to open NAT AI"}
          >
            <NatAssistantAvatar statusClass={natStatusTone} />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-4 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-semibold text-white shadow-lg ring-2 ring-white dark:ring-slate-950">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <div className="absolute -right-1 bottom-9 z-30 flex flex-col gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                updateLauncherScale(0.1);
              }}
              className="grid h-7 w-7 place-items-center rounded-full border border-emerald-100 bg-white/92 text-emerald-700 shadow-[0_8px_18px_rgba(15,118,110,0.14)] backdrop-blur transition hover:bg-emerald-50"
              aria-label={isTH ? "ขยาย NAT AI" : "Enlarge NAT AI"}
              title={isTH ? "ขยายตัว NAT" : "Enlarge NAT"}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                updateLauncherScale(-0.1);
              }}
              className="grid h-7 w-7 place-items-center rounded-full border border-emerald-100 bg-white/92 text-emerald-700 shadow-[0_8px_18px_rgba(15,118,110,0.14)] backdrop-blur transition hover:bg-emerald-50"
              aria-label={isTH ? "ย่อ NAT AI" : "Shrink NAT AI"}
              title={isTH ? "ย่อตัว NAT" : "Shrink NAT"}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
