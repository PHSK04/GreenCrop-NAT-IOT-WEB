import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  Bot,
  CalendarRange,
  ClipboardCheck,
  Download,
  FileText,
  MessageCircleMore,
  Pencil,
  Reply,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
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
import { chatService, AiChatMessage, AiSensorLearningSummary, ChatMessage, ChatThread } from "@/features/chat/services/chatService";
import { toast } from "sonner";
import { useActiveDeviceId } from "@/hooks/useActiveDeviceId";
import { useMachine } from "@/contexts/MachineContext";
import { analyzeSensorIntelligence, formatSensorAiAnswer } from "@/features/ai/services/sensorIntelligence";
import { CropYieldEntry, getMonthlyYieldSummaries, readCropYieldEntries, subscribeCropYieldEntries } from "@/utils/cropYieldStore";

type CustomerChatWidgetProps = {
  language?: string;
  currentPage?: string;
  userContext?: {
    id?: string | number;
    name?: string;
    email?: string;
    role?: string;
  };
  deviceCount?: number;
};

type AssistantMode = "assistant" | "chatbot" | "agent" | "human";

type AgentActionType = "machine_control" | "inspect" | "export" | "handoff" | "monitor";

type AgentProposal = {
  type: AgentActionType;
  label: string;
  command?: string;
  requiresConfirmation: boolean;
  description: string;
};

type AssistantMessage = {
  id: string;
  sender: "ai" | "user";
  text: string;
  createdAt?: string;
  canEscalate?: boolean;
  agentProposal?: AgentProposal;
};

const POLL_MS = 4000;
const LAUNCHER_POSITION_KEY = "nat_assistant_launcher_position";
const ASSISTANT_CONTEXT_VERSION = "contextual-live-v3";
const ASSISTANT_HISTORY_PREFIX = `nat_ai_assistant_history_${ASSISTANT_CONTEXT_VERSION}`;
const CHATBOT_HISTORY_PREFIX = `nat_chatbot_history_${ASSISTANT_CONTEXT_VERSION}`;
const AGENT_HISTORY_PREFIX = `nat_ai_agent_history_${ASSISTANT_CONTEXT_VERSION}`;
const LAUNCHER_BASE_WIDTH = 144;
const LAUNCHER_BASE_HEIGHT = 184;

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
    title: "AI ตรวจออฟไลน์จากข้อมูลจริง",
    answer:
      "ลองตรวจไฟเลี้ยงอุปกรณ์, อินเทอร์เน็ต, และรีสตาร์ตอุปกรณ์ 1 ครั้งก่อนนะครับ ถ้ายัง offline เกิน 30 นาที แนะนำให้ส่งต่อเจ้าหน้าที่ทันที",
  },
  login: {
    title: "เข้าสู่ระบบไม่ได้",
    answer:
      "ตรวจสอบอีเมลให้ถูกต้อง, ลองเข้าในเบราว์เซอร์อื่น หรือโหมดไม่ระบุตัวตน หากยังไม่ได้ให้คุยกับเจ้าหน้าที่เพื่อเช็กบัญชีและ log ระบบ",
  },
  sensor: {
    title: "AI ตรวจ sensor และ history",
    answer:
      "ลองรีเฟรชหน้า dashboard, ตรวจว่าเลือก active device ถูกตัว และรออีก 1 รอบการ sync ถ้ายังค้างต่อเนื่องให้ส่งต่อเจ้าหน้าที่พร้อมเวลาที่พบปัญหา",
  },
  pairing: {
    title: "AI ตรวจอุปกรณ์ที่ผูกกับ user นี้",
    answer:
      "ยืนยัน device id และ pairing code ให้ถูกต้อง แล้วลองอีกครั้งบนอินเทอร์เน็ตที่เสถียร หากระบบบอกว่าอุปกรณ์ถูกใช้งานแล้ว ให้คุยกับเจ้าหน้าที่เพื่อปลดผูกบัญชี",
  },
  urgent: {
    title: "AI ประเมินความเร่งด่วน",
    answer:
      "กรณีนี้แนะนำให้ส่งต่อเจ้าหน้าที่ทันที พร้อมแนบชื่ออุปกรณ์ เวลาเกิดเหตุ และภาพหน้าจอถ้ามี เพื่อให้ทีมตรวจสอบได้เร็วที่สุด",
  },
} as const;

const createAssistantWelcome = (isTH = true): AssistantMessage => ({
  id: `assistant-welcome-${ASSISTANT_CONTEXT_VERSION}`,
  sender: "ai",
  createdAt: new Date().toISOString(),
  text: isTH
    ? "สวัสดีครับ ผมคือ NAT AI ผู้ช่วยเดียวของโปรเจกต์นี้ ถามได้หมดเลยครับ ทั้งสถานะเครื่อง sensor ปั๊ม รายงาน การโหลดข้อมูล การวางแผน action หรือปัญหาในหน้าเว็บ ถ้าเป็นข้อมูลโปรเจกต์ ผมจะตอบจากข้อมูลของบัญชีนี้เท่านั้น"
    : "Hi, I am NAT AI, the single assistant for this project. Ask me about machine status, sensors, pumps, reports, data export, action planning, or web app issues. For project data, I only use this account's own context.",
});

const createChatbotWelcome = (isTH = true): AssistantMessage => ({
  id: `chatbot-welcome-${ASSISTANT_CONTEXT_VERSION}`,
  sender: "ai",
  createdAt: new Date().toISOString(),
  text: isTH
    ? "สวัสดีครับ ผมคือ NAT AI ถามปัญหาพื้นฐานหรือเรื่องลึกของ GreenCrop ได้ในช่องเดียวเลยครับ ถ้าควรให้เจ้าหน้าที่ช่วยต่อ ผมจะเสนอส่งต่อให้"
    : "Hi, I am NAT AI. You can ask common support questions or deeper GreenCrop questions in one place. If staff should help next, I will offer a handoff.",
});

const createAgentWelcome = (isTH = true): AssistantMessage => ({
  id: `agent-welcome-${ASSISTANT_CONTEXT_VERSION}`,
  sender: "ai",
  createdAt: new Date().toISOString(),
  text: isTH
    ? "สวัสดีครับ ผมคือ NAT AI ผมช่วยวางแผน action จากข้อมูลบัญชีนี้ได้ เช่น ตรวจระบบ เตรียมหยุดฉุกเฉิน เตรียม export หรือส่งต่อเจ้าหน้าที่ โดย action ที่กระทบเครื่องจริงต้องกดยืนยันก่อนเสมอ"
    : "Hi, I am NAT AI. I can plan actions from this account's context, such as inspection, emergency stop preparation, export preparation, or staff handoff. Any real machine-impacting action requires confirmation first.",
});

const hasCurrentAssistantContext = (messages: AssistantMessage[]) =>
  messages.some((message) => (
    message.id.includes(ASSISTANT_CONTEXT_VERSION) ||
    /ML data|telemetry history|sensor_data|ข้อมูลจริง|ML sample|เฉพาะ user|logged-in user/i.test(message.text)
  ));

const isAssistantMessage = (value: unknown): value is AssistantMessage => {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<AssistantMessage>;
  return (
    typeof message.id === "string" &&
    (message.sender === "ai" || message.sender === "user") &&
    typeof message.text === "string"
  );
};

