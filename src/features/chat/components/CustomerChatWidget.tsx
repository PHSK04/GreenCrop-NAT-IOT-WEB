import { useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  Bot,
  Download,
  FileText,
  MessageCircleMore,
  Pencil,
  Reply,
  RotateCcw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import supportIcon from "@/assets/images/icon_support.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { chatService, ChatMessage, ChatThread } from "@/features/chat/services/chatService";

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
    writeLine(`[${formatTime(message.created_at)}] ${message.sender_name} (${message.sender_role})`, true);
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
      `[${formatTime(message.created_at)}] ${message.sender_name} (${message.sender_role})`,
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
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const draftKey = useMemo(() => `chat_draft_${thread?.id || "pending"}`, [thread?.id]);
  const humanListRef = listRef;

  const loadChat = async (silently = false) => {
    if (!silently) setIsLoading(true);
    try {
      const data = await chatService.getMyThread();
      setThread(data.thread);
      setMessages(data.messages);
      setError("");
      await chatService.markRead(data.thread.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chat");
    } finally {
      if (!silently) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || mode !== "human") return;
    loadChat().catch(() => {});
    const timer = window.setInterval(() => {
      loadChat(true).catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [isOpen, mode]);

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
    humanListRef.current?.scrollTo({
      top: humanListRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isOpen, mode, humanListRef]);

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

  const ownLastMessageRead =
    thread?.admin_last_read_at &&
    messages.length > 0 &&
    new Date(thread.admin_last_read_at).getTime() >= new Date(messages[messages.length - 1].created_at).getTime();

  const assistantView = (
    <>
      <div className="flex-1 space-y-4 overflow-auto bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px] px-4 py-4">
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
      <div ref={listRef} className="flex-1 space-y-4 overflow-auto bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px] px-4 py-4">
        {isLoading && <div className="text-sm text-slate-500">{isTH ? "กำลังโหลด..." : "Loading..."}</div>}
        {!isLoading && messages.length === 0 && (
          <div className="rounded-3xl bg-white/90 p-6 text-center text-sm text-slate-500 shadow-sm dark:bg-slate-900/80">
            {isTH ? "เริ่มพิมพ์เพื่อเปิดบทสนทนากับเจ้าหน้าที่ได้เลย" : "Send your first message to start the conversation."}
          </div>
        )}

        {messages.map((message) => {
          const isOwn = message.sender_role === "user";
          return (
            <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
              <div className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 shadow-sm ${isOwn ? "bg-emerald-600 text-white" : "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"}`}>
                <div className={`mb-1 text-[11px] ${isOwn ? "text-emerald-100" : "text-slate-500 dark:text-slate-400"}`}>
                  {message.sender_name} · {formatTime(message.created_at)} {message.edited_at ? `· ${isTH ? "แก้ไขแล้ว" : "edited"}` : ""}
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

        <div className="flex items-end gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={isTH ? "พิมพ์ข้อความถึงเจ้าหน้าที่..." : "Type a message to support..."}
            className="h-12 rounded-2xl"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitMessage().catch(() => {});
              }
            }}
          />
          <Button className="h-12 rounded-2xl px-4" onClick={() => submitMessage().catch(() => {})} disabled={isSending || !draft.trim()}>
            <Send className="mr-2 h-4 w-4" />
            {editingMessageId ? (isTH ? "อัปเดต" : "Update") : isTH ? "ส่ง" : "Send"}
          </Button>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>{isTH ? "draft จะถูกเก็บไว้ให้อัตโนมัติ" : "Draft is saved automatically"}</span>
          <Badge variant="outline">{ownLastMessageRead ? (isTH ? "อ่านแล้ว" : "Read") : isTH ? "ส่งแล้ว" : "Sent"}</Badge>
        </div>
      </div>
    </>
  );

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
      {isOpen && (
        <div className="pointer-events-auto flex h-[min(78vh,720px)] w-[min(440px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/96 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/96">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <img src={supportIcon} alt="Support" className="h-11 w-11 rounded-full object-cover" draggable={false} />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {mode === "assistant" ? (isTH ? "AI ช่วยตอบปัญหาเบื้องต้น" : "AI support assistant") : isTH ? "แชทคุยกับเจ้าหน้าที่" : "Chat with support"}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {mode === "assistant"
                    ? isTH ? "เลือกปัญหาที่พบ แล้วให้ AI ช่วยตอบก่อน" : "Pick an issue and let AI guide you first"
                    : ownLastMessageRead ? (isTH ? "อ่านข้อความล่าสุดแล้ว" : "Latest message read") : isTH ? "ตอบกลับแบบเรียลไทม์" : "Realtime replies"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mode === "assistant" ? (
                <Button size="icon" variant="ghost" onClick={resetAssistant} title="Reset">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button size="icon" variant="ghost" onClick={() => exportTranscriptTxt(thread, messages)} title="TXT">
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => exportTranscriptPdf(thread, messages)} title="PDF">
                    <Download className="h-4 w-4" />
                  </Button>
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
        className="pointer-events-auto transition hover:-translate-y-0.5"
        aria-label={isTH ? "เปิดแชทช่วยเหลือ" : "Open support chat"}
      >
        <img
          src={supportIcon}
          alt="Support"
          className="h-20 w-20 rounded-full object-cover shadow-[0_18px_40px_rgba(15,23,42,0.2)] sm:h-24 sm:w-24"
          draggable={false}
        />
      </button>
    </div>
  );
}
