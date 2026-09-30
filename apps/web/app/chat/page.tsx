"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PaperPlaneRight, Plus, UserCircle, WarningCircle } from "@phosphor-icons/react";
import AppShell from "@/components/app-shell";
import TicketCard from "@/components/ticket-card";
import { VoiceButton } from "@/components/voice-button";
import { FieldLabel, MetaPill } from "@/components/pills";
import {
  createChatSession,
  ApiError,
  loadChatHistory,
  sendChatMessage,
  streamChatMessage,
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
  duplicate?: { ticketNumber: number; title: string } | null;
  streaming?: boolean;
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

function stateText(draft: DraftView | null, sending: boolean): string {
  if (sending) return "Reading your message…";
  if (!draft) return "Idle — describe an issue";
  if (draft.missingFields.length === 0) return "Draft ready — reply to confirm";
  return `Waiting on ${draft.missingFields.join(", ").replace(/_/g, " ")}`;
}

const PLACEHOLDER_EXAMPLES = [
  "Describe an issue or task…",
  "Try: Checkout 500s — Priya to fix by Friday, high priority…",
  "Try: Login crashes on Safari, resolve by the 4th…",
  "Try: Search is wrong, Rahul to fix by tomorrow…",
];

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
    const streamId = `streaming-${clientMessageId}`;
    const request = { sessionId, sessionToken, message: trimmed, timezone, clientMessageId };
    const applyResult = (res: ChatMessageResponse): void => {
      const assistant: Message = {
        id: res.assistantMessage.id,
        role: "assistant",
        content: res.assistantMessage.content,
        ticket: res.ticket,
        options: res.draft?.disambiguationOptions?.length ? res.draft.disambiguationOptions : undefined,
        duplicate: res.duplicate,
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== streamId), assistant]);
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
    };
    try {
      try {
        // Prefer streaming; the JSON endpoint below reuses the same message id,
        // so a fallback can never create a duplicate ticket.
        let streamedText = "";
        const res = await streamChatMessage(request, (piece) => {
          streamedText += piece;
          const snapshot = streamedText;
          setMessages((prev) =>
            prev.some((m) => m.id === streamId)
              ? prev.map((m) => (m.id === streamId ? { ...m, content: snapshot } : m))
              : [...prev, { id: streamId, role: "assistant", content: snapshot, streaming: true }],
          );
        });
        applyResult(res);
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== streamId));
        applyResult(await sendChatMessage(request));
      }
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

  const reduceMotion = useReducedMotion();
  const [composerFocused, setComposerFocused] = useState(false);
  const [phIndex, setPhIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion || input !== "" || composerFocused) return;
    const t = setInterval(() => setPhIndex((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length), 4500);
    return () => clearInterval(t);
  }, [reduceMotion, input, composerFocused]);

  const showRail = draft !== null;
  const canSend = input.trim() !== "" && !sending && !booting && sessionToken !== null;
  const placeholder = PLACEHOLDER_EXAMPLES[phIndex] ?? "Describe an issue or task…";

  return (
    <AppShell>
      <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row">
        {/* Session list */}
        <div className="hidden w-60 shrink-0 flex-col border-r border-[#D8D3C9] bg-[#FBFAF7] lg:flex">
          <div className="flex items-center justify-between px-4 pb-1 pt-5">
            <span className="text-[12px] font-semibold text-[#4E4C46]">Conversations</span>
            <button
              onClick={startNewSession}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-[#C94A37] transition-colors duration-150 hover:bg-[#FBE1DB]"
              aria-label="Start a new conversation"
            >
              <Plus size={13} weight="bold" /> New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {sessions.map((s) => {
              const active = s.id === sessionId;
              return (
                <button
                  key={s.id}
                  onClick={() => void activateSession(s.id, s.token, s.title)}
                  aria-current={active ? "true" : undefined}
                  className={`mb-0.5 block w-full rounded-lg px-3 py-2 text-left transition-colors duration-150 ${
                    active ? "bg-[#EFECE5]" : "hover:bg-[#EFECE5]/60"
                  }`}
                >
                  <span className={`block truncate text-[13px] ${active ? "font-semibold text-[#151512]" : "font-medium text-[#4E4C46]"}`}>
                    {s.title}
                  </span>
                  <span className="font-mono text-[10.5px] text-[#77736A]">
                    {new Date(s.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </button>
              );
            })}
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

          <p className="border-b border-[#D8D3C9] px-6 py-3 text-[12px] text-[#77736A] md:px-10" aria-live="polite">
            {stateText(draft, sending)}
          </p>

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
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <h1 className="text-[24px] font-semibold leading-[30px] tracking-[-0.01em]">
                      What needs doing?
                    </h1>
                    <p className="mt-1.5 max-w-xl text-[13.5px] leading-[21px] text-[#4E4C46]">
                      Describe the issue in your own words and language — English, Hindi, Hinglish,
                      Spanish, Arabic, or Chinese. I&apos;ll draft the ticket and ask only for what&apos;s missing.
                    </p>
                  </motion.div>
                  <div className="mt-5 flex flex-col gap-2">
                    <p className="text-[12px] font-medium text-[#77736A]">Try one of these</p>
                    {[
                      "Checkout page is throwing 500 errors for some users. Priya will fix it by Friday, high priority.",
                      "Login page crashes on Safari, this will be resolved by the 4th.",
                      "Search results are wrong, Rahul to fix by tomorrow.",
                    ].map((example, i) => (
                      <motion.button
                        key={example}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 + i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        onClick={() => void send(example)}
                        className="rounded-[10px] border border-[#D8D3C9] bg-[#FBFAF7] px-3.5 py-2.5 text-left text-[13px] leading-[20px] text-[#4E4C46] transition-colors duration-150 hover:border-[#BDB7AC] hover:bg-white hover:text-[#151512]"
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
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[85%] rounded-[14px] rounded-br-[6px] bg-[#151512] px-4 py-2.5 text-[14px] leading-[21px] text-[#FBFAF7]">
                        {m.content}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="flex flex-col gap-2.5"
                    >
                      <div className="max-w-[92%] rounded-[14px] rounded-bl-[6px] border border-[#D8D3C9] bg-[#FBFAF7] px-4 py-2.5 text-[14px] leading-[21px]">
                        {m.content}
                        {m.streaming && <span className="stream-caret" aria-hidden="true" />}
                      </div>
                      {m.duplicate && (
                        <div className="max-w-[92%] rounded-[14px] border border-[#D8D3C9] bg-[#FBFAF7] p-3.5">
                          <p className="text-[12px] font-semibold text-[#4E4C46]">Possible duplicate</p>
                          <p className="mt-1 text-[14px] font-semibold leading-[20px]">
                            <span className="font-mono text-[12px] font-normal text-[#77736A]">#{m.duplicate.ticketNumber}</span>{" "}
                            {m.duplicate.title}
                          </p>
                          <div className="mt-2.5 grid grid-cols-2 gap-2">
                            <button
                              onClick={() => void send("Yes, create it anyway")}
                              disabled={sending}
                              className="rounded-[10px] bg-[#151512] py-2 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-85 disabled:opacity-50"
                            >
                              Create anyway
                            </button>
                            <button
                              onClick={() => void send("forget it")}
                              disabled={sending}
                              className="rounded-[10px] border border-[#BDB7AC] bg-white py-2 text-[13px] font-medium text-[#4E4C46] transition-colors hover:border-[#8a867e] disabled:opacity-50"
                            >
                              Discard
                            </button>
                          </div>
                        </div>
                      )}
                      {m.options && m.options.length > 0 && (
                        <div className="grid max-w-[92%] gap-2 sm:grid-cols-2">
                          {m.options.map((o) => (
                            <button
                              key={o.id}
                              onClick={() => void send(o.name)}
                              disabled={sending}
                              className="flex items-center gap-2.5 rounded-[12px] border border-[#D8D3C9] bg-[#FBFAF7] p-3 text-left transition-colors duration-150 hover:border-[#BDB7AC] hover:bg-white disabled:opacity-60"
                            >
                              <UserCircle size={24} className="shrink-0 text-[#77736A]" />
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
                <div className="flex items-start gap-2 rounded-[10px] border border-[#E5B3AC] bg-[#FDF1EE] px-4 py-2.5 text-[13px] text-[#B83C34]">
                  <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-[#D8D3C9] bg-[#FBFAF7] px-6 py-4 md:px-10">
            <div className="mx-auto max-w-2xl">
              <div className="rounded-[16px] border border-[#D8D3C9] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(21,21,18,0.06)] transition-all duration-200 focus-within:border-[#F0644E] focus-within:shadow-[0_0_0_3px_#FBE1DB,0_12px_28px_-16px_rgba(240,100,78,0.55)]">                {draft?.title ? (
                  <div className="flex min-w-0 items-center gap-2 border-b border-[#EFECE5] pb-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F0644E]" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#4E4C46]">
                      {draft.title}
                    </span>
                    {draft.missingFields.length > 0 && (
                      <span className="shrink-0 text-[11.5px] text-[#77736A]">
                        needs {draft.missingFields[0]?.replace(/_/g, " ")}
                        {draft.missingFields.length > 1 ? ` +${draft.missingFields.length - 1}` : ""}
                      </span>
                    )}
                  </div>
                ) : null}
                <div className="flex items-end gap-2 pt-2">
                  <VoiceButton value={input} onTranscript={setInput} disabled={sending || booting} />
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onComposerKey}
                    onFocus={() => setComposerFocused(true)}
                    onBlur={() => setComposerFocused(false)}
                    rows={1}
                    placeholder={placeholder}
                    aria-label="Chat message"
                    className="max-h-32 min-h-[36px] flex-1 resize-none overflow-y-auto bg-transparent py-1.5 text-[14px] leading-[22px] placeholder:text-[#a09a8e] focus:outline-none"
                  />
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    whileHover={canSend ? { scale: 1.06 } : undefined}
                    onClick={() => void send(input)}
                    disabled={!canSend}
                    aria-label="Send message"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ${
                      canSend ? "bg-[#F0644E] text-white hover:bg-[#C94A37]" : "cursor-not-allowed bg-[#EFECE5] text-[#BDB7AC]"
                    }`}
                  >
                    <PaperPlaneRight size={16} weight="fill" />
                  </motion.button>
                </div>
              </div>
              <p className="mt-2 text-[11.5px] text-[#77736A]">
                Enter to send · Shift+Enter for a new line · Type “forget it” to discard a draft
              </p>
            </div>
          </div>
        </div>

        {/* Ticket context rail */}
        <AnimatePresence initial={false}>
          {showRail && draft && (
            <motion.aside
              key="draft-rail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full shrink-0 border-t border-[#D8D3C9] bg-[#FBFAF7] px-5 py-5 lg:w-72 lg:border-l lg:border-t-0 lg:overflow-y-auto"
            >
              <p className="text-[12px] font-semibold text-[#4E4C46]">Draft ticket</p>
              <h2 className="mt-1 text-[15px] font-semibold leading-[21px] tracking-tight">
                {draft.title ?? "Understanding your request…"}
              </h2>
              <dl className="mt-4 divide-y divide-[#D8D3C9] border-y border-[#D8D3C9]">
                <div className="py-2.5">
                  <FieldLabel>Assignee</FieldLabel>
                  <p className="mt-0.5 text-[13.5px]">
                    {draft.assigneeName ?? draft.assigneeId ?? (draft.missingFields.includes("assignee") ? <span className="text-[#C94A37]">Needed</span> : "Unassigned")}
                  </p>
                </div>
                <div className="py-2.5">
                  <FieldLabel>Due date</FieldLabel>
                  <p className="mt-0.5 font-mono text-[12.5px]">
                    {draft.dueDate ?? <span className="font-sans text-[#C94A37]">Needed</span>}
                  </p>
                </div>
                <div className="py-2.5">
                  <FieldLabel>Priority</FieldLabel>
                  <p className="mt-0.5 text-[13.5px]">{draft.priority}</p>
                </div>
                {draft.description && (
                  <div className="py-2.5">
                    <FieldLabel>Summary</FieldLabel>
                    <p className="mt-0.5 text-[13px] leading-[20px] text-[#4E4C46]">{draft.description}</p>
                  </div>
                )}
              </dl>
              {draft.missingFields.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {draft.missingFields.map((f) => (
                    <MetaPill key={f} label={`Needs ${f.replace("_", " ")}`} />
                  ))}
                </div>
              )}
              <p className="mt-4 text-[12px] leading-[18px] text-[#77736A]">
                Answer the remaining questions to create the ticket, or type “forget it” to discard it.
              </p>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
