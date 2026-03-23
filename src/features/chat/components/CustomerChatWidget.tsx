import { useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  Download,
  FileText,
  MessageCircleMore,
  Pencil,
  Reply,
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

const POLL_MS = 4000;

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
    if (!isOpen) return;
    loadChat().catch(() => {});
    const timer = window.setInterval(() => {
      loadChat(true).catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [isOpen]);

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
    if (!isOpen) return;
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isOpen]);

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

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
      {isOpen && (
        <div className="pointer-events-auto flex h-[min(78vh,720px)] w-[min(440px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/96 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/96">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <img src={supportIcon} alt="Support" className="h-11 w-11 rounded-full object-cover" draggable={false} />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{isTH ? "แชทคุยกับเจ้าหน้าที่" : "Chat with support"}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {ownLastMessageRead ? (isTH ? "อ่านข้อความล่าสุดแล้ว" : "Latest message read") : isTH ? "ตอบกลับแบบเรียลไทม์" : "Realtime replies"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={() => exportTranscriptTxt(thread, messages)} title="TXT">
                <FileText className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => exportTranscriptPdf(thread, messages)} title="PDF">
                <Download className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

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
