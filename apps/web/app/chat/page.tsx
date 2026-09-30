"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  ChatTeardropText,
  PaperPlaneRight,
  Plus,
  Sparkle,
  UserCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import AppShell from "@/components/app-shell";
import TicketCard from "@/components/ticket-card";
import { FieldLabel, MetaPill } from "@/components/pills";
import {
  createChatSession,
  ApiError,
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

const LANG_CHIPS = ["English", "हिन्दी", "Hinglish", "Español", "العربية", "中文"];

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

function draftProgress(draft: DraftView | null): number {
  if (!draft) return 0;
  const parts = [
    draft.title ? 1 : 0,
    draft.assigneeName ?? draft.assigneeId ? 1 : 0,
    draft.dueDate ? 1 : 0,
    draft.priority ? 1 : 0,
  ];
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
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
  const busyRef = useRef(false);
  const activationRef = useRef(0);
  const pendingSend = useRef<{ sessionId: string; text: string; id: string } | null>(null);

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
    if (busyRef.current) return;
    const activation = ++activationRef.current;
    setBooting(true);
    setSessionId(id);
    setSessionToken(token);
    setMessages([]);
    setDraft(null);
    setError(null);
    localStorage.setItem(ACTIVE_KEY, id);
    try {
      const history = await loadChatHistory(id, token);
      if (activation !== activationRef.current) return;
      setMessages(history.messages.map((m) => ({ id: m.id, role: m.role, content: m.content, ticket: m.ticket })));
      if (history.session.pendingTicket) setDraft(history.session.pendingTicket as DraftView);
    } catch (err) {
      if (activation !== activationRef.current) return;
      setError(err instanceof Error ? err.message : "Could not load this conversation. Please select it again to retry.");
      setSessionToken(null);
    } finally {
      if (activation === activationRef.current) setBooting(false);
    }
    setSessions((prev) => {
      const next = [{ id, token, title, updatedAt: Date.now() }, ...prev.filter((s) => s.id !== id)].slice(0, 20);
      persistSessions(next);
      return next;
    });
  }, []);

  const startNewSession = useCallback(async () => {
    if (busyRef.current) return;
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
    if (!trimmed || busyRef.current || booting || !sessionId || !sessionToken) return;
    busyRef.current = true;
    setSending(true);
    setError(null);
    const retry = pendingSend.current?.sessionId === sessionId && pendingSend.current.text === trimmed;
    const clientMessageId = retry && pendingSend.current ? pendingSend.current.id : crypto.randomUUID();
    pendingSend.current = { sessionId, text: trimmed, id: clientMessageId };
    const userMsg: Message = { id: clientMessageId, role: "user", content: trimmed };
    setMessages((prev) => prev.some((m) => m.id === clientMessageId) ? prev : [...prev, userMsg]);
    setInput("");
    try {
      const res: ChatMessageResponse = await sendChatMessage({
        sessionId,
        sessionToken,
        message: trimmed,
        timezone,
        clientMessageId,
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
      pendingSend.current = null;
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
      setInput(trimmed);
      // A definite model failure created no ticket; a network failure is retried
      // with the same ID because the server may already have completed it.
      if (err instanceof ApiError && ["AI_TIMEOUT", "AI_INVALID_OUTPUT", "AI_UNAVAILABLE", "VALIDATION_ERROR"].includes(err.code)) pendingSend.current = null;
    } finally {
      busyRef.current = false;
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
  const progress = draftProgress(draft);

  return (
    <AppShell>
      <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row">
        {/* Session list */}
        <div className="hidden w-64 shrink-0 flex-col border-r border-[#D8D3C9] bg-[#FBFAF7] lg:flex">
          <div className="flex items-center justify-between px-4 pb-2 pt-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#77736A]">
              Conversations
            </span>
            <button
              onClick={startNewSession}
              className="btn-press flex items-center gap-1 rounded-lg bg-[#151512] px-2.5 py-1.5 text-[12px] font-semibold text-white hover:opacity-85"
              aria-label="Start a new conversation"
            >
              <Plus size={14} weight="bold" /> New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {sessions.map((s) => {
              const active = s.id === sessionId;
              return (
                <button
                  key={s.id}
                  onClick={() => void activateSession(s.id, s.token, s.title)}
                  className={`relative mb-1 flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left transition-all duration-150 ${
                    active
                      ? "bg-[#151512] text-[#FBFAF7] shadow-[0_6px_16px_-6px_rgba(21,21,18,0.5)]"
                      : "text-[#4E4C46] hover:bg-[#EFECE5] hover:text-[#151512]"
                  }`}
                >
                  <ChatTeardropText
                    size={16}
                    weight={active ? "fill" : "regular"}
                    className={`shrink-0 ${active ? "text-[#F0644E]" : "text-[#BDB7AC]"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{s.title}</span>
                    <span className={`font-mono text-[10px] ${active ? "text-[#BDB7AC]" : "text-[#77736A]"}`}>
                      {new Date(s.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </span>
                  {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F0644E]" aria-hidden="true" />}
                </button>
              );
            })}
            {sessions.length === 0 && !booting && (
              <div className="rounded-[10px] border border-dashed border-[#BDB7AC] px-3 py-4 text-center">
                <p className="text-[13px] font-medium text-[#4E4C46]">No conversations yet</p>
                <p className="mt-0.5 text-[12px] text-[#77736A]">Start one to file your first ticket.</p>
              </div>
            )}
          </div>
          <p className="border-t border-[#D8D3C9] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-[#77736A]">
            Drafts persist · serverless-safe
          </p>
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
              className="btn-press flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F0644E] text-white shadow-[0_4px_14px_-4px_rgba(240,100,78,0.6)] hover:bg-[#C94A37]"
            >
              <Plus size={16} weight="bold" />
            </button>
          </div>

          <div
            className="relative flex items-center gap-2.5 border-b border-[#D8D3C9] bg-[#FBFAF7]/90 px-6 py-3 backdrop-blur md:px-10"
            aria-live="polite"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              {status.live && (
                <span className="animate-pulse-ring absolute h-full w-full rounded-full bg-[#F0644E]" />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${status.live ? "bg-[#F0644E]" : "bg-[#BDB7AC]"}`} />
            </span>
            <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#77736A]">{status.text}</p>
            {showRail && (
              <span className="hidden items-center gap-2 sm:flex" aria-hidden="true">
                <span className="h-1 w-24 overflow-hidden rounded-full bg-[#EFECE5]">
                  <motion.span
                    className="block h-full rounded-full bg-[#F0644E]"
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
                <span className="font-mono text-[11px] text-[#77736A]">{progress}%</span>
              </span>
            )}
          </div>

          <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-6 py-6 md:px-10">
            <div
              aria-hidden="true"
              className="dot-grid pointer-events-none absolute inset-x-0 top-0 h-56 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]"
            />
            <div className="relative mx-auto flex max-w-2xl flex-col gap-3">
              {booting && (
                <div className="flex gap-2 py-6" aria-label="Loading">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-[#77736A]" />
                  ))}
                </div>
              )}
              {!booting && messages.length === 0 && (
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p className="inline-flex items-center gap-1.5 rounded-full border border-[#E7B9AE] bg-[#FDF1EE] px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#C94A37]">
                      <Sparkle size={12} weight="fill" /> 6 languages · 0 forms
                    </p>
                    <h1 className="mt-3 text-[28px] font-semibold leading-[34px] tracking-[-0.02em]">
                      What needs doing?
                    </h1>
                    <p className="mt-1.5 max-w-xl text-[13px] leading-[20px] text-[#77736A]">
                      Describe the issue in your own words and language. I&apos;ll draft the ticket and ask only
                      for what&apos;s missing.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {LANG_CHIPS.map((l) => (
                        <span
                          key={l}
                          className="rounded-full border border-[#D8D3C9] bg-[#FBFAF7] px-2.5 py-0.5 text-[11.5px] font-medium text-[#4E4C46]"
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                  <div className="mt-5 flex flex-col gap-2">
                    {[
                      "Checkout page is throwing 500 errors for some users. Priya will fix it by Friday, high priority.",
                      "Login page crashes on Safari, this will be resolved by the 4th.",
                      "Search results are wrong, Rahul to fix by tomorrow.",
                    ].map((example, i) => (
                      <motion.button
                        key={example}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 + i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        onClick={() => void send(example)}
                        className="group flex items-start gap-3 rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7] px-4 py-3 text-left text-[13px] leading-[20px] text-[#4E4C46] shadow-[0_1px_2px_rgba(21,21,18,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F0644E] hover:text-[#151512] hover:shadow-[0_2px_6px_rgba(21,21,18,0.07),0_12px_32px_-12px_rgba(201,74,55,0.25)]"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#EFECE5] font-mono text-[11px] font-bold transition-colors group-hover:bg-[#F0644E] group-hover:text-white">
                          {i + 1}
                        </span>
                        <span className="flex-1">{example}</span>
                        <ArrowUpRight
                          size={15}
                          className="mt-1 shrink-0 text-[#BDB7AC] transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#F0644E]"
                        />
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
                      <div className="max-w-[85%] rounded-[14px] rounded-br-[6px] bg-[#151512] px-4 py-2.5 text-[14px] leading-[21px] text-[#FBFAF7] shadow-[0_8px_20px_-10px_rgba(21,21,18,0.5)]">
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
                      <div className="max-w-[92%] rounded-[14px] rounded-bl-[6px] border border-[#D8D3C9] bg-[#FBFAF7] px-4 py-2.5 text-[14px] leading-[21px] shadow-[0_1px_2px_rgba(21,21,18,0.05)]">
                        {m.content}
                      </div>
                      {m.options && m.options.length > 0 && (
                        <div className="grid max-w-[92%] gap-2 sm:grid-cols-2">
                          {m.options.map((o) => (
                            <button
                              key={o.id}
                              onClick={() => void send(o.name)}
                              disabled={sending}
                              className="btn-press flex items-center gap-2.5 rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7] p-3 text-left shadow-[0_1px_2px_rgba(21,21,18,0.05)] transition-all duration-150 hover:-translate-y-px hover:border-[#F0644E] hover:bg-[#FDF1EE] hover:shadow-[0_8px_20px_-10px_rgba(201,74,55,0.4)] disabled:opacity-60"
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
                <div className="flex items-center gap-2.5 px-1 py-2" aria-label="Assistant is typing">
                  <span className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-[#77736A]" />
                    ))}
                  </span>
                  <span className="font-mono text-[11px] text-[#77736A]">DRAFTING TICKET…</span>
                </div>
              )}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 rounded-[10px] border border-[#E5B3AC] bg-[#FDF1EE] px-4 py-2.5 text-[13px] text-[#B83C34]"
                >
                  <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-[#D8D3C9] bg-[#FBFAF7]/95 px-6 py-4 backdrop-blur md:px-10">
            <div className="mx-auto max-w-2xl">
              <div className="flex items-end gap-2 rounded-[14px] border border-[#BDB7AC] bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(21,21,18,0.06)] transition-all duration-200 focus-within:-translate-y-px focus-within:border-[#F0644E] focus-within:shadow-[0_0_0_3px_#FBE1DB,0_8px_24px_-12px_rgba(240,100,78,0.5)]">
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
                  whileTap={{ scale: 0.9 }}
                  whileHover={input.trim() ? { scale: 1.04 } : undefined}
                  onClick={() => void send(input)}
                  disabled={sending || booting || !sessionToken || !input.trim()}
                  aria-label="Send message"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F0644E] text-white shadow-[0_4px_14px_-4px_rgba(240,100,78,0.7)] transition-colors duration-150 hover:bg-[#C94A37] disabled:cursor-not-allowed disabled:bg-[#D8D3C9] disabled:shadow-none"
                >
                  <PaperPlaneRight size={17} weight="fill" />
                </motion.button>
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 text-[11px] text-[#77736A]">
                <span>
                  <kbd className="rounded border border-[#D8D3C9] bg-white px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> sends
                </span>
                <span>
                  <kbd className="rounded border border-[#D8D3C9] bg-white px-1.5 py-0.5 font-mono text-[10px]">Shift+Enter</kbd> new line
                </span>
                <span>Type “forget it” to discard a draft</span>
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
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#77736A]">
                    Draft ticket
                  </span>
                  <span className="rounded-full bg-[#EFECE5] px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[#4E4C46]">
                    {progress}%
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#EFECE5]">
                  <motion.div
                    className="h-full rounded-full bg-[#F0644E]"
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <h2 className="mt-2.5 text-[16px] font-semibold leading-[22px] tracking-tight">
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
                  <div className="rounded-[10px] border border-[#D8D3C9] bg-white/60 px-3 py-2.5">
                    <FieldLabel>Assignee</FieldLabel>
                    <p className="mt-0.5 text-[14px] font-medium">
                      {draft.assigneeName ?? draft.assigneeId ?? (draft.missingFields.includes("assignee") ? "Not set yet" : "Unassigned")}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-[10px] border border-[#D8D3C9] bg-white/60 px-3 py-2.5">
                      <FieldLabel>Due date</FieldLabel>
                      <p className="mt-0.5 font-mono text-[13px]">{draft.dueDate ?? "—"}</p>
                    </div>
                    <div className="rounded-[10px] border border-[#D8D3C9] bg-white/60 px-3 py-2.5">
                      <FieldLabel>Priority</FieldLabel>
                      <p className="mt-0.5 text-[14px] font-medium">{draft.priority}</p>
                    </div>
                  </div>
                  {draft.description && (
                    <div>
                      <FieldLabel>Summary</FieldLabel>
                      <p className="mt-0.5 text-[13px] leading-[20px] text-[#4E4C46]">{draft.description}</p>
                    </div>
                  )}
                </dl>
              </div>
              <div className="hidden border-t border-[#D8D3C9] px-5 py-4 lg:block">
                <p className="rounded-[10px] bg-[#151512] px-3.5 py-2.5 text-[12px] leading-[18px] text-[#FBFAF7]">
                  Draft auto-saves. Answer the remaining questions to create the ticket — or type{" "}
                  <span className="font-semibold text-[#F0644E]">“forget it”</span> to discard it.
                </p>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
