// Opt-in: consumes real model requests. Creates and removes only its own QA data.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ quiet: true });
const base = process.env.QA_BASE_URL || "https://rockdesk-iota.vercel.app";
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const sessions = [];
const checks = [];
async function api(path, init) {
  const response = await fetch(`${base}${path}`, init);
  const json = await response.json();
  assert(response.ok, `${path}: ${response.status} ${json.error?.message}`);
  return json.data;
}
async function session() {
  const s = await api("/api/chat/sessions", { method: "POST" });
  sessions.push(s.sessionId);
  return s;
}
async function send(s, message, clientMessageId = randomUUID()) {
  return api("/api/chat/message", { method: "POST", headers: { "Content-Type": "application/json", "X-Chat-Session-Token": s.sessionToken }, body: JSON.stringify({ sessionId: s.sessionId, message, clientMessageId, timezone: "Asia/Kolkata" }) });
}
async function check(name, fn) {
  try { await fn(); checks.push({ name, pass: true }); console.log(`PASS ${name}`); }
  catch (e) { checks.push({ name, pass: false, error: e.message }); console.log(`FAIL ${name}: ${e.message}`); }
}
try {
  const auth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await auth.auth.signInWithPassword({ email: "admin@rockdesk.demo", password: process.env.QA_ADMIN_PASSWORD || "RockDesk-Admin-2026" });
  assert(!error && data.session, "Demo login failed");
  const headers = { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" };
  await check("demo login and profile", async () => { assert.equal((await api("/api/auth/me", { headers })).role, "admin"); });
  await check("complete message, history card, admin edit and filters", async () => {
    const s = await session();
    const out = await send(s, "QA acceptance: checkout shows 500 errors. Priya will fix it tomorrow, high priority.");
    assert(out.ticket); assert.equal(out.ticket.assignee.name, "Priya Menon"); assert.equal(out.ticket.priority, "High");
    assert.equal(out.ticket.dueDate, "2026-10-01");
    const history = await api(`/api/chat/sessions/by-id?sessionId=${s.sessionId}`, { headers: { "X-Chat-Session-Token": s.sessionToken } });
    assert(history.messages.some(m => m.ticket?.id === out.ticket.id));
    await api(`/api/tickets/by-id?id=${out.ticket.id}`, { method: "PATCH", headers, body: JSON.stringify({ status: "In Progress" }) });
    const detail = await api(`/api/tickets/by-id?id=${out.ticket.id}`, { headers });
    assert.equal(detail.ticket.status, "In Progress"); assert(detail.ticket.sourceMessage.includes("QA acceptance"));
    const list = await api(`/api/tickets?search=%23${out.ticket.ticketNumber}&status=In%20Progress&priority=High&dueFrom=2026-10-01&dueTo=2026-10-01`, { headers });
    assert.equal(list.items[0]?.id, out.ticket.id);
    await api('/api/tickets?search=' + encodeURIComponent('a,b("test")'), { headers });
  });
  await check("missing both, ambiguous date and assignee, follow-up", async () => {
    const s = await session();
    const a = await send(s, "QA acceptance: Safari login crashes.");
    assert.deepEqual([...a.draft.missingFields].sort(), ["assignee", "due_date"]);
    const b = await send(s, "Rahul will fix it by the 4th.");
    assert(!b.ticket); assert(b.draft.missingFields.includes("assignee")); assert(b.draft.missingFields.includes("due_date"));
    const c = await send(s, "Rahul Sharma, yes October 4, 2026.");
    assert(c.ticket); assert.equal(c.ticket.assignee.name, "Rahul Sharma"); assert.equal(c.ticket.dueDate, "2026-10-04");
  });
  await check("unknown assignee and cancellation", async () => {
    const s = await session();
    const a = await send(s, "QA acceptance: search is broken, assign to Zorblax.");
    assert(!a.ticket); assert(a.draft.missingFields.includes("assignee")); assert(a.draft.missingFields.includes("due_date"));
    const b = await send(s, "forget it"); assert.equal(b.draft, null); assert.equal(b.ticket, null);
  });
  await check("greeting creates no ticket", async () => { const a = await send(await session(), "hello"); assert.equal(a.ticket, null); assert.equal(a.draft, null); });
  for (const [language, message] of [
    ["hi", "QA: लॉगिन पेज काम नहीं कर रहा है। इसे Priya Menon को सौंपें, समय सीमा नहीं है।"],
    ["es", "QA: La página de pago no funciona. Asignar a Priya Menon, sin fecha límite."],
    ["ar", "QA: صفحة الدفع لا تعمل. أسندها إلى Priya Menon، بدون موعد نهائي."],
    ["zh", "QA：支付页面无法使用。分配给 Priya Menon，不设截止日期。"],
    ["hi-Latn", "QA: Payment page bahut slow hai. Amit Kumar ko assign karo, koi deadline nahi hai."],
  ]) await check(`${language} extraction and response`, async () => {
    const a = await send(await session(), message);
    assert(a.ticket); assert.equal(a.ticket.dueDate, null);
    assert(a.assistantMessage.detectedLanguage.toLowerCase().startsWith(language.split('-')[0]));
  });
} finally {
  if (sessions.length) {
    const { error: ticketsError } = await db.from("tickets").delete().in("source_session_id", sessions);
    assert(!ticketsError, "QA ticket cleanup failed");
    const { error: sessionsError } = await db.from("chat_sessions").delete().in("id", sessions);
    assert(!sessionsError, "QA session cleanup failed");
  }
  writeFileSync("tmp/live-acceptance.json", JSON.stringify({ date: new Date().toISOString(), base, checks }, null, 2));
}
if (checks.some(c => !c.pass)) process.exitCode = 1;