const mapAiMessageToAssistantMessage = (message: AiChatMessage): AssistantMessage => ({
  id: `db-ai-${message.id}`,
  sender: message.sender_role === "user" ? "user" : "ai",
  text: message.body,
  createdAt: message.created_at,
  canEscalate: message.sender_role === "ai" ? Boolean(message.should_escalate) : false,
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

const getDefaultLauncherPosition = (): LauncherPosition => {
  if (typeof window === "undefined") return { x: 16, y: 360 };
  const margin = 12;
  return {
    x: Math.max(margin, window.innerWidth - LAUNCHER_BASE_WIDTH - margin),
    y: Math.max(margin, window.innerHeight - LAUNCHER_BASE_HEIGHT - 78),
  };
};

const clampLauncherPosition = (position: LauncherPosition): LauncherPosition => {
  if (typeof window === "undefined") return position;
  const margin = 8;
  const maxX = Math.max(margin, window.innerWidth - LAUNCHER_BASE_WIDTH - margin);
  const maxY = Math.max(margin, window.innerHeight - LAUNCHER_BASE_HEIGHT - margin);
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

export function CustomerChatWidget({
  language = "TH",
  currentPage = "Dashboard",
  userContext,
  deviceCount = 0,
}: CustomerChatWidgetProps) {
  const isTH = language === "TH";
  const hasThaiText = (value: string) => /[\u0E00-\u0E7F]/.test(value);
  const shouldReplyThai = (value: string) => isTH || hasThaiText(value);
  const activeDeviceId = useActiveDeviceId();
  const {
    isOn,
    mqttStatus,
    boardConnected,
    lastTelemetryAt,
    telemetryHistory,
    pump1On,
    pump2On,
    locked,
    wls1,
    wls2,
    greenOn,
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
  const [chatbotMessages, setChatbotMessages] = useState<AssistantMessage[]>([createChatbotWelcome(isTH)]);
  const [agentMessages, setAgentMessages] = useState<AssistantMessage[]>([createAgentWelcome(isTH)]);
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
  const [learningSummary, setLearningSummary] = useState<AiSensorLearningSummary | null>(null);
  const [cropYieldEntries, setCropYieldEntries] = useState<CropYieldEntry[]>(() => readCropYieldEntries(activeDeviceId || "default"));
  const [launcherPosition, setLauncherPosition] = useState<LauncherPosition | null>(null);
  const [isDraggingLauncher, setIsDraggingLauncher] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const assistantListRef = useRef<HTMLDivElement | null>(null);
  const chatbotListRef = useRef<HTMLDivElement | null>(null);
  const agentListRef = useRef<HTMLDivElement | null>(null);
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
  const hasLoadedAssistantHistoryRef = useRef(false);
  const hasLoadedChatbotHistoryRef = useRef(false);
  const hasLoadedAgentHistoryRef = useRef(false);
  const skipAssistantHistoryPersistRef = useRef(false);
  const skipChatbotHistoryPersistRef = useRef(false);
  const skipAgentHistoryPersistRef = useRef(false);
  const previousAssistantMessageCountRef = useRef(assistantMessages.length);
  const previousChatbotMessageCountRef = useRef(chatbotMessages.length);
  const previousAgentMessageCountRef = useRef(agentMessages.length);
  const typingTimeoutRef = useRef<number | null>(null);

  const draftKey = useMemo(() => `chat_draft_${selectedThreadId || thread?.id || "pending"}`, [selectedThreadId, thread?.id]);
  const assistantHistoryKey = useMemo(
    () => `${ASSISTANT_HISTORY_PREFIX}_${language}_${activeDeviceId || "no_device"}`,
    [activeDeviceId, language],
  );
  const chatbotHistoryKey = useMemo(
    () => `${CHATBOT_HISTORY_PREFIX}_${language}_${activeDeviceId || "no_device"}`,
    [activeDeviceId, language],
  );
  const agentHistoryKey = useMemo(
    () => `${AGENT_HISTORY_PREFIX}_${language}_${activeDeviceId || "no_device"}`,
    [activeDeviceId, language],
  );
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

  const scrollChatbotToBottom = (behavior: ScrollBehavior = "smooth") => {
    const node = chatbotListRef.current;
    if (!node) return;
    node.scrollTo({
      top: node.scrollHeight,
      behavior,
    });
  };

  const scrollAgentToBottom = (behavior: ScrollBehavior = "smooth") => {
    const node = agentListRef.current;
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
    try {
      const rawPosition = localStorage.getItem(LAUNCHER_POSITION_KEY);
      const parsedPosition = rawPosition ? JSON.parse(rawPosition) as LauncherPosition : null;
      if (
        parsedPosition &&
        Number.isFinite(parsedPosition.x) &&
        Number.isFinite(parsedPosition.y)
      ) {
        setLauncherPosition(clampLauncherPosition(parsedPosition));
        return;
      }
    } catch {
      localStorage.removeItem(LAUNCHER_POSITION_KEY);
    }

    setLauncherPosition(getDefaultLauncherPosition());
  }, []);

  useEffect(() => {
    if (!launcherPosition) return;
    localStorage.setItem(LAUNCHER_POSITION_KEY, JSON.stringify(launcherPosition));
  }, [launcherPosition]);

  useEffect(() => {
    const handleResize = () => {
      setLauncherPosition((current) => clampLauncherPosition(current || getDefaultLauncherPosition()));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  useEffect(() => {
    if (!isOpen || mode !== "chatbot") return;
    const hasNewChatbotMessages = chatbotMessages.length > previousChatbotMessageCountRef.current;
    window.requestAnimationFrame(() => {
      scrollChatbotToBottom(hasNewChatbotMessages ? "smooth" : "auto");
    });
    previousChatbotMessageCountRef.current = chatbotMessages.length;
  }, [chatbotMessages, isOpen, mode]);

  useEffect(() => {
    if (!isOpen || mode !== "agent") return;
    const hasNewAgentMessages = agentMessages.length > previousAgentMessageCountRef.current;
    window.requestAnimationFrame(() => {
      scrollAgentToBottom(hasNewAgentMessages ? "smooth" : "auto");
    });
    previousAgentMessageCountRef.current = agentMessages.length;
  }, [agentMessages, isOpen, mode]);

  useEffect(() => {
    let isMounted = true;
    hasLoadedAssistantHistoryRef.current = false;

    const loadStoredHistory = () => {
      try {
        const rawHistory = localStorage.getItem(assistantHistoryKey);
        const parsedHistory = rawHistory ? JSON.parse(rawHistory) : null;
        if (Array.isArray(parsedHistory)) {
          const validMessages = parsedHistory.filter(isAssistantMessage).slice(-80);
          if (validMessages.length > 0 && hasCurrentAssistantContext(validMessages)) {
            skipAssistantHistoryPersistRef.current = true;
            setAssistantMessages(validMessages);
            previousAssistantMessageCountRef.current = validMessages.length;
            hasLoadedAssistantHistoryRef.current = true;
            return;
          }
        }
      } catch {
        localStorage.removeItem(assistantHistoryKey);
      }

      const welcome = createAssistantWelcome(isTH);
      skipAssistantHistoryPersistRef.current = true;
      setAssistantMessages([welcome]);
      previousAssistantMessageCountRef.current = 1;
      hasLoadedAssistantHistoryRef.current = true;
    };

    chatService.getMyAiSession({ deviceId: activeDeviceId || undefined, limit: 80 })
      .then(({ messages }) => {
        if (!isMounted) return;
        const nextMessages = messages.map(mapAiMessageToAssistantMessage);
        if (nextMessages.length > 0 && hasCurrentAssistantContext(nextMessages)) {
          skipAssistantHistoryPersistRef.current = true;
          setAssistantMessages(nextMessages);
          previousAssistantMessageCountRef.current = nextMessages.length;
          hasLoadedAssistantHistoryRef.current = true;
          return;
        }
        if (nextMessages.length > 0) {
          chatService.clearMyAiSession({ deviceId: activeDeviceId || undefined }).catch(() => {});
        }
        loadStoredHistory();
      })
      .catch(() => {
        if (isMounted) loadStoredHistory();
      });

    return () => {
      isMounted = false;
    };
  }, [activeDeviceId, assistantHistoryKey, isTH]);

  useEffect(() => {
    if (!hasLoadedAssistantHistoryRef.current) return;
    if (skipAssistantHistoryPersistRef.current) {
      skipAssistantHistoryPersistRef.current = false;
      return;
    }
    localStorage.setItem(assistantHistoryKey, JSON.stringify(assistantMessages.slice(-80)));
  }, [assistantHistoryKey, assistantMessages]);

  useEffect(() => {
    hasLoadedChatbotHistoryRef.current = false;
    try {
      const rawHistory = localStorage.getItem(chatbotHistoryKey);
      const parsedHistory = rawHistory ? JSON.parse(rawHistory) : null;
      if (Array.isArray(parsedHistory)) {
        const validMessages = parsedHistory.filter(isAssistantMessage).slice(-80);
        if (validMessages.length > 0) {
          skipChatbotHistoryPersistRef.current = true;
          setChatbotMessages(validMessages);
          previousChatbotMessageCountRef.current = validMessages.length;
          hasLoadedChatbotHistoryRef.current = true;
          return;
        }
      }
    } catch {
      localStorage.removeItem(chatbotHistoryKey);
    }

    const welcome = createChatbotWelcome(isTH);
    skipChatbotHistoryPersistRef.current = true;
    setChatbotMessages([welcome]);
    previousChatbotMessageCountRef.current = 1;
    hasLoadedChatbotHistoryRef.current = true;
  }, [chatbotHistoryKey, isTH]);

  useEffect(() => {
    if (!hasLoadedChatbotHistoryRef.current) return;
    if (skipChatbotHistoryPersistRef.current) {
      skipChatbotHistoryPersistRef.current = false;
      return;
    }
    localStorage.setItem(chatbotHistoryKey, JSON.stringify(chatbotMessages.slice(-80)));
  }, [chatbotHistoryKey, chatbotMessages]);

  useEffect(() => {
    hasLoadedAgentHistoryRef.current = false;
    try {
      const rawHistory = localStorage.getItem(agentHistoryKey);
      const parsedHistory = rawHistory ? JSON.parse(rawHistory) : null;
      if (Array.isArray(parsedHistory)) {
        const validMessages = parsedHistory.filter(isAssistantMessage).slice(-80);
        if (validMessages.length > 0) {
          skipAgentHistoryPersistRef.current = true;
          setAgentMessages(validMessages);
          previousAgentMessageCountRef.current = validMessages.length;
          hasLoadedAgentHistoryRef.current = true;
          return;
        }
      }
    } catch {
      localStorage.removeItem(agentHistoryKey);
    }

    const welcome = createAgentWelcome(isTH);
    skipAgentHistoryPersistRef.current = true;
    setAgentMessages([welcome]);
    previousAgentMessageCountRef.current = 1;
    hasLoadedAgentHistoryRef.current = true;
  }, [agentHistoryKey, isTH]);

  useEffect(() => {
    if (!hasLoadedAgentHistoryRef.current) return;
    if (skipAgentHistoryPersistRef.current) {
      skipAgentHistoryPersistRef.current = false;
      return;
    }
    localStorage.setItem(agentHistoryKey, JSON.stringify(agentMessages.slice(-80)));
  }, [agentHistoryKey, agentMessages]);

  useEffect(() => {
    let isMounted = true;
    chatService.getMySensorLearning({
      deviceId: activeDeviceId || undefined,
      limit: 40,
      backfill: "auto",
    })
      .then((summary) => {
        if (isMounted) setLearningSummary(summary);
      })
      .catch(() => {
        if (isMounted) setLearningSummary(null);
      });
    return () => {
      isMounted = false;
    };
  }, [activeDeviceId]);

  useEffect(() => {
    const yieldDeviceId = activeDeviceId || "default";
    const refresh = () => setCropYieldEntries(readCropYieldEntries(yieldDeviceId));
    refresh();
    return subscribeCropYieldEntries(refresh);
  }, [activeDeviceId]);

  const persistAssistantExchange = (payload: {
    userMessage: string;
    aiMessage: string;
    intent?: string;
    shouldEscalate?: boolean;
  }) => {
    chatService.appendAiExchange({
      deviceId: activeDeviceId || undefined,
      userMessage: payload.userMessage,
      aiMessage: payload.aiMessage,
      currentPage,
      machineStatus: natStatusText,
      intent: payload.intent,
      shouldEscalate: payload.shouldEscalate,
    })
      .then(({ messages }) => {
        const nextMessages = messages.map(mapAiMessageToAssistantMessage);
        if (nextMessages.length > 0) {
          skipAssistantHistoryPersistRef.current = true;
          setAssistantMessages(nextMessages);
          previousAssistantMessageCountRef.current = nextMessages.length;
        }
      })
      .catch(() => {
        // Keep the local transcript as an offline fallback if the API is unavailable.
      });
  };

  const resetAssistant = () => {
    setMode("assistant");
    const welcome = createAssistantWelcome(isTH);
    setAssistantMessages([welcome]);
    chatService.clearMyAiSession({ deviceId: activeDeviceId || undefined }).catch(() => {});
    setError("");
  };

  const resetChatbot = () => {
    setMode("chatbot");
    const welcome = createChatbotWelcome(isTH);
    setChatbotMessages([welcome]);
    localStorage.removeItem(chatbotHistoryKey);
    setError("");
  };

  const resetAgent = () => {
    setMode("agent");
    const welcome = createAgentWelcome(isTH);
    setAgentMessages([welcome]);
    localStorage.removeItem(agentHistoryKey);
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

  const submitAssistantMessage = async () => {
    const body = draft.trim();
    if (!body || isSending) return;
    const now = Date.now();
    const shouldEscalate = shouldEscalateAssistantRequest(body);
    const intent = inferAssistantIntent(body, assistantMessages);
    const fallbackAiText = buildAssistantFreeAnswer(body, assistantMessages);
    setIsSending(true);
    setDraft("");
    setAssistantMessages((current) => [
      ...current,
      { id: `user-free-${now}`, sender: "user", text: body, createdAt: new Date(now).toISOString() },
      {
        id: `ai-thinking-${now}`,
        sender: "ai",
        text: shouldReplyThai(body) ? "กำลังดูข้อมูลเครื่องและคิดคำตอบให้ครับ..." : "Checking machine data and thinking...",
        createdAt: new Date(now + 1).toISOString(),
      },
    ]);

    try {
      const { messages } = await chatService.generateAiReply({
        deviceId: activeDeviceId || undefined,
        userMessage: body,
        fallbackAiMessage: fallbackAiText,
        currentPage,
        machineStatus: natStatusText,
        projectSnapshot: buildAssistantProjectSnapshot(),
        intent,
        shouldEscalate,
      });
      const nextMessages = messages.map(mapAiMessageToAssistantMessage);
      if (nextMessages.length > 0) {
        skipAssistantHistoryPersistRef.current = true;
        setAssistantMessages(nextMessages);
        previousAssistantMessageCountRef.current = nextMessages.length;
      }
    } catch {
      setAssistantMessages((current) => [
        ...current.filter((message) => message.id !== `ai-thinking-${now}`),
        {
          id: `ai-free-${now}`,
          sender: "ai",
          text: fallbackAiText,
          createdAt: new Date(now + 1).toISOString(),
          canEscalate: shouldEscalate,
        },
      ]);
      persistAssistantExchange({
        userMessage: body,
        aiMessage: fallbackAiText,
        intent,
        shouldEscalate,
      });
    } finally {
      setIsSending(false);
    }
  };

  const submitChatbotMessage = async () => {
    const body = draft.trim();
    if (!body || isSending) return;
    const now = Date.now();
    const shouldEscalate = shouldEscalateAssistantRequest(body);
    const localText = buildLocalAssistantAnswer(body, chatbotMessages) || buildAssistantFreeAnswer(body, chatbotMessages);
    setIsSending(true);
    setDraft("");
    setChatbotMessages((current) => [
      ...current,
      { id: `bot-user-${now}`, sender: "user", text: body, createdAt: new Date(now).toISOString() },
      {
        id: `bot-reply-${now}`,
        sender: "ai",
        text: localText,
        createdAt: new Date(now + 1).toISOString(),
        canEscalate: shouldEscalate,
      },
    ]);
    setIsSending(false);
  };

  const buildAgentProposal = (body: string): AgentProposal => {
    const normalizedBody = body.toLowerCase();
    if (/(หยุด|ปิด|stop|emergency|ฉุกเฉิน|ดับ).*(ปั๊ม|pump|เครื่อง|machine)|(ปั๊ม|pump|เครื่อง|machine).*(หยุด|ปิด|stop|emergency|ฉุกเฉิน|ดับ)/i.test(normalizedBody)) {
      return {
        type: "machine_control",
        command: "EMERGENCY_STOP",
        requiresConfirmation: true,
        label: isTH ? "เตรียมหยุดฉุกเฉิน" : "Prepare emergency stop",
        description: isTH
          ? "Agent จะเตรียมคำสั่งหยุดฉุกเฉินให้ แต่ยังไม่ส่งคำสั่งจริงจนกว่าจะยืนยันในชั้นควบคุมที่ปลอดภัย"
          : "The agent will prepare an emergency stop, but it will not send a real command until confirmed in the safe control layer.",
      };
    }
    if (/(เปิด|เริ่ม|start|run).*(ปั๊ม|pump|เครื่อง|machine)|(ปั๊ม|pump|เครื่อง|machine).*(เปิด|เริ่ม|start|run)/i.test(normalizedBody)) {
      return {
        type: "machine_control",
        command: "START",
        requiresConfirmation: true,
        label: isTH ? "เตรียมเริ่มเครื่อง" : "Prepare machine start",
        description: isTH
          ? "Agent จะเตรียมคำสั่งเริ่มเครื่อง แต่ควรยืนยันหลังตรวจว่าไม่มี lock, ไฟแดง, float alarm หรือค่า pH ผิดช่วง"
          : "The agent will prepare a start command, but confirmation should happen only after checking lock, red alarm, float alarm, and pH status.",
      };
    }
    if (/(โหลด|ดาวน์โหลด|download|export|ส่งออก|รายงาน|report|csv|pdf)/i.test(normalizedBody)) {
      return {
        type: "export",
        requiresConfirmation: true,
        label: isTH ? "เตรียม export รายงาน" : "Prepare report export",
        description: isTH
          ? "Agent จะจัดขอบเขตข้อมูลของบัญชีนี้ เช่น sensor, crop report, หรือ transcript แล้วให้ผู้ใช้เลือกดาวน์โหลด"
          : "The agent will scope this account's data, such as sensors, crop reports, or transcript, then let the user choose the download.",
      };
    }
    if (/(เจ้าหน้าที่|แอดมิน|support|staff|admin|human|คนจริง)/i.test(normalizedBody)) {
      return {
        type: "handoff",
        requiresConfirmation: true,
        label: isTH ? "ส่งต่อเจ้าหน้าที่" : "Hand off to staff",
        description: isTH
          ? "Agent จะเปิดช่องแชทเจ้าหน้าที่พร้อมสรุปบริบทปัญหาให้คุยต่อ"
          : "The agent will open the staff chat with context for follow-up.",
      };
    }
    if (machineNeedsAttention) {
      return {
        type: "inspect",
        requiresConfirmation: true,
        label: isTH ? "ตรวจระบบที่มีความเสี่ยง" : "Inspect risky system state",
        description: isTH
          ? "Agent จะจัดลำดับตรวจ alarm, pump, water level, pH/EC/temp และแนะนำขั้นตอนถัดไปจากข้อมูลบัญชีนี้"
          : "The agent will check alarms, pumps, water level, pH/EC/temp, and propose next steps from this account's data.",
      };
    }
    return {
      type: "monitor",
      requiresConfirmation: false,
      label: isTH ? "เฝ้าดูและสรุปสถานะ" : "Monitor and summarize",
      description: isTH
        ? "Agent จะสรุปสถานะล่าสุด แนวโน้ม และสิ่งที่ควรติดตามจากข้อมูลบัญชีนี้"
        : "The agent will summarize the latest state, trends, and watch items from this account's data.",
    };
  };

  const buildAgentPlanText = (proposal: AgentProposal) => {
    const sensorLine = `pH ${formatTelemetryValue(phValue || latestTelemetrySnapshot?.phValue || 0, 2)} | EC ${formatTelemetryValue(ecValue || latestTelemetrySnapshot?.ecValue || 0, 2)} | Temp ${formatTelemetryValue(tempValue || latestTelemetrySnapshot?.tempValue || 0, 1)}`;
    return isTH
      ? [
          `แผน Agent: ${proposal.label}`,
          proposal.description,
          "",
          `Active device: ${activeDeviceId || "ยังไม่ได้เลือก"}`,
          `สถานะเครื่อง: ${natStatusText}`,
          `ค่าล่าสุด: ${sensorLine}`,
          `ปั๊ม: Pump1 ${pump1On ? "ON" : "OFF"} | Pump2 ${pump2On ? "ON" : "OFF"}`,
          proposal.requiresConfirmation ? "ต้องยืนยันก่อนทำ action นี้" : "action นี้เป็นการสรุป/เฝ้าดู ไม่กระทบเครื่องจริง",
        ].join("\n")
      : [
          `Agent plan: ${proposal.label}`,
          proposal.description,
          "",
          `Active device: ${activeDeviceId || "not selected"}`,
          `Machine status: ${natStatusText}`,
          `Latest values: ${sensorLine}`,
          `Pumps: Pump1 ${pump1On ? "ON" : "OFF"} | Pump2 ${pump2On ? "ON" : "OFF"}`,
          proposal.requiresConfirmation ? "Confirmation is required before this action." : "This is monitor/summary only and does not affect the real machine.",
        ].join("\n");
  };

  const submitAgentMessage = async () => {
    const body = draft.trim();
    if (!body || isSending) return;
    const now = Date.now();
    const proposal = buildAgentProposal(body);
    setIsSending(true);
    setDraft("");
    setAgentMessages((current) => [
      ...current,
      { id: `agent-user-${now}`, sender: "user", text: body, createdAt: new Date(now).toISOString() },
      {
        id: `agent-plan-${now}`,
        sender: "ai",
        text: buildAgentPlanText(proposal),
        createdAt: new Date(now + 1).toISOString(),
        canEscalate: proposal.type === "handoff" || machineNeedsAttention,
        agentProposal: proposal,
      },
    ]);
    setIsSending(false);
  };

  const confirmAgentProposal = (proposal: AgentProposal) => {
    const now = Date.now();
    if (proposal.type === "handoff") {
      openHumanChat().catch(() => {});
    }
    setAgentMessages((current) => [
      ...current,
      {
        id: `agent-confirm-${now}`,
        sender: "ai",
        text: isTH
          ? `ยืนยันแผนแล้ว: ${proposal.label}\nหมายเหตุ: รอบนี้ Agent ยังไม่ส่งคำสั่ง hardware จริงโดยอัตโนมัติ จะทำเฉพาะขั้นตอนปลอดภัย/เปิดหน้าที่เกี่ยวข้องก่อน`
          : `Plan confirmed: ${proposal.label}\nNote: The agent does not automatically send real hardware commands yet. It only performs safe preparation/navigation steps first.`,
        createdAt: new Date(now).toISOString(),
      },
    ]);
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
  const activePumpCount = [pump1On, pump2On].filter(Boolean).length;
  const sensorAiReport = useMemo(
    () =>
      analyzeSensorIntelligence({
        language,
        deviceId: activeDeviceId,
        mqttStatus,
        boardConnected,
        lastTelemetryAt,
        current: {
          timestamp: lastTelemetryAt,
          deviceId: activeDeviceId,
          phValue,
          ecValue,
          tempValue,
          wls1,
          wls2,
          floatAlarm,
          locked,
          pump1On,
          pump2On,
          greenOn,
          redOn,
          isOn,
        },
        history: telemetryHistory,
      }),
    [
      activeDeviceId,
      boardConnected,
      ecValue,
      floatAlarm,
      greenOn,
      isOn,
      language,
      lastTelemetryAt,
      locked,
      mqttStatus,
      phValue,
      pump1On,
      pump2On,
      redOn,
      telemetryHistory,
      tempValue,
      wls1,
      wls2,
    ],
  );
  const machineNeedsAttention = ["critical", "warning"].includes(sensorAiReport.severity) || (boardConnected && !phOk);
  const natStatusText = sensorAiReport.statusText;
  const natStatusTone = sensorAiReport.severity === "critical"
    ? "bg-red-500"
    : sensorAiReport.severity === "warning"
      ? "bg-amber-500"
      : sensorAiReport.severity === "offline"
        ? "bg-slate-400"
        : liveSignal
          ? "bg-emerald-500"
          : "bg-slate-400";
  const sensorAiCardClass = sensorAiReport.severity === "critical"
    ? "border-red-200 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100"
    : sensorAiReport.severity === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
      : sensorAiReport.severity === "offline"
        ? "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100"
        : "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100";
  const formatTelemetryValue = (value: number, digits: number) =>
    Number.isFinite(value) && value > 0 ? value.toFixed(digits) : "--";
  const formatSensorDateTime = (value?: string | null) => {
    if (!value) return isTH ? "ยังไม่มีข้อมูล" : "No data yet";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString(isTH ? "th-TH" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };
  const latestTelemetrySnapshot = useMemo(() => {
    const sorted = [...telemetryHistory]
      .filter((item) => item.timestamp && Number.isFinite(Date.parse(item.timestamp)))
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    return sorted[0] || null;
  }, [telemetryHistory]);
  const latestSensorTimestamp = lastTelemetryAt || latestTelemetrySnapshot?.timestamp || "";
  const latestSensorDeviceId = activeDeviceId || latestTelemetrySnapshot?.deviceId || (isTH ? "ยังไม่ได้เลือกอุปกรณ์" : "No active device");
  const latestSensorValues = [
    `pH ${formatTelemetryValue(phValue || latestTelemetrySnapshot?.phValue || 0, 2)}`,
    `EC ${formatTelemetryValue(ecValue || latestTelemetrySnapshot?.ecValue || 0, 2)}`,
    `Temp ${formatTelemetryValue(tempValue || latestTelemetrySnapshot?.tempValue || 0, 1)}`,
  ].join(" | ");
  const formatDateKey = (value?: string | null) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  };
  const parseRequestedDateKey = (body: string) => {
    const normalized = body.toLowerCase();
    const thaiMonths: Record<string, number> = {
      "ม.ค.": 1, "มกราคม": 1,
      "ก.พ.": 2, "กุมภาพันธ์": 2,
      "มี.ค.": 3, "มีนาคม": 3,
      "เม.ย.": 4, "เมษายน": 4,
      "พ.ค.": 5, "พฤษภาคม": 5,
      "มิ.ย.": 6, "มิถุนายน": 6,
      "ก.ค.": 7, "กรกฎาคม": 7,
      "ส.ค.": 8, "สิงหาคม": 8,
      "ก.ย.": 9, "กันยายน": 9,
      "ต.ค.": 10, "ตุลาคม": 10,
      "พ.ย.": 11, "พฤศจิกายน": 11,
      "ธ.ค.": 12, "ธันวาคม": 12,
    };

    for (const [label, month] of Object.entries(thaiMonths)) {
      const match = normalized.match(new RegExp(`(\\d{1,2})\\s*${label.replace(".", "\\.")}\\s*(\\d{4})`));
      if (match) {
        let year = Number(match[2]);
        if (year > 2400) year -= 543;
        return `${year}-${String(month).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
      }
    }

    const numeric = normalized.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
    if (numeric) {
      let year = Number(numeric[3]);
      if (year > 2400) year -= 543;
      return `${year}-${String(Number(numeric[2])).padStart(2, "0")}-${String(Number(numeric[1])).padStart(2, "0")}`;
    }

    return "";
  };
  const parseRequestedYear = (body: string) => {
    const normalized = body.toLowerCase();
    const explicit = normalized.match(/(?:พ\.?\s*ศ\.?|ปี|year|ค\.?\s*ศ\.?)\s*(\d{4})/i);
    const loose = normalized.match(/\b(20\d{2}|25\d{2})\b/);
    const match = explicit || loose;
    if (!match) return null;

    let year = Number(match[1]);
    if (!Number.isFinite(year)) return null;
    if (year > 2400) year -= 543;
    return year >= 2000 && year <= 2100 ? year : null;
  };
  const formatDateLabel = (dateKey: string) => {
    const parsed = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateKey;
    return parsed.toLocaleDateString(isTH ? "th-TH" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  const formatDateLabelFor = (dateKey: string, replyThai: boolean) => {
    const parsed = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateKey;
    return parsed.toLocaleDateString(replyThai ? "th-TH" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  const formatYearLabelFor = (year: number, replyThai: boolean) =>
    replyThai ? `พ.ศ. ${year + 543}` : `${year}`;
  const formatTelemetryRowValues = (row: typeof telemetryHistory[number]) =>
    `pH ${formatTelemetryValue(row.phValue, 2)} | EC ${formatTelemetryValue(row.ecValue, 2)} | Temp ${formatTelemetryValue(row.tempValue, 1)} | ปั๊ม1 ${row.pump1On ? "ON" : "OFF"} | ปั๊ม2 ${row.pump2On ? "ON" : "OFF"}`;
  const buildAssistantProjectSnapshot = () => {
    const recentYieldEntries = [...cropYieldEntries]
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
      .slice(0, 20);
    const monthlyYield = getMonthlyYieldSummaries(cropYieldEntries, isTH ? "th-TH" : "en-US")
      .slice(-6)
      .map((month) => ({
        month: month.monthLabel,
        total_yield_g: month.yield,
        average_yield_g: month.averageYield,
        harvest_count: month.frequency,
        avg_ph: month.avgPh,
        avg_oxygen: month.avgOxygen,
        avg_ec: month.avgEc,
        avg_temp: month.avgTemp,
      }));
    const yearlyYield = Object.values(
      cropYieldEntries.reduce<Record<string, {
        year: number;
        total_yield_g: number;
        harvest_count: number;
        avg_ph_total: number;
        avg_oxygen_total: number;
        avg_ec_total: number;
        avg_temp_total: number;
      }>>((groups, entry) => {
        const year = Number(entry.date.slice(0, 4));
        if (!Number.isFinite(year)) return groups;
        const key = String(year);
        const current = groups[key] || {
          year,
          total_yield_g: 0,
          harvest_count: 0,
          avg_ph_total: 0,
          avg_oxygen_total: 0,
          avg_ec_total: 0,
          avg_temp_total: 0,
        };
        current.total_yield_g += entry.yield;
        current.harvest_count += 1;
        current.avg_ph_total += entry.ph;
        current.avg_oxygen_total += entry.oxygen;
        current.avg_ec_total += entry.ec;
        current.avg_temp_total += entry.temp;
        groups[key] = current;
        return groups;
      }, {})
    )
      .sort((a, b) => b.year - a.year)
      .slice(0, 8)
      .map((year) => ({
        year: year.year,
        total_yield_g: Math.round(year.total_yield_g * 100) / 100,
        harvest_count: year.harvest_count,
        average_yield_g: year.harvest_count ? Math.round((year.total_yield_g / year.harvest_count) * 100) / 100 : 0,
        avg_ph: year.harvest_count ? Math.round((year.avg_ph_total / year.harvest_count) * 100) / 100 : 0,
        avg_oxygen: year.harvest_count ? Math.round((year.avg_oxygen_total / year.harvest_count) * 100) / 100 : 0,
        avg_ec: year.harvest_count ? Math.round((year.avg_ec_total / year.harvest_count) * 100) / 100 : 0,
        avg_temp: year.harvest_count ? Math.round((year.avg_temp_total / year.harvest_count) * 100) / 100 : 0,
      }));
    const totalYield = cropYieldEntries.reduce((sum, entry) => sum + entry.yield, 0);

    return {
      scope: "frontend snapshot for the currently authenticated account only",
      page: currentPage,
      language,
      user: {
        id: userContext?.id,
        name: userContext?.name,
        role: userContext?.role,
      },
      devices: {
        active_device_id: activeDeviceId || null,
        loaded_device_count: deviceCount,
      },
      live_machine: {
        status_label: natStatusText,
        mqtt_status: mqttStatus,
        board_connected: boardConnected,
        last_telemetry_at: lastTelemetryAt || latestTelemetrySnapshot?.timestamp || null,
        telemetry_history_count: telemetryHistory.length,
        is_on: isOn,
        pumps: {
          pump1_on: pump1On,
          pump2_on: pump2On,
          active_count: activePumpCount,
        },
        water_level: {
          wls1,
          wls2,
          float_alarm: floatAlarm,
          locked,
        },
        values: {
          ph: phValue || latestTelemetrySnapshot?.phValue || 0,
          ec: ecValue || latestTelemetrySnapshot?.ecValue || 0,
          temp_c: tempValue || latestTelemetrySnapshot?.tempValue || 0,
          ph_ok: phOk,
        },
        latest_values_label: latestSensorValues,
      },
      sensor_ai: {
        health_score: sensorAiReport.healthScore,
        severity: sensorAiReport.severity,
        status: sensorAiReport.statusText,
        summary: sensorAiReport.summary,
        risks: sensorAiReport.risks.slice(0, 6),
        recommendations: sensorAiReport.recommendations.slice(0, 6),
        trends: sensorAiReport.trends.slice(0, 6).map((trend) => trend.text),
      },
      ai_learning: learningSummary
        ? {
            tenant_id: learningSummary.tenant_id,
            total_samples: learningSummary.total_samples,
            labels: learningSummary.labels,
          }
        : null,
      crop_yield: {
        total_entries: cropYieldEntries.length,
        total_yield_g: Math.round(totalYield * 100) / 100,
        monthly: monthlyYield,
        yearly: yearlyYield,
        recent_entries: recentYieldEntries.map((entry) => ({
          date: entry.date,
          time: entry.time,
          yield_g: entry.yield,
          ph: entry.ph,
          oxygen: entry.oxygen,
          ec: entry.ec,
          temp_c: entry.temp,
          note: entry.note || "",
        })),
      },
    };
  };
  const buildDateHistoryAnswer = (dateKey: string) => {
    const rows = telemetryHistory
      .filter((row) => formatDateKey(row.timestamp) === dateKey)
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    const label = formatDateLabel(dateKey);

    if (rows.length === 0) {
      return isTH
        ? `รอบวันที่ ${label} ผมยังไม่เจอข้อมูลใน history ของเครื่องนี้ครับ\nข้อมูลล่าสุดที่ระบบมีคือ ${formatSensorDateTime(latestSensorTimestamp)}\n${latestSensorValues}`
        : `I do not see telemetry for ${label} in this device history yet.\nLatest available data is ${formatSensorDateTime(latestSensorTimestamp)}\n${latestSensorValues}`;
    }

    const newest = rows[0];
    const oldest = rows[rows.length - 1];
    const average = (pick: (row: typeof newest) => number, digits: number) => {
      const values = rows.map(pick).filter((value) => Number.isFinite(value) && value > 0);
      if (values.length === 0) return "--";
      return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(digits);
    };

    return isTH
      ? `รอบวันที่ ${label} มีข้อมูล ${rows.length} รายการครับ\nใหม่สุด: ${formatSensorDateTime(newest.timestamp)}\n${formatTelemetryRowValues(newest)}\nค่าเฉลี่ยวันนั้น: pH ${average((row) => row.phValue, 2)} | EC ${average((row) => row.ecValue, 2)} | Temp ${average((row) => row.tempValue, 1)}\nช่วงข้อมูล: ${formatSensorDateTime(oldest.timestamp)} ถึง ${formatSensorDateTime(newest.timestamp)}`
      : `${label} has ${rows.length} telemetry record${rows.length === 1 ? "" : "s"}.\nNewest: ${formatSensorDateTime(newest.timestamp)}\n${formatTelemetryRowValues(newest)}\nDaily average: pH ${average((row) => row.phValue, 2)} | EC ${average((row) => row.ecValue, 2)} | Temp ${average((row) => row.tempValue, 1)}\nRange: ${formatSensorDateTime(oldest.timestamp)} to ${formatSensorDateTime(newest.timestamp)}`;
  };
  const isCropYieldQuestion = (body: string) =>
    /(ผลผลิต|ผลิตได้|ผลิตเท่า|มีผลิต|เก็บเกี่ยว|harvest|yield|production output|production)/i.test(body);
  const isShowDetailsFollowUp = (body: string) => {
    const compact = body
      .toLowerCase()
      .replace(/[\s.?!,，。:;"'“”‘’…]+/g, "")
      .replace(/(ครับ|ค่ะ|คะ|คับ|จ้า|หน่อย|please)$/i, "");

    return (
      /^(ขอดู|ดู|แสดง|แสดงให้ดู|ขอรายละเอียด|รายละเอียด|อันนั้น|รายการนั้น|ตัวนั้น|ล่าสุด|show|showme|detail|details|view|viewit|that|thatone)$/i.test(compact) ||
      /^(ขอดู|ดู|แสดง).*(รายละเอียด|รายการ|ให้ดู)?$/i.test(compact)
    );
  };
  const hasRecentCropYieldContext = (messages: AssistantMessage[] = []) =>
    messages.slice(-6).some((message) => (
      isCropYieldQuestion(message.text) ||
      /สรุปผลผลิต|รายงานผลผลิต|ผลผลิตรวม|รายการล่าสุดที่มี|Yield summary|Yield report|Total yield|Latest saved entry/i.test(message.text)
    ));
  const isCropYieldFollowUp = (body: string, messages: AssistantMessage[] = []) =>
    isShowDetailsFollowUp(body) && hasRecentCropYieldContext(messages);
  const formatYieldNumber = (value: number, replyThai = isTH) =>
    Number.isFinite(value)
      ? value.toLocaleString(replyThai ? "th-TH" : "en-US", { maximumFractionDigits: 2 })
      : "--";
  const buildCropYieldAnswer = (dateKey?: string, userText = "") => {
    const replyThai = shouldReplyThai(userText);
    const requestedYear = parseRequestedYear(userText);
    const sortedEntries = [...cropYieldEntries].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    const targetRows = dateKey
      ? sortedEntries.filter((entry) => entry.date === dateKey)
      : requestedYear
        ? sortedEntries.filter((entry) => Number(entry.date.slice(0, 4)) === requestedYear)
      : sortedEntries.slice(0, 1);
    const label = dateKey
      ? formatDateLabelFor(dateKey, replyThai)
      : requestedYear
        ? formatYearLabelFor(requestedYear, replyThai)
        : (replyThai ? "รายการล่าสุด" : "latest entry");

    if (targetRows.length === 0) {
      const latest = sortedEntries[0];
      if (!latest) {
        return replyThai
          ? `ยังไม่มีข้อมูลผลผลิตที่บันทึกไว้ในหน้า รายงานผลผลิต ครับ\nถ้าต้องการให้ผมตอบยอด ${label} ให้เพิ่มรายการผลผลิตก่อน`
          : `There is no saved crop yield data in Crop Reports yet.\nAdd a harvest entry for ${label}, then I can answer the total.`;
      }

      return replyThai
        ? `${requestedYear ? "ปี" : "วันที่"} ${label} ยังไม่พบรายการผลผลิตที่บันทึกไว้ครับ\nรายการล่าสุดที่มีคือ ${formatDateLabelFor(latest.date, replyThai)} เวลา ${latest.time}: ${formatYieldNumber(latest.yield, replyThai)} กรัม`
        : `I do not see a saved yield entry for ${label}.\nLatest saved entry: ${formatDateLabelFor(latest.date, replyThai)} at ${latest.time}: ${formatYieldNumber(latest.yield, replyThai)} g.`;
    }

    const totalYield = targetRows.reduce((sum, entry) => sum + entry.yield, 0);
    const averageYield = totalYield / targetRows.length;
    const detailLines = targetRows
      .map((entry, index) => (
        replyThai
          ? `${index + 1}. เวลา ${entry.time || "--"} | ${formatYieldNumber(entry.yield, replyThai)} กรัม`
          : `${index + 1}. ${entry.time || "--"} | ${formatYieldNumber(entry.yield, replyThai)} g`
      ))
      .join("\n");
    const qualityRows = targetRows.filter((entry) => entry.ph > 0 || entry.ec > 0 || entry.temp > 0);
    const qualityLine = qualityRows.length
      ? (() => {
          const avg = (pick: (entry: CropYieldEntry) => number, digits: number) => {
            const values = targetRows.map(pick).filter((value) => Number.isFinite(value) && value > 0);
            if (!values.length) return "--";
            return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(digits);
          };
          return replyThai
            ? `ค่าน้ำเฉลี่ย\npH: ${avg((entry) => entry.ph, 2)}\nEC: ${avg((entry) => entry.ec, 2)} mS/cm\nอุณหภูมิ: ${avg((entry) => entry.temp, 1)} C`
            : `Average water values\npH: ${avg((entry) => entry.ph, 2)}\nEC: ${avg((entry) => entry.ec, 2)} mS/cm\nTemp: ${avg((entry) => entry.temp, 1)} C`;
        })()
      : "";

    return replyThai
      ? [
          "สรุปผลผลิต",
          `วันที่: ${label}`,
          `ผลผลิตรวม: ${formatYieldNumber(totalYield, replyThai)} กรัม`,
          `จำนวนบันทึก: ${targetRows.length} รายการ`,
          ...(targetRows.length > 1 ? [`เฉลี่ยต่อรายการ: ${formatYieldNumber(averageYield, replyThai)} กรัม`] : []),
          "",
          "รายละเอียดบันทึก",
          detailLines,
          ...(qualityLine ? ["", qualityLine] : []),
        ].join("\n")
      : [
          "Yield summary",
          `Date: ${label}`,
          `Total yield: ${formatYieldNumber(totalYield, replyThai)} g`,
          `Records: ${targetRows.length}`,
          ...(targetRows.length > 1 ? [`Average per record: ${formatYieldNumber(averageYield, replyThai)} g`] : []),
          "",
          "Record details",
          detailLines,
          ...(qualityLine ? ["", qualityLine] : []),
        ].join("\n");
  };
  const buildLocalAssistantAnswer = (body: string, contextMessages: AssistantMessage[] = []) => {
    const requestedDateKey = parseRequestedDateKey(body);
    if (isCropYieldQuestion(body) || isCropYieldFollowUp(body, contextMessages)) {
      return buildCropYieldAnswer(requestedDateKey || undefined, body);
    }
    return "";
  };
  const buildPumpTroubleAnswer = () => {
    const latestRow = latestTelemetrySnapshot;
    const pump1Active = pump1On || Boolean(latestRow?.pump1On);
    const pump2Active = pump2On || Boolean(latestRow?.pump2On);
    const latestLine = latestRow
      ? `${formatSensorDateTime(latestRow.timestamp)}: ${formatTelemetryRowValues(latestRow)}`
      : `${formatSensorDateTime(latestSensorTimestamp)}: ${latestSensorValues}`;

    if (pump1Active || pump2Active) {
      const active = [pump1Active ? "ปั๊ม 1" : "", pump2Active ? "ปั๊ม 2" : ""].filter(Boolean).join(", ");
      return isTH
        ? `จากข้อมูลล่าสุด ${active} ยังเป็น ON ครับ\n${latestLine}\nให้กดหยุด/ปุ่มฉุกเฉินก่อน แล้วดูว่าสถานะเปลี่ยนเป็น OFF ไหม\nถ้าหน้างานยังหมุนทั้งที่ระบบสั่ง OFF แล้ว น่าจะต้องตรวจ relay/contactor หรือวงจรควบคุม`
        : `Latest data shows ${active} is still ON.\n${latestLine}\nPress stop/emergency stop first and check whether status changes to OFF.\nIf the pump still runs while the system says OFF, inspect the relay/contactor or control circuit.`;
    }

    return isTH
      ? `ข้อมูลล่าสุดในระบบบอกว่าปั๊ม 1 และปั๊ม 2 เป็น OFF ครับ\n${latestLine}\nถ้าที่หน้างานปั๊มยังไม่หยุด แปลว่าสถานะในระบบกับไฟจริงไม่ตรงกัน ให้ตัดไฟ/ตรวจ relay หรือ contactor ก่อน`
      : `Latest system data says Pump 1 and Pump 2 are OFF.\n${latestLine}\nIf the physical pump is still running, the real wiring state does not match the app. Cut power and inspect the relay or contactor first.`;
  };
  const formatLearningSummaryText = () => {
    const totalSamples = Number(learningSummary?.total_samples || 0);
    const labels = Object.entries(learningSummary?.labels || {})
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 4)
      .map(([label, total]) => `${label}:${Number(total).toLocaleString()}`)
      .join(", ");

    if (!learningSummary) {
      return isTH
        ? "ML data: กำลังโหลด/ยังอ่านข้อมูลสะสมไม่ได้"
        : "ML data: loading or unavailable";
    }

    if (totalSamples === 0) {
      return isTH
        ? "ML data: ยังไม่มี sample ของบัญชีนี้พอ ระบบจะเก็บจาก sensor_data ไปเรื่อย ๆ อัตโนมัติ"
        : "ML data: no samples for this account yet. The system will keep collecting from sensor_data automatically.";
    }

    return isTH
      ? `ML data ของบัญชีนี้: ${totalSamples.toLocaleString()} sample${labels ? ` (${labels})` : ""}`
      : `ML data for this account: ${totalSamples.toLocaleString()} sample${totalSamples === 1 ? "" : "s"}${labels ? ` (${labels})` : ""}`;
  };
  const buildLiveContextLines = () => [
    isTH ? `MQTT: ${mqttStatus === "connected" ? "เชื่อมต่อ" : "ยังไม่เชื่อมต่อ"}` : `MQTT: ${mqttStatus}`,
    isTH ? `บอร์ด: ${boardConnected ? "ออนไลน์" : "ยังไม่มีสัญญาณ"}` : `Board: ${boardConnected ? "online" : "no signal"}`,
    isTH ? `ปั๊มทำงาน: ${activePumpCount}/2 ตัว` : `Running pumps: ${activePumpCount}/2`,
    `pH ${formatTelemetryValue(phValue, 2)} | EC ${formatTelemetryValue(ecValue, 2)} | Temp ${formatTelemetryValue(tempValue, 1)}`,
    formatLearningSummaryText(),
    isTH
      ? `ข้อมูลแยกตาม user: tenant ${learningSummary?.tenant_id || "ตาม token ที่ login"}`
      : `User data isolation: tenant ${learningSummary?.tenant_id || "from the logged-in token"}`,
  ];
  const buildMachineStatusAnswer = () => {
    const liveSnapshot = buildLiveContextLines().join("\n");

    return `${formatSensorAiAnswer(sensorAiReport, language, activeDeviceId)}\n\n${liveSnapshot}`;
  };
  const buildLatestSensorAnswer = () => {
    const sampleLine = formatLearningSummaryText();

    if (!latestSensorTimestamp) {
      return isTH
        ? `ข้อมูลล่าสุดของเซ็นเซอร์: ยังไม่มีข้อมูล sensor_data ของ user นี้ในเครื่องที่เลือก\n\nอุปกรณ์: ${latestSensorDeviceId}\n${sampleLine}\n\nข้อมูลนี้กรองตาม user/tenant ที่ login อยู่เท่านั้น ไม่ดึงข้อมูลของ user อื่น`
        : `Latest sensor data: no sensor_data has been loaded for this user on the selected device.\n\nDevice: ${latestSensorDeviceId}\n${sampleLine}\n\nThis is scoped to the logged-in user/tenant only.`;
    }

    return isTH
      ? `ข้อมูลล่าสุดของเซ็นเซอร์ของ user นี้คือ:\n\nวันที่/เวลา: ${formatSensorDateTime(latestSensorTimestamp)}\nอุปกรณ์: ${latestSensorDeviceId}\nค่า: ${latestSensorValues}\nสถานะ AI: ${sensorAiReport.statusText}\n${sampleLine}\n\nข้อมูลนี้เป็นของ tenant ${learningSummary?.tenant_id || "ตาม token ที่ login"} เท่านั้น`
      : `Latest sensor data for this user:\n\nDate/time: ${formatSensorDateTime(latestSensorTimestamp)}\nDevice: ${latestSensorDeviceId}\nValues: ${latestSensorValues}\nAI status: ${sensorAiReport.statusText}\n${sampleLine}\n\nThis belongs only to tenant ${learningSummary?.tenant_id || "from the logged-in token"}.`;
  };
  const buildProjectUserAnswer = () => {
    const userName = String(userContext?.name || "").trim() || (isTH ? "ผู้ใช้" : "User");
    const userEmail = String(userContext?.email || "").trim() || "--";
    const userRole = String(userContext?.role || "user").trim();
    return isTH
      ? `ข้อมูลโปรเจคของ user ที่ login อยู่ตอนนี้:\n\nUser: ${userName}\nEmail: ${userEmail}\nRole: ${userRole}\nActive device: ${activeDeviceId || "ยังไม่ได้เลือก"}\nอุปกรณ์ที่ระบบโหลดได้: ${deviceCount} เครื่อง\nข้อมูล sensor ล่าสุด: ${formatSensorDateTime(lastTelemetryAt || latestTelemetrySnapshot?.timestamp)}\n${formatLearningSummaryText()}\n\nผมจะตอบจากข้อมูลของ user/tenant นี้เท่านั้น ไม่เอาข้อมูลของ user อื่นมาปน`
      : `Project data for the logged-in user:\n\nUser: ${userName}\nEmail: ${userEmail}\nRole: ${userRole}\nActive device: ${activeDeviceId || "none"}\nLoaded devices: ${deviceCount}\nLatest sensor data: ${formatSensorDateTime(lastTelemetryAt || latestTelemetrySnapshot?.timestamp)}\n${formatLearningSummaryText()}\n\nI answer only from this user/tenant context, not from another user's data.`;
  };
  const buildContextualFlowAnswer = (actionKey: string, baseAnswer: string) => {
    const flowContext = buildLiveContextLines().join("\n");
    const extraAdvice = (() => {
      if (actionKey === "offline") {
        return liveSignal
          ? (isTH ? "ตอนนี้ระบบเห็นสัญญาณสดแล้ว ถ้ายังเจอปัญหา ให้ดูว่าเลือกอุปกรณ์ถูกตัวหรือไม่" : "A live signal is currently present. If the issue remains, confirm the selected device.")
          : (isTH ? "จากข้อมูลล่าสุดยังไม่มีสัญญาณสด ให้เริ่มจากไฟเลี้ยง, Wi-Fi, MQTT และ device id" : "Latest data still has no live signal. Start with power, Wi-Fi, MQTT, and device id.");
      }
      if (actionKey === "sensor") {
        return sensorAiReport.sampleCount > 0
          ? (isTH ? `มี telemetry history ${sensorAiReport.sampleCount.toLocaleString()} จุด ผมใช้แนวโน้มนี้ช่วยดูความผิดปกติแล้ว` : `There are ${sensorAiReport.sampleCount.toLocaleString()} telemetry points, and I used that trend for this check.`)
          : (isTH ? "ยังไม่มี history เพียงพอ ระบบจะเก็บต่อเพื่อให้วิเคราะห์ดีขึ้น" : "There is not enough history yet. The system will keep collecting for better analysis.");
      }
      if (actionKey === "urgent") {
        return machineNeedsAttention
          ? (isTH ? "เคสนี้ควรส่งต่อเจ้าหน้าที่ เพราะ AI เห็นระดับ warning/critical จากข้อมูลจริง" : "This should be handed off because AI sees warning/critical status from live data.")
          : (isTH ? "ตอนนี้ AI ยังไม่เห็น critical จาก sensor แต่ถ้าไซต์งานมีอันตรายจริงให้หยุดเครื่องก่อน" : "AI does not see a critical sensor state right now, but stop the machine first if the site is unsafe.");
      }
      return isTH
        ? "ผมแนบสถานะเครื่องและข้อมูล ML ล่าสุดของบัญชีนี้ไว้ด้านล่าง เพื่อไม่ตอบลอย ๆ"
        : "I included the latest machine and ML context for this account below.";
    })();

    return `${baseAnswer}\n\n${extraAdvice}\n\n${flowContext}`;
  };
  const buildAssistantFreeAnswer = (body: string, contextMessages: AssistantMessage[] = []) => {
    const normalizedBody = body.toLowerCase();
    const pageContext = isTH
      ? `ตอนนี้คุณอยู่หน้า ${currentPage} และสถานะเครื่องคือ "${natStatusText}"`
      : `You are on ${currentPage}, and the machine status is "${natStatusText}".`;
    const compactBody = normalizedBody.replace(/\s+/g, "");
    const requestedDateKey = parseRequestedDateKey(body);
    const asksDateHistory = Boolean(requestedDateKey) && /(รอบ|วันที่|ข้อมูล|ค่า|history|ย้อนหลัง|record|cycle|data)/i.test(normalizedBody);
    const asksPumpTrouble = /(ปั๊ม|pump).*(ไม่หยุด|ไม่ดับ|ค้าง|ยังทำงาน|หยุดไม่ได้|not stop|stuck|still running)|(ไม่หยุด|ไม่ดับ|ค้าง|หยุดไม่ได้).*(ปั๊ม|pump)/i.test(normalizedBody);
    const asksDownloadData =
      /(โหลด|ดาวน์โหลด|download|export|ส่งออก|เอาออก|ดึง).*(ข้อมูล|data|รายงาน|report|ไฟล์|file|csv|excel|pdf)|((ข้อมูล|data|รายงาน|report|ไฟล์|file|csv|excel|pdf).*(โหลด|ดาวน์โหลด|download|export|ส่งออก|เอาออก|ดึง))/i.test(normalizedBody);
    const asksCropYieldData = isCropYieldQuestion(body) || isCropYieldFollowUp(body, contextMessages);
    const asksLatestSensorData =
      /(ล่าสุด|วันไหน|เมื่อไหร่|เวลาไหน|last|latest|recent).*(เซ็นเซอร์|sensor|ข้อมูล|data)|((เซ็นเซอร์|sensor|ข้อมูล|data).*(ล่าสุด|วันไหน|เมื่อไหร่|last|latest|recent))/i.test(normalizedBody) ||
      /(ข้อมูลล่าสุด|latestdata|recentdata).*(เซ็นเซอร์|sensor)|((เซ็นเซอร์|sensor).*(ข้อมูลล่าสุด|วันไหน|ล่าสุด))/i.test(compactBody);
    const asksProjectOrUserData = /(ข้อมูลทั้งหมด|ข้อมูลโปรเจค|โปรเจค|project|ข้อมูล user|ข้อมูลผู้ใช้|user data|account data|ของ user|ของบัญชี)/i.test(normalizedBody);
    const asksConversationMeta = /(ตอบ|คุย|แชท|chat|conversation|template|แม่แบบ|ซ้ำ|ไม่ตรง|มั่ว|ไม่เข้าใจ|natural|ธรรมชาติ|robot)/i.test(normalizedBody);

    if (asksCropYieldData) {
      return buildCropYieldAnswer(requestedDateKey || undefined, body);
    }

    if (asksDateHistory && requestedDateKey) {
      return buildDateHistoryAnswer(requestedDateKey);
    }

    if (asksPumpTrouble) {
      return buildPumpTroubleAnswer();
    }

    if (asksDownloadData) {
      const deviceLine = activeDeviceId
        ? (isTH ? `เครื่องที่เลือกอยู่คือ ${activeDeviceId}` : `The selected device is ${activeDeviceId}.`)
        : (isTH ? "ตอนนี้ยังไม่ได้เลือก active device ชัดเจน" : "There is no clear active device selected yet.");

      return isTH
        ? `ได้ครับ ถ้าต้องการโหลดข้อมูล ผมช่วยไล่ให้ได้เลย\n${deviceLine}\nคุณอยากโหลดข้อมูลแบบไหนครับ: ข้อมูล sensor ตามช่วงวันที่, รายงานการปลูก, หรือ transcript แชทนี้?\nถ้าหมายถึง sensor บอกช่วงวันที่มาได้เลย เช่น "วันนี้", "เดือนนี้", หรือ "1/7/2026"`
        : `Sure. I can help you narrow down the export.\n${deviceLine}\nWhich data do you want to download: sensor history by date range, crop reports, or this chat transcript?\nIf you mean sensor data, send a range like "today", "this month", or "2026-07-01".`;
    }

    if (asksLatestSensorData) {
      return buildLatestSensorAnswer();
    }

    if (asksProjectOrUserData) {
      return buildProjectUserAnswer();
    }

    if (/status|สถานะ|เครื่อง|online|offline|mqtt|บอร์ด|สัญญาณ/.test(normalizedBody)) {
      return `${pageContext}\n\n${buildMachineStatusAnswer()}`;
    }

    if (/user|profile|account|บัญชี|โปรไฟล์|ข้อมูลฉัน|ข้อมูลผู้ใช้|อีเมล|email|role|สิทธิ์|ชื่อ/.test(normalizedBody)) {
      return `${pageContext}\n\n${buildProjectUserAnswer()}`;
    }

    if (/device|อุปกรณ์|เครื่องที่ผูก|pair|จับคู่|active device|เครื่องหลัก/.test(normalizedBody)) {
      return isTH
        ? `${pageContext}\n\nตอนนี้บัญชีนี้มีอุปกรณ์ที่ระบบโหลดได้ ${deviceCount} เครื่อง${activeDeviceId ? ` และกำลังเลือก ${activeDeviceId}` : ""} ถ้าต้องการเพิ่ม/เปลี่ยนเครื่อง ให้ไปที่ Farm Settings หรือ Device Pairing ครับ`
        : `${pageContext}\n\nThis account currently has ${deviceCount} loaded device${deviceCount === 1 ? "" : "s"}${activeDeviceId ? `, with ${activeDeviceId} selected` : ""}. To add or change a device, open Farm Settings or Device Pairing.`;
    }

    const matchedFlowKey = Object.entries(assistantFlows).find(([key, flow]) => {
      const title = flow.title.toLowerCase();
      return normalizedBody.includes(key) || normalizedBody.includes(title);
    })?.[0] as keyof typeof assistantFlows | undefined;

    if (matchedFlowKey) {
      return `${pageContext}\n\n${buildContextualFlowAnswer(matchedFlowKey, assistantFlows[matchedFlowKey].answer)}`;
    }

    if (/alarm|alert|เตือน|แดง|lock|ล็อก|น้ำ|float|ph|ec/.test(normalizedBody)) {
      return `${pageContext}\n\n${formatSensorAiAnswer(sensorAiReport, language, activeDeviceId)}`;
    }

    if (asksConversationMeta) {
      return isTH
        ? `เข้าใจครับ เมื่อกี้ผมตอบแข็งเกินไปเหมือนดึงแม่แบบมาใช้\nลองพิมพ์แบบที่คุณคุยปกติได้เลย เช่น "อยากโหลดข้อมูลวันนี้" หรือ "ปั๊มยังไม่หยุด" แล้วผมจะตอบให้ตรงประโยคก่อน ค่อยเสริมข้อมูลเครื่องเท่าที่จำเป็น`
        : `You are right, that sounded too much like a template.\nYou can talk normally, for example "download today's data" or "the pump still will not stop", and I will answer the actual sentence first before adding machine context.`;
    }

    return isTH
      ? `ได้ครับ ผมอยู่หน้านี้กับคุณอยู่\nถ้าจะให้ช่วยต่อ บอกมาแบบภาษาคุยได้เลย เช่น อยากโหลดข้อมูลช่วงไหน, เครื่องมีอาการอะไร, หรืออยากให้ดูหน้าจอส่วนไหน\n${pageContext}`
      : `Got it. I am here with this page.\nTell me naturally what you want next, such as which data range to download, what the machine is doing, or which screen you want checked.\n${pageContext}`;
  };
  const inferAssistantIntent = (body: string, contextMessages: AssistantMessage[] = []) => {
    const normalizedBody = body.toLowerCase();
    if (/status|สถานะ|เครื่อง|online|offline|mqtt|บอร์ด|สัญญาณ/.test(normalizedBody)) return "status";
    if (/alarm|alert|เตือน|แดง|lock|ล็อก|น้ำ|float|ph|ec/.test(normalizedBody)) return "alert";
    if (isCropYieldQuestion(body) || isCropYieldFollowUp(body, contextMessages)) return "crop_yield";
    if (/(โหลด|ดาวน์โหลด|download|export|ส่งออก|เอาออก|ดึง).*(ข้อมูล|data|รายงาน|report|ไฟล์|file|csv|excel|pdf)|((ข้อมูล|data|รายงาน|report|ไฟล์|file|csv|excel|pdf).*(โหลด|ดาวน์โหลด|download|export|ส่งออก|เอาออก|ดึง))/.test(normalizedBody)) return "download";
    if (/sensor|เซ็นเซอร์|ข้อมูล sensor|sensor data|ข้อมูลล่าสุด|history|ย้อนหลัง|อัปเดต|update|ค้าง|frozen/.test(normalizedBody)) return "sensor";
    if (/pair|เชื่อมต่อ|จับคู่|device id|code/.test(normalizedBody)) return "pairing";
    if (/login|เข้าสู่ระบบ|รหัส|password/.test(normalizedBody)) return "login";
    if (/เจ้าหน้าที่|แอดมิน|support|staff|admin|human/.test(normalizedBody)) return "human_request";
    return "general";
  };
  const shouldEscalateAssistantRequest = (body: string) => {
    const normalizedBody = body.toLowerCase();
    const asksForHuman = /เจ้าหน้าที่|แอดมิน|คนจริง|support|staff|admin|human/.test(normalizedBody);
    const urgentIssue = /ด่วน|ฉุกเฉิน|เสีย|พัง|หยุดทำงาน|น้ำล้น|ไฟแดง|alarm|alert|critical|urgent/.test(normalizedBody);
    const signalIssue = /ไม่ออนไลน์|offline|ไม่มีสัญญาณ|mqtt|เชื่อมต่อไม่ได้|pairing|จับคู่/.test(normalizedBody);

    return asksForHuman || urgentIssue || machineNeedsAttention || (signalIssue && !liveSignal);
  };
  const cleanListPrefix = (line: string) => line.replace(/^(\d+\.|[-*•])\s*/, "").trim();
  const splitKeyValueLine = (line: string) => {
    const [label, ...valueParts] = line.split(":");
    return {
      label: label.trim(),
      value: valueParts.join(":").trim(),
    };
  };
  const isListLine = (line: string) => /^(\d+\.|[-*•])\s+/.test(line.trim());
  const isKeyValueLine = (line: string) => {
    const parts = splitKeyValueLine(line);
    return Boolean(parts.label && parts.value && parts.label.length <= 34);
  };
  const renderRichAssistantBlock = (block: string, index: number) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    const titleCandidate = lines.length > 1 && !isListLine(lines[0]) && !isKeyValueLine(lines[0]) && lines[0].length <= 70
      ? lines[0].replace(/[:：]$/, "")
      : "";
    const bodyLines = titleCandidate ? lines.slice(1) : lines;
    const keyValueLines = bodyLines.filter(isKeyValueLine);
    const listLines = bodyLines.filter(isListLine);

    if (bodyLines.length > 0 && keyValueLines.length >= Math.max(2, bodyLines.length - 1)) {
      return (
        <div key={`${index}-${block}`} className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/70 shadow-sm dark:border-emerald-900/55 dark:bg-emerald-950/20">
          {titleCandidate && (
            <div className="flex items-center gap-2 border-b border-emerald-100 bg-white/80 px-3 py-2 text-xs font-black text-emerald-700 dark:border-emerald-900/50 dark:bg-slate-950/35 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{titleCandidate}</span>
            </div>
          )}
          <div className="grid gap-1.5 px-3 py-3 text-xs">
            {bodyLines.map((line) => {
              if (!isKeyValueLine(line)) {
                return <div key={line} className="leading-5 text-slate-700 dark:text-slate-200">{line}</div>;
              }
              const item = splitKeyValueLine(line);
              return (
                <div key={line} className="grid grid-cols-[minmax(72px,0.48fr)_minmax(0,1fr)] gap-3 rounded-xl bg-white/85 px-3 py-2 dark:bg-slate-950/45">
                  <span className="min-w-0 break-words font-semibold text-slate-500 dark:text-slate-400">{item.label}</span>
                  <span className="min-w-0 break-words text-right font-bold text-slate-900 dark:text-slate-100">{item.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (bodyLines.length > 1 && listLines.length >= Math.max(2, bodyLines.length - 1)) {
      return (
        <div key={`${index}-${block}`} className="rounded-2xl border border-cyan-100 bg-cyan-50/60 px-3 py-3 shadow-sm dark:border-cyan-900/45 dark:bg-cyan-950/20">
          {titleCandidate && <div className="mb-2 text-xs font-black text-cyan-800 dark:text-cyan-200">{titleCandidate}</div>}
          <div className="space-y-2">
            {bodyLines.map((line) => (
              <div key={line} className="flex gap-2 text-sm leading-6 text-slate-800 dark:text-slate-100">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                <span className="min-w-0 break-words">{cleanListPrefix(line)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div key={`${index}-${block}`} className="rounded-2xl bg-slate-50/80 px-3 py-3 text-sm leading-6 text-slate-800 dark:bg-slate-950/40 dark:text-slate-100">
        {titleCandidate && <div className="mb-1 text-xs font-black text-emerald-700 dark:text-emerald-300">{titleCandidate}</div>}
        <div className="whitespace-pre-wrap break-words">{bodyLines.join("\n")}</div>
      </div>
    );
  };
  const renderAssistantMessageText = (text: string) => {
    if (!text.startsWith("สรุปผลผลิต\n") && !text.startsWith("Yield summary\n")) {
      const blocks = text.trim().split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
      return (
        <div className="space-y-3">
          {blocks.length > 0
            ? blocks.map((block, index) => renderRichAssistantBlock(block, index))
            : <div className="whitespace-pre-wrap break-words text-sm leading-6">{text}</div>}
        </div>
      );
    }

    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    const isThaiSummary = lines[0] === "สรุปผลผลิต";
    const valueOf = (prefix: string) => lines.find((line) => line.startsWith(prefix))?.slice(prefix.length).trim() || "--";
    const date = valueOf(isThaiSummary ? "วันที่:" : "Date:");
    const total = valueOf(isThaiSummary ? "ผลผลิตรวม:" : "Total yield:");
    const records = valueOf(isThaiSummary ? "จำนวนบันทึก:" : "Records:");
    const average = valueOf(isThaiSummary ? "เฉลี่ยต่อรายการ:" : "Average per record:");
    const detailStart = lines.findIndex((line) => line === (isThaiSummary ? "รายละเอียดบันทึก" : "Record details"));
    const qualityStart = lines.findIndex((line) => line === (isThaiSummary ? "ค่าน้ำเฉลี่ย" : "Average water values"));
    const detailLines = detailStart >= 0
      ? lines.slice(detailStart + 1, qualityStart >= 0 ? qualityStart : undefined).filter((line) => /^\d+\./.test(line))
      : [];
    const qualityLines = qualityStart >= 0 ? lines.slice(qualityStart + 1) : [];

    return (
      <div className="min-w-[240px] overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/70 text-slate-900 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-slate-100">
        <div className="border-b border-emerald-100 bg-white/75 px-4 py-3 dark:border-emerald-900/50 dark:bg-slate-950/35">
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
            {isThaiSummary ? "รายงานผลผลิต" : "Yield report"}
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{date}</div>
        </div>

        <div className="px-4 py-4">
          <div className="rounded-xl bg-white px-3 py-3 shadow-sm dark:bg-slate-950/45">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {isThaiSummary ? "ผลผลิตรวม" : "Total yield"}
            </div>
            <div className="mt-1 text-3xl font-black leading-none text-emerald-600 dark:text-emerald-300">{total}</div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white px-3 py-2 shadow-sm dark:bg-slate-950/45">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {isThaiSummary ? "จำนวนบันทึก" : "Records"}
              </div>
              <div className="mt-1 text-sm font-bold">{records}</div>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 shadow-sm dark:bg-slate-950/45">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {isThaiSummary ? "เฉลี่ย/รายการ" : "Average"}
              </div>
              <div className="mt-1 text-sm font-bold">{average || "-"}</div>
            </div>
          </div>

          {detailLines.length > 0 && (
            <div className="mt-3 rounded-xl border border-emerald-100 bg-white px-3 py-3 text-xs shadow-sm dark:border-emerald-900/45 dark:bg-slate-950/45">
              <div className="mb-2 font-bold text-slate-700 dark:text-slate-200">
                {isThaiSummary ? "รายละเอียดบันทึก" : "Record details"}
              </div>
              <div className="space-y-1.5">
                {detailLines.map((line) => (
                  <div key={line} className="rounded-lg bg-slate-50 px-2 py-1.5 font-medium text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {qualityLines.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-1.5 rounded-xl border border-cyan-100 bg-cyan-50/70 px-3 py-3 text-xs dark:border-cyan-900/45 dark:bg-cyan-950/20">
              <div className="mb-1 font-bold text-cyan-800 dark:text-cyan-200">
                {isThaiSummary ? "ค่าน้ำเฉลี่ย" : "Average water values"}
              </div>
              {qualityLines.map((line) => (
                <div key={line} className="flex justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">{line.split(":")[0]}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{line.split(":").slice(1).join(":").trim()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
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
      }
    : {
        right: "0.5rem",
        bottom: "calc(4.5rem + env(safe-area-inset-bottom))",
      };
  const headerTitle = mode === "assistant"
    ? (isTH ? "NAT AI ผู้ช่วยโปรเจกต์" : "NAT AI project assistant")
    : mode === "chatbot"
      ? (isTH ? "NAT AI ผู้ช่วยโปรเจกต์" : "NAT AI project assistant")
      : mode === "agent"
        ? (isTH ? "NAT AI ผู้ช่วยโปรเจกต์" : "NAT AI project assistant")
      : isTH ? "แชทคุยกับเจ้าหน้าที่" : "Chat with support";
  const headerMeta = mode === "assistant"
    ? (isTH ? "ถามได้ทุกเรื่องของ GreenCrop และข้อมูลบัญชีนี้" : "Ask anything about GreenCrop and this account's data")
    : mode === "chatbot"
      ? (isTH ? "ถามได้ทุกเรื่องของ GreenCrop และข้อมูลบัญชีนี้" : "Ask anything about GreenCrop and this account's data")
      : mode === "agent"
        ? (isTH ? "ช่วยตอบ วิเคราะห์ และวางแผน action ในช่องเดียว" : "Answers, analyzes, and plans actions in one place")
      : humanHeaderMeta;
  const headerStatusClass = mode === "human" ? statusToneClass : natStatusTone;
  const headerStatusText = mode === "assistant"
    ? natStatusText
    : mode === "chatbot"
      ? natStatusText
      : mode === "agent"
        ? (isTH ? "action เครื่องจริงต้องยืนยันก่อน" : "Real machine actions require confirmation")
      : humanHeaderStatus;

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
    }));
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
        <div className={`rounded-[1.35rem] border px-4 py-4 shadow-sm ${sensorAiCardClass}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] opacity-80">
                <Bot className="h-4 w-4" />
                {isTH ? "AI วิเคราะห์เครื่อง" : "AI machine analysis"}
              </div>
              <div className="mt-1 text-lg font-black leading-6">
                {sensorAiReport.statusText}
              </div>
            </div>
            <div className="shrink-0 rounded-2xl bg-white/75 px-3 py-2 text-center shadow-sm dark:bg-slate-950/55">
              <div className="text-2xl font-black leading-none">{sensorAiReport.healthScore}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">score</div>
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 opacity-90">{sensorAiReport.summary}</p>

          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {sensorAiReport.metrics
              .filter((metric) => ["ph", "ec", "temp"].includes(metric.id))
              .map((metric) => (
                <div key={metric.id} className="rounded-xl bg-white/70 px-2 py-2 shadow-sm dark:bg-slate-950/45">
                  <div className="font-semibold opacity-70">{metric.label}</div>
                  <div className="mt-0.5 truncate font-black">{metric.value}</div>
                </div>
              ))}
          </div>

          <div className="mt-3 space-y-1.5 text-xs leading-5">
            {sensorAiReport.recommendations.slice(0, 2).map((item) => (
              <div key={item} className="flex gap-2">
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${natStatusTone}`} />
                <span>{item}</span>
              </div>
            ))}
          </div>

        </div>

        {assistantMessages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
            <div className={`max-w-[88%] rounded-[1.35rem] px-4 py-3 shadow-sm ${message.sender === "user" ? "bg-emerald-600 text-white" : "border border-emerald-100 bg-white text-slate-900 dark:border-emerald-950 dark:bg-slate-900 dark:text-slate-100"}`}>
              <div className={`mb-1 text-[11px] ${message.sender === "user" ? "text-emerald-100" : "text-slate-500 dark:text-slate-400"}`}>
                {message.sender === "user" ? "คุณ" : "NAT AI"}
              </div>
              {message.sender === "user"
                ? <div className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</div>
                : renderAssistantMessageText(message.text)}

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
        <div className="flex items-end gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={isTH ? "ถาม NAT AI ได้ทุกเรื่องของโปรเจกต์..." : "Ask NAT AI anything about this project..."}
            className="h-12 rounded-2xl"
            disabled={isSending}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitAssistantMessage().catch(() => {});
              }
            }}
          />
          <Button className="h-12 rounded-2xl px-4" onClick={() => submitAssistantMessage().catch(() => {})} disabled={isSending || !draft.trim()}>
            <Send className="mr-2 h-4 w-4" />
            {isSending ? (isTH ? "กำลังคิด" : "Thinking") : isTH ? "ส่ง" : "Send"}
          </Button>
        </div>
      </div>
    </>
  );

  const chatbotView = (
    <>
      <div
        ref={chatbotListRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain touch-pan-y bg-[linear-gradient(to_right,rgba(20,184,166,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(20,184,166,0.08)_1px,transparent_1px)] bg-[size:24px_24px] px-4 py-4"
      >
        <div className="rounded-[1.35rem] border border-teal-100 bg-teal-50/85 px-4 py-4 text-teal-950 shadow-sm dark:border-teal-900/60 dark:bg-teal-950/25 dark:text-teal-50">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] opacity-80">
            <MessageCircleMore className="h-4 w-4" />
            {isTH ? "Chatbot ช่วยเหลือ" : "Support chatbot"}
          </div>
          <p className="mt-2 text-sm leading-6">
            {isTH
              ? "ตอบจาก flow ที่กำหนดไว้สำหรับปัญหาพื้นฐาน ไม่ใช่โมเดล AI วิเคราะห์ข้อมูลลึก ถ้าต้องวิเคราะห์ข้อมูลบัญชีให้ไปที่ NAT AI"
              : "Uses predefined support flows for common issues. It is not the deep AI model. Use NAT AI for account data analysis."}
          </p>
        </div>

        {chatbotMessages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
            <div className={`max-w-[88%] rounded-[1.35rem] px-4 py-3 shadow-sm ${message.sender === "user" ? "bg-teal-600 text-white" : "border border-teal-100 bg-white text-slate-900 dark:border-teal-950 dark:bg-slate-900 dark:text-slate-100"}`}>
              <div className={`mb-1 text-[11px] ${message.sender === "user" ? "text-teal-100" : "text-slate-500 dark:text-slate-400"}`}>
                {message.sender === "user" ? "คุณ" : "Chatbot"}
              </div>
              {renderAssistantMessageText(message.text)}

              {message.canEscalate && (
                <div className="mt-3">
                  <Button size="sm" className="rounded-full" onClick={() => openHumanChat().catch(() => {})}>
                    <MessageCircleMore className="mr-2 h-4 w-4" />
                    {isTH ? "ส่งต่อเจ้าหน้าที่" : "Hand off to staff"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200/80 bg-white/96 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/96">
        <div className="flex items-end gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={isTH ? "ถาม Chatbot เรื่องปัญหาพื้นฐาน..." : "Ask the chatbot about common issues..."}
            className="h-12 rounded-2xl"
            disabled={isSending}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitChatbotMessage().catch(() => {});
              }
            }}
          />
          <Button className="h-12 rounded-2xl px-4" onClick={() => submitChatbotMessage().catch(() => {})} disabled={isSending || !draft.trim()}>
            <Send className="mr-2 h-4 w-4" />
            {isTH ? "ถามบอท" : "Ask bot"}
          </Button>
        </div>
      </div>
    </>
  );

  const agentView = (
    <>
      <div
        ref={agentListRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain touch-pan-y bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_34%),linear-gradient(to_right,rgba(245,158,11,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(245,158,11,0.08)_1px,transparent_1px)] bg-[size:auto,24px_24px,24px_24px] px-4 py-4"
      >
        <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50/90 px-4 py-4 text-amber-950 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-50">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] opacity-80">
            <ShieldCheck className="h-4 w-4" />
            {isTH ? "AI Agent แบบปลอดภัย" : "Safe AI Agent"}
          </div>
          <p className="mt-2 text-sm leading-6">
            {isTH
              ? "Agent ช่วยวางแผนและเตรียม action จากข้อมูลบัญชีนี้ แต่ action ที่กระทบเครื่องจริงต้องยืนยันก่อน และรอบนี้ยังไม่ส่งคำสั่ง hardware อัตโนมัติ"
              : "The agent plans and prepares actions from this account's context. Any real machine-impacting action requires confirmation, and this version does not auto-send hardware commands."}
          </p>
        </div>

        {agentMessages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
            <div className={`max-w-[88%] rounded-[1.35rem] px-4 py-3 shadow-sm ${message.sender === "user" ? "bg-amber-600 text-white" : "border border-amber-100 bg-white text-slate-900 dark:border-amber-950 dark:bg-slate-900 dark:text-slate-100"}`}>
              <div className={`mb-1 text-[11px] ${message.sender === "user" ? "text-amber-100" : "text-slate-500 dark:text-slate-400"}`}>
                {message.sender === "user" ? "คุณ" : "AI Agent"}
              </div>
              {renderAssistantMessageText(message.text)}

              {message.agentProposal && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100">
                  <div className="flex items-center gap-2 font-bold">
                    <ClipboardCheck className="h-4 w-4" />
                    {message.agentProposal.label}
                  </div>
                  <div className="mt-1 leading-5 opacity-85">{message.agentProposal.description}</div>
                  <Button
                    size="sm"
                    className="mt-3 rounded-full"
                    onClick={() => confirmAgentProposal(message.agentProposal!)}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {message.agentProposal.requiresConfirmation
                      ? (isTH ? "ยืนยันแผนนี้" : "Confirm this plan")
                      : (isTH ? "รับทราบ" : "Acknowledge")}
                  </Button>
                </div>
              )}

              {message.canEscalate && (
                <div className="mt-3">
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => openHumanChat().catch(() => {})}>
                    <MessageCircleMore className="mr-2 h-4 w-4" />
                    {isTH ? "ส่งต่อเจ้าหน้าที่" : "Hand off to staff"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200/80 bg-white/96 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/96">
        <div className="flex items-end gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={isTH ? "ให้ Agent วางแผน action..." : "Ask the agent to plan an action..."}
            className="h-12 rounded-2xl"
            disabled={isSending}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitAgentMessage().catch(() => {});
              }
            }}
          />
          <Button className="h-12 rounded-2xl px-4" onClick={() => submitAgentMessage().catch(() => {})} disabled={isSending || !draft.trim()}>
            <Send className="mr-2 h-4 w-4" />
            {isTH ? "ให้ Agent ทำแผน" : "Plan"}
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
                  {headerTitle}
                </div>
                <div className="line-clamp-2 pr-2 text-[12px] leading-5 text-slate-500 sm:text-xs dark:text-slate-400">
                  {headerMeta}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${headerStatusClass}`} />
                  <span className="truncate">{headerStatusText}</span>
                </div>
              </div>
            </div>
            <div className="ml-2 flex shrink-0 flex-wrap justify-end gap-1 sm:flex-nowrap sm:gap-2">
              {mode !== "human" ? (
                <>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => setMode("assistant")}
                    title={isTH ? "ไป NAT AI" : "Open NAT AI"}
                    aria-label={isTH ? "ไป NAT AI" : "Open NAT AI"}
                  >
                    <Bot className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openHumanChat().catch(() => setMode("human"))}
                    title={isTH ? "คุยกับเจ้าหน้าที่" : "Chat with staff"}
                    aria-label={isTH ? "คุยกับเจ้าหน้าที่" : "Chat with staff"}
                  >
                    <MessageCircleMore className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={resetAssistant}
                    title="Reset"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </>
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
                    onClick={() => setMode("assistant")}
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

          <div className="grid grid-cols-2 gap-1 border-b border-emerald-100 bg-white/90 px-3 py-2 text-[11px] font-semibold dark:border-emerald-950 dark:bg-slate-950/90">
            <button
              type="button"
              onClick={() => setMode("assistant")}
              className={`rounded-xl px-2 py-2 transition ${mode !== "human" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-950/30"}`}
            >
              NAT AI
            </button>
            <button
              type="button"
              onClick={() => openHumanChat().catch(() => setMode("human"))}
              className={`rounded-xl px-2 py-2 transition ${mode === "human" ? "bg-slate-800 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"}`}
            >
              {isTH ? "เจ้าหน้าที่" : "Staff"}
            </button>
          </div>

          {mode === "human" ? humanView : assistantView}
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
        </div>
      )}
    </div>
  );
}
