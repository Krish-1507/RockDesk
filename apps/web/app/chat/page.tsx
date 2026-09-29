"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PaperPlaneRight, Plus, UserCircle } from "@phosphor-icons/react";
import AppShell from "@/components/app-shell";
import TicketCard from "@/components/ticket-card";
import { FieldLabel, MetaPill } from "@/components/pills";
import {
  createChatSession,
  loadChatHistory,
  sendChatMessage,
  type ChatMessageResponse,
  type CreatedTicketView,
  type DraftView,
} from "@/lib/api-client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ticket?: CreatedTicketView | null;
  options?: Array<{ id: string; name: string; department: string | null }>;
}

interface SavedSession {
  id: string;
  token: string;
  title: string;
  updatedAt: number;
}

const SESSIONS_KEY = "rockdesk.sessions";
const ACTIVE_KEY = "rockdesk.activeSession";

function loadSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSessions(sessions: SavedSession[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 20)));
}

function firstLine(text: string, max = 42): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max)}…` : line;
}

function stateLabel(draft: DraftView | null, sending: boolean): { text: string; live: boolean } {
  if (sending) return { text: "Reading your message", live: true };
  if (!draft) return { text: "Idle — describe an issue", live: false };
  const missing = draft.missingFields.length;
  if (missing === 0) return { text: "Draft ready", live: true };
  return { text: `Draft — waiting on ${draft.missingFields.join(", ").replace(/_/g, " ")}`, live: true };
}

export default function ChatPage(): React.JSX.Element {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState<DraftView | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "Asia/Kolkata";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  const activateSession = useCallback(async (id: string, token: string, title: string) => {
    setSessionId(id);
    setSessionToken(token);
    setMessages([]);
    setDraft(null);
    setError(null);
    localStorage.setItem(ACTIVE_KEY, id);
    try {
      const history = await loadChatHistory(id, token);
      setMessages(history.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })));
      if (history.session.pendingTicket) setDraft(history.session.pendingTicket as DraftView);
    } catch {
      // A fresh session has no history; failures here are non-fatal.
    }
    setSessions((prev) => {
      const next = [{ id, token, title, updatedAt: Date.now() }, ...prev.filter((s) => s.id !== id)].slice(0, 20);
      persistSessions(next);
      return next;
    });
  }, []);

  const startNewSession = useCallback(async () => {
    setError(null);
    try {
      const created = await createChatSession();
      await activateSession(created.sessionId, created.sessionToken, "New conversation");
      textareaRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a chat session. Check the API connection and try again.");
    }
  }, [activateSession]);

  useEffect(() => {
    (async () => {
      const saved = loadSessions();
      setSessions(saved);
      const activeId = localStorage.getItem(ACTIVE_KEY);
      const active = saved.find((s) => s.id === activeId) ?? saved[0];
      if (active) {
        await activateSession(active.id, active.token, active.title);
      } else {
        await startNewSession();
      }
      setBooting(false);
    })();
  }, [activateSession, startNewSession]);

  async function send(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || sending || !sessionId || !sessionToken) return;
    setSending(true);
    setError(null);
    const userMsg: Message = { id: `local-${Date.now()}`, role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    try {
      const res: ChatMessageResponse = await sendChatMessage({
        sessionId,
        sessionToken,
        message: trimmed,
        timezone,
        clientMessageId: crypto.randomUUID(),
      });
      const assistant: Message = {
        id: res.assistantMessage.id,
        role: "assistant",
        content: res.assistantMessage.content,
        ticket: res.ticket,
        options: res.draft?.disambiguationOptions?.length ? res.draft.disambiguationOptions : undefined,
      };
      setMessages((prev) => [...prev, assistant]);
      setDraft(res.draft);
      setSessions((prev) => {
        const next = prev.map((s) =>
          s.id === sessionId && s.title === "New conversation"
            ? { ...s, title: firstLine(trimmed), updatedAt: Date.now() }
            : s,
        );
        persistSessions(next);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that message.");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function onComposerKey(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  const status = stateLabel(draft, sending);
  const showRail = draft !== null;

  return (
    <AppShell>
      <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row">
        {/* Session list */}
        <div className="hidden w-60 shrink-0 flex-col border-r border-[#D8D3C9] bg-[#FBFAF7] lg:flex">
          <div className="flex items-center justify-between px-4 pb-2 pt-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#77736A]">
              Conversations
            </span>
            <button
              onClick={startNewSession}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-[#C94A37] transition-colors duration-150 hover:bg-[#FBE1DB]"
              aria-label="Start a new conversation"
            >
              <Plus size={14} weight="bold" /> New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => void activateSession(s.id, s.token, s.title)}
                className={`mb-1 block w-full rounded-[10px] px-3 py-2 text-left transition-colors duration-150 ${
                  s.id === sessionId ? "bg-[#151512] text-[#FBFAF7]" : "text-[#4E4C46] hover:bg-[#EFECE5]"
                }`}
              >
                <span className="block truncate text-[13px] font-medium">{s.title}</span>
                <span className={`font-mono text-[10px] ${s.id === sessionId ? "text-[#BDB7AC]" : "text-[#77736A]"}`}>
                  {new Date(s.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </button>
            ))}
            {sessions.length === 0 && !booting && (
              <p className="px-3 py-2 text-[13px] text-[#77736A]">No conversations yet.</p>
            )}
          </div>
        </div>

        {/* Conversation */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#F5F3EE]">
          <div className="flex items-center gap-2 border-b border-[#D8D3C9] bg-[#FBFAF7] px-4 py-2.5 lg:hidden">
            <select
              aria-label="Switch conversation"
              value={sessionId ?? ""}
              onChange={(e) => {
                const s = sessions.find((x) => x.id === e.target.value);
                if (s) void activateSession(s.id, s.token, s.title);
              }}
              className="min-w-0 flex-1 rounded-[10px] border border-[#BDB7AC] bg-white px-2.5 py-1.5 text-[13px] font-medium"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
            <button
              onClick={startNewSession}
              aria-label="Start a new conversation"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F0644E] text-white"
            >
              <Plus size={16} weight="bold" />
            </button>
          </div>

          <div className="flex items-center gap-2.5 border-b border-[#D8D3C9] px-6 py-3.5 md:px-10" aria-live="polite">
            <span className="relative flex h-2 w-2">
              {status.live && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F0644E] opacity-60" />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${status.live ? "bg-[#F0644E]" : "bg-[#BDB7AC]"}`} />
            </span>
            <p className="text-[12px] font-medium text-[#77736A]">{status.text}</p>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 md:px-10">
            <div className="mx-auto flex max-w-2xl flex-col gap-3">
              {booting && (
                <div className="flex gap-2 py-6" aria-label="Loading">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-[#77736A]" />
                  ))}
                </div>
              )}
              {!booting && messages.length === 0 && (
                <div>
                  <h1 className="text-[24px] font-semibold leading-[30px] tracking-[-0.01em]">
                    What needs doing?
                  </h1>
                  <p className="mt-1.5 max-w-xl text-[13px] leading-[20px] text-[#77736A]">
                    Describe the issue in your own words and language. I&apos;ll draft the ticket and ask only
                    for what&apos;s missing.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {[
                      "Checkout page is throwing 500 errors for some users. Priya will fix it by Friday, high priority.",
                      "Login page crashes on Safari, this will be resolved by the 4th.",
                      "Search results are wrong, Rahul to fix by tomorrow.",
                    ].map((example, i) => (
                      <motion.button
                        key={example}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        onClick={() => void send(example)}
                        className="rounded-[10px] border border-[#D8D3C9] bg-[#FBFAF7] px-3.5 py-2.5 text-left text-[13px] leading-[20px] text-[#4E4C46] transition-colors duration-150 hover:border-[#F0644E] hover:text-[#151512]"
                      >
                        {example}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((m) =>
                  m.role === "user" ? (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[85%] rounded-[14px] rounded-br-[6px] bg-[#151512] px-4 py-2.5 text-[14px] leading-[21px] text-[#FBFAF7]">
                        {m.content}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="flex flex-col gap-2.5"
                    >
                      <div className="max-w-[92%] rounded-[14px] rounded-bl-[6px] border border-[#D8D3C9] bg-[#FBFAF7] px-4 py-2.5 text-[14px] leading-[21px]">
                        {m.content}
                      </div>
                      {m.options && m.options.length > 0 && (
                        <div className="grid max-w-[92%] gap-2 sm:grid-cols-2">
                          {m.options.map((o) => (
                            <button
                              key={o.id}
                              onClick={() => void send(o.name)}
                              disabled={sending}
                              className="flex items-center gap-2.5 rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7] p-3 text-left transition-all duration-150 hover:-translate-y-px hover:border-[#F0644E] hover:bg-[#FDF1EE] disabled:opacity-60"
                            >
                              <UserCircle size={26} className="shrink-0 text-[#77736A]" />
                              <span>
                                <span className="block text-[14px] font-semibold leading-5">{o.name}</span>
                                {o.department && (
                                  <span className="block text-[12px] text-[#77736A]">{o.department}</span>
                                )}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {m.ticket && <TicketCard ticket={m.ticket} linkToAdmin />}
                    </motion.div>
                  ),
                )}
              </AnimatePresence>
              {sending && (
                <div className="flex gap-2 px-1 py-2" aria-label="Assistant is typing">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-[#77736A]" />
                  ))}
                </div>
              )}
              {error && (
                <div className="rounded-[10px] border border-[#E5B3AC] bg-[#FDF1EE] px-4 py-2.5 text-[13px] text-[#B83C34]">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-[#D8D3C9] bg-[#FBFAF7] px-6 py-4 md:px-10">
            <div className="mx-auto max-w-2xl">
              <div className="flex items-end gap-2 rounded-[14px] border border-[#BDB7AC] bg-white px-3.5 py-2.5 transition-all duration-150 focus-within:border-[#F0644E] focus-within:shadow-[0_0_0_3px_#FBE1DB]">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onComposerKey}
                  rows={1}
                  placeholder="Describe an issue or task…"
                  aria-label="Chat message"
                  className="max-h-32 flex-1 resize-none overflow-y-auto bg-transparent text-[14px] leading-[22px] placeholder:text-[#77736A] focus:outline-none"
                />
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => void send(input)}
                  disabled={sending || !input.trim()}
                  aria-label="Send message"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F0644E] text-white transition-colors duration-150 hover:bg-[#C94A37] disabled:cursor-not-allowed disabled:bg-[#D8D3C9]"
                >
                  <PaperPlaneRight size={17} weight="fill" />
                </motion.button>
              </div>
              <p className="mt-2 text-[11px] text-[#77736A]">
                Enter sends · Shift+Enter adds a line · Type “forget it” to discard a pending draft
              </p>
            </div>
          </div>
        </div>

        {/* Ticket context rail */}
        <AnimatePresence initial={false}>
          {showRail && draft && (
            <motion.aside
              key="draft-rail"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full shrink-0 flex-col border-t border-[#D8D3C9] bg-[#FBFAF7] lg:w-80 lg:border-l lg:border-t-0"
            >
              <div className="px-5 pb-2 pt-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#77736A]">
                  Draft ticket
                </span>
                <h2 className="mt-1 text-[16px] font-semibold leading-[22px]">
                  {draft.title ?? "Understanding your request…"}
                </h2>
              </div>
              <div className="px-5 py-3 lg:flex-1 lg:overflow-y-auto">
                <dl className="flex flex-col gap-3.5">
                  <div>
                    <FieldLabel>Missing</FieldLabel>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {draft.missingFields.length === 0 ? (
                        <MetaPill label="Ready to create" />
                      ) : (
                        draft.missingFields.map((f) => <MetaPill key={f} label={f.replace("_", " ")} />)
                      )}
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Assignee</FieldLabel>
                    <p className="mt-0.5 text-[14px] font-medium">
                      {draft.assigneeName ?? draft.assigneeId ?? (draft.missingFields.includes("assignee") ? "Not set yet" : "Unassigned")}
                    </p>
                  </div>
                  <div>
                    <FieldLabel>Due date</FieldLabel>
                    <p className="mt-0.5 font-mono text-[13px]">{draft.dueDate ?? "Not set yet"}</p>
                  </div>
                  <div>
                    <FieldLabel>Priority</FieldLabel>
                    <p className="mt-0.5 text-[14px]">{draft.priority}</p>
                  </div>
                  {draft.description && (
                    <div>
                      <FieldLabel>Summary</FieldLabel>
                      <p className="mt-0.5 text-[13px] leading-[20px] text-[#4E4C46]">{draft.description}</p>
                    </div>
                  )}
                </dl>
              </div>
              <p className="hidden border-t border-[#D8D3C9] px-5 py-4 text-[12px] leading-[18px] text-[#77736A] lg:block">
                This draft lives in the database, not in memory — it survives refreshes and deploys.
              </p>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
