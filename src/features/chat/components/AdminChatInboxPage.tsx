import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, MessageSquare, Pin, Search, Send, ShieldAlert, UserCheck } from "lucide-react";
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

const quickReplies = [
  "สวัสดีครับ ทีมงานกำลังตรวจสอบให้และจะอัปเดตโดยเร็วที่สุด",
  "ได้รับข้อมูลแล้วครับ รบกวนแจ้งเวลาเกิดปัญหาและชื่ออุปกรณ์เพิ่มเติม",
  "ทีมงานตรวจพบปัญหาแล้ว ตอนนี้กำลังดำเนินการแก้ไขให้ครับ",
];

const formatTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : "");

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
    writeLine(`[${formatTime(message.created_at)}] ${message.sender_name} (${message.sender_role})`, true);
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
      `[${formatTime(message.created_at)}] ${message.sender_name} (${message.sender_role})`,
      String(message.body || ""),
      "",
    ]),
  ].join("\n");
  downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `admin-chat-${thread?.id || "thread"}.txt`);
}

export function AdminChatInboxPage({ language = "TH" }: AdminChatInboxPageProps) {
  const isTH = language === "TH";
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [admins, setAdmins] = useState<AdminDbUserRow[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "mine" | "archive">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [selectedThreadId, threads],
  );

  const loadThreads = async (silently = false) => {
    if (!silently) setIsLoading(true);
    try {
      const nextThreads = await chatService.listThreads({
        q: query || undefined,
        mine: filter === "mine",
        unread: filter === "unread",
        archived: filter === "archive",
      });
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
      const data = await chatService.getThreadMessages(threadId);
      setMessages(data.messages);
      await chatService.markRead(threadId);
      if (!silently) {
        setThreads((current) =>
          current.map((thread) => (thread.id === threadId ? { ...thread, admin_unread_count: 0 } : thread)),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
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
    const timer = window.setInterval(() => {
      loadThreads(true).catch(() => {});
      if (selectedThreadId) loadMessages(selectedThreadId, true).catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [selectedThreadId, query, filter]);

  useEffect(() => {
    if (!selectedThreadId) return;
    loadMessages(selectedThreadId).catch(() => {});
  }, [selectedThreadId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!selectedThread || !draft.trim()) return;
    const created = await chatService.sendMessage(selectedThread.id, draft.trim());
    setMessages((current) => [...current, created]);
    setDraft("");
    loadThreads(true).catch(() => {});
  };

  const updateMeta = async (payload: Partial<Pick<ChatThread, "status" | "priority" | "is_archived" | "is_pinned" | "assigned_admin_id">>) => {
    if (!selectedThread) return;
    const updated = await chatService.updateThreadMeta(selectedThread.id, payload);
    setThreads((current) => current.map((thread) => (thread.id === updated.id ? updated : thread)));
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-end justify-between gap-4">
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

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="border-border bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              {isTH ? "Inbox" : "Inbox"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-10" placeholder={isTH ? "ค้นหาจากชื่อ อีเมล หรือข้อความ" : "Search by customer, email, or message"} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "all", label: isTH ? "ทั้งหมด" : "All" },
                { id: "unread", label: isTH ? "ยังไม่อ่าน" : "Unread" },
                { id: "mine", label: isTH ? "ของฉัน" : "Mine" },
                { id: "archive", label: isTH ? "Archive" : "Archive" },
              ].map((item) => (
                <Button key={item.id} variant={filter === item.id ? "default" : "outline"} onClick={() => setFilter(item.id as typeof filter)}>
                  {item.label}
                </Button>
              ))}
            </div>

            <div className="max-h-[65vh] space-y-3 overflow-auto pr-1">
              {isLoading && <div className="text-sm text-muted-foreground">{isTH ? "กำลังโหลด..." : "Loading..."}</div>}
              {!isLoading && threads.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {isTH ? "ยังไม่มีแชทในหมวดนี้" : "No chat threads in this filter"}
                </div>
              )}
              {threads.map((thread) => (
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
                  <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{thread.last_message_preview || (isTH ? "ยังไม่มีข้อความ" : "No messages yet")}</div>
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

        <Card className="border-border bg-card/80">
          <CardHeader className="border-b border-border">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>{selectedThread?.customer_name || (isTH ? "เลือกห้องแชท" : "Select a thread")}</CardTitle>
                <div className="mt-1 text-sm text-muted-foreground">{selectedThread?.customer_email || (isTH ? "ดูประวัติและตอบกลับจากฝั่งแอดมิน" : "Review conversation history and reply from admin")}</div>
              </div>
              {selectedThread && (
                <div className="flex flex-wrap items-center gap-2">
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
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {!selectedThread ? (
              <div className="flex min-h-[560px] items-center justify-center text-sm text-muted-foreground">
                {isTH ? "เลือกห้องแชทจาก inbox ด้านซ้าย" : "Select a conversation from the inbox"}
              </div>
            ) : (
              <div className="flex min-h-[560px] flex-col">
                <div className="grid gap-3 border-b border-border p-4 md:grid-cols-3">
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
                  </div>
                </div>

                <div ref={listRef} className="flex-1 space-y-4 overflow-auto bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px] p-4">
                  {messages.map((message) => {
                    const isAdminMessage = message.sender_role === "admin";
                    return (
                      <div key={message.id} className={`flex ${isAdminMessage ? "justify-end" : "justify-start"} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
                        <div className={`max-w-[80%] rounded-[1.5rem] px-4 py-3 shadow-sm ${isAdminMessage ? "bg-slate-900 text-white dark:bg-emerald-600" : "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"}`}>
                          <div className={`mb-1 text-[11px] ${isAdminMessage ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>
                            {message.sender_name} · {formatTime(message.created_at)}
                          </div>
                          <div className="whitespace-pre-wrap text-sm leading-6">{message.body}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3 border-t border-border p-4">
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

                  <div className="flex items-end gap-2">
                    <Input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
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
