# RockDesk: Complete Documentation

Everything this app does, how it does it, and why it is built this way.
Written so you can walk into the follow up review and explain any line of it.

## 1. The product in 30 seconds

RockDesk turns plain chat messages into structured support tickets. A user types
something like "Login crashes on Safari, Rahul will fix it by Friday" and gets back
a ticket with a number, title, assignee, due date, and priority. If anything is
missing or unclear, the app asks one short question instead of guessing. Tickets
land in a login protected admin panel with search, filters, editing, and activity
history. Chat is public. Only the admin side needs a login.

The governing rule: the model suggests, the backend decides.

## 2. Feature inventory

Every user facing capability, where it lives, and why it exists.

### 2.1 Public chat (`apps/web/app/chat/page.tsx`)

- **Conversations list.** Past chats are stored in the browser with their session
  tokens, newest first, capped at 20. Switching reloads history from the server.
  Why: reviewers test many flows; losing threads would be painful.
- **Rotating placeholder coach.** The empty box cycles through real example
  inputs every 4.5 seconds, pausing on focus or typing. Why: it teaches the
  product without a tutorial page.
- **Example prompts.** Three clickable inputs covering the main flows
  (complete, ordinal date, ambiguous name). Why: one click each into the flows
  the brief cares about.
- **Streaming replies.** Assistant text renders word by word over server sent
  events, with a caret while tokens flow. If the stream breaks, the app retries
  the same message id against the JSON endpoint, which returns the stored
  result. A duplicate ticket is impossible by construction. Why: bonus
  requirement, implemented without weakening the validate first rule.
- **Voice input.** A mic button uses the browsers built in dictation and types
  what you say into the box. Hidden on browsers without speech recognition.
  Nothing is uploaded until you press send. Why: bonus requirement, zero keys,
  zero backend.
- **Disambiguation buttons.** When a name matches several people, their names
  and departments appear as buttons. Clicking sends the full name back. Why:
  faster and less error prone than typing.
- **Duplicate card.** When a new ticket looks like an open one, a card names
  the ticket number with Create anyway and Discard buttons. Why: bonus
  requirement from the brief, quoted almost verbatim.
- **Draft rail.** While a ticket is being built, a side panel shows the draft
  title, assignee, due date, priority, summary, and what is still needed.
  Why: the user always sees what the app understood so far.
- **Ticket confirmation card.** Every created ticket renders inline with number,
  status, priority, title, assignee, due date, and a link into admin. Why: the
  brief explicitly requires ID, title, assignee, due date, and priority in chat.

### 2.2 Landing (`apps/web/app/page.tsx`)

- **Hero only.** Eyebrow, two line headline, one short paragraph, two buttons.
  No sections below, per the decision that this page is a door, not a brochure.
- **Thread mock.** A condensed chat thread (message, reply, ticket) that plays
  itself in on load and links to the live chat. Why: it demonstrates the loop
  in one glance.
- **Wordmark logo.** The brand is the word RockDesk with a coral full stop, no
  icon box. Used in the header, sidebar, mobile header, and login.

### 2.3 Admin (`apps/web/app/admin/`)

- **Ticket list.** Search across title, description, and ticket number, plus
  status, assignee, priority, overdue, and due date range filters. Newest first.
  Custom dropdown and calendar controls, no native popups. Why: the brief
  requires exactly these filters.
- **Ticket detail.** Description, meta rows, original chat message, tags,
  activity timeline, and an edit panel for status, assignee, due date, and
  priority. A two step delete sits at the bottom of the edit panel. Why: the
  brief requires view, update, and delete.
- **People directory.** Plain rows of assignable humans plus an add person
  form. Why: assignees must come from this list, and the brief requires
  add and list.
- **Pinned sidebar.** The nav stays fixed while the content scrolls. Why: long
  ticket lists used to scroll the logo away.

### 2.4 Login (`apps/web/app/login/page.tsx`)

Split screen. Quiet ink panel on the left with the pitch in three numbered
lines, plain form on the right. Demo credentials are referenced, never
hardcoded. Why: reviewers need the fastest possible path into admin.

## 3. Architecture and why

```text
Next.js (apps/web) --HTTPS--> Express (apps/api) --SQL--> Supabase Postgres
       |                              |
   Supabase Auth                 Groq LLM (JSON mode)
```

- **Next.js for web.** Required no justification beyond fit: server proxy route
  keeps browser calls same origin, static pages prerender, client components
  isolate interactivity.
- **Express for API.** The brief mandates Node with Express, Fastify, or Nest.
  Express is the smallest thing that satisfies it, and it maps cleanly onto
  Vercel serverless functions.
- **Supabase for database and auth.** One provider covers Postgres, Auth with
  hashed passwords and JWTs, and row level security. A custom login endpoint
  would have reimplemented password hashing and token issuance for no gain,
  so login runs through Supabase Auth directly and the API verifies the token
  and role. This is the one deliberate deviation from the briefs suggested
  endpoints, and it is disclosed in the README.
- **No ORM.** The schema is small and migration SQL is the source of truth.
  Supabase SQL migrations give reviewable, ordered schema changes without a
  code generation layer.
- **Shared package.** Zod schemas and domain types live in `packages/shared`
  and are imported by both sides, so validation rules cannot drift. The API
  keeps a synced vendor copy for hermetic Vercel builds.
- **AI behind an interface.** `AIProvider` with a single method. Groq is the
  current implementation. Swapping providers means writing one new class.
- **One prompt module.** All instruction text lives in the AI service layer,
  never in route handlers, so prompts are reviewable in one place.

## 4. Backend module map (`apps/api/src/`)

- `index.ts`, `app.ts`. App assembly, middleware order, route mounting.
- `routes/`. Four routers: auth, chat, tickets, users. Ticket routes carry
  both `/:id` and `/by-id` variants because the Vercel static host skips
  dynamic segment files; the web client uses the `by-id` forms.
- `controllers/`. Thin by rule. They validate input with Zod, call services,
  shape responses, and translate errors. No business rules live here.
- `services/chat/chat-service.ts`. The state machine. Owns intent routing,
  assignee and date resolution, clarification, cancellation, duplicates, and
  ticket creation. This is the most important file in the review.
- `services/chat/assignee-resolver.ts`, `date-resolver.ts`,
  `duplicate-detector.ts`. Pure decision logic, unit tested.
- `services/chat/responder.ts`. Every user facing sentence in six languages.
- `services/ai/groq-provider.ts`. Groq SDK calls, JSON mode, one repair retry,
  primary plus fallback key.
- `repositories/`. All SQL goes through these. Tickets, chat sessions and
  messages, users. No queries anywhere else.
- `middleware/`. Chat session token check, admin JWT check, DB backed rate
  limiting, request ids.
- `schemas/http.ts`. Endpoint input validation.
- `utils/errors.ts`. One error shape for every route.

## 5. The chat pipeline, step by step

For `POST /api/chat/message` (and identically for `/api/chat/stream`):

1. Validate the body with Zod. Reject empty or overlong messages.
2. Check the session token: its SHA-256 hash must match the stored hash for
   that session id, else 401. Only the hash is ever stored.
3. Idempotency: if `clientMessageId` was seen, return the stored outcome
   (or the stored error) without touching the model.
4. Insert the user message, load the session, pending draft, assignable
   users, and a bounded window of recent conversation.
5. Call the model with date, timezone, users, history, draft, and message.
   Output is validated with Zod. One repair retry on schema failure, then a
   safe error that keeps the message and draft.
6. Route on intent:
   - Cancel: clear the draft, confirm in the users language.
   - General chat: reply conversationally, keep any draft untouched.
   - Ticket: merge model output with the stored draft, resolve assignee and
     date in backend code (never trusting the model for these), recompute
     missing fields.
7. If complete: run the duplicate check, then create atomically or ask.
8. If incomplete: save the draft to Postgres (never memory, so serverless is
   safe), ask one short question covering all missing fields.
9. Persist the outcome against the user message for idempotent retries.

## 6. The three bonus features, in depth

### 6.1 Streaming (`POST /api/chat/stream`)

Runs the identical pipeline above, then emits the already validated reply as
server sent event word frames (three words each, 24 ms pacing) followed by a
`done` frame carrying the exact JSON shape. Validation happens before the
first byte streams, so the architecture rule against exposing raw model
output holds. Auth, rate limiting, and error shapes match the JSON endpoint;
mid stream failures arrive as an `error` event. The client reads frames with
a fetch reader, renders tokens live, and falls back to the JSON endpoint on
the same message id if streaming is unavailable. Function timeout is 120
seconds on Vercel, same as the message endpoint. The web same origin proxy
passes the stream through untouched.

### 6.2 Voice input (`components/voice-button.tsx`)

Wraps the browsers SpeechRecognition (with the webkit prefix fallback),
continuous mode with interim results, recognition language taken from the
browser locale. Dictated text lands in the composer with any typed prefix
preserved. The button is hidden where the API does not exist, turns deep red
while listening, and cleans up on unmount. No audio or text leaves the
device through our code; the message is only sent when the user presses send.

### 6.3 Duplicate detection

`duplicate-detector.ts` tokenizes titles (Unicode aware, lowercased), drops a
small multilingual stopword list, applies a naive plural stem, and scores
Jaccard similarity against the 100 most recently updated open tickets.
Resolved tickets are history, not duplicates. Threshold is 0.5, locked by
unit tests. On a match, creation pauses: the complete draft is saved with a
`duplicateCandidate`, and the reply names the ticket number in the users
language with Create anyway and Discard buttons. Yes, no, and create anyway
phrasings (multilingual regexes, mirroring the existing affirmative matcher)
resolve it; cancel still discards; anything else is treated as new
information and re-evaluated. The `PendingTicket` schema carries the two new
fields with defaults, so old stored drafts still parse.

## 7. Database (`supabase/migrations/`)

Ordered migrations plus `seed.sql`. Tables:

- `app_users`. Directory and roles. Links to `auth.users` for admins.
  Seeded with five assignable people; the two Rahuls are intentional for the
  ambiguity flow.
- `tickets`. Number from a sequence starting at 100, title, description,
  original title, assignee, due date, priority, status, tags, language,
  source message and session, timestamps.
- `chat_sessions`. Opaque token hash, one pending draft JSON, state.
- `chat_messages`. Role, content, detected language, client message id,
  stored outcome JSON for idempotent retries.
- `ticket_events`. Append only activity. Foreign key cascades on ticket
  delete, so deleting a ticket removes its history automatically.
- `rate_limits`. DB backed counters for the AI rate limiter.

Creation runs through the `create_ticket_from_chat` RPC: ticket row, creation
event, and draft clear in one call.

## 8. Auth model

- Chat: public. Opaque high entropy token per session, SHA-256 stored,
  presented in the `X-Chat-Session-Token` header. Tokens never appear in
  URLs or logs.
- Admin: Supabase Auth email and password. The browser holds the JWT. Every
  admin route verifies it and loads the role from `app_users`; non admins
  get 403, and the login page refuses non admin accounts even with a valid
  password.
- Rate limiting is per key in Postgres, not an in memory map, so it works
  across serverless instances.

## 9. API reference

Chat routes take the session token header. Admin routes take a Bearer JWT.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/chat/sessions` | Start a session, returns id and token |
| POST | `/api/chat/message` | Send a message, returns reply, draft or ticket |
| POST | `/api/chat/stream` | Same, reply streamed as events then a done frame |
| GET | `/api/chat/sessions/by-id?sessionId=` | Full history for a session |
| GET | `/api/tickets` | Search, filters, pagination, newest first |
| GET | `/api/tickets/by-id?id=` | Detail with activity |
| PATCH | `/api/tickets/by-id?id=` | Edit status, assignee, date, priority, tags |
| DELETE | `/api/tickets/by-id?id=` | Delete ticket and activity, admin only |
| GET | `/api/users` | Assignable people, optional search |
| POST | `/api/users` | Add a person, admin only |
| GET | `/api/auth/me` | Identity and role for the current token |
| GET | `/api/health`, `/health` | Liveness probe |

## 10. Frontend map (`apps/web/`)

- `app/page.tsx`. Landing hero only.
- `app/chat/page.tsx`. Chat workspace, sessions, streaming send, duplicate
  card, composer with voice, draft rail.
- `app/login/page.tsx`. Admin sign in.
- `app/admin/page.tsx`. Ticket list and filters.
- `app/admin/[id]/page.tsx`. Detail, edit, two step delete.
- `app/admin/users/page.tsx`. Directory and add form.
- `app/api/[...path]/route.ts`. Same origin proxy to the Express API,
  passes every method and streams through.
- `components/`. App shell, ticket card, status dots, custom dropdown,
  custom calendar, voice button, motion helpers, loading and error states.
- `lib/api-client.ts`. Typed client, SSE reader, error class.

Design language: warm paper background, ink text, one coral accent, Geist
sans and mono, 10px buttons, 14px cards, dot plus text statuses instead of
pills, motion only for entrances and streaming, everything honoring reduced
motion.

## 11. Failure behavior worth knowing

- Model timeout or bad JSON: message kept, draft kept, plain retryable error.
- Primary LLM key fails: automatic retry with the fallback key.
- Network retry mid send: same message id returns the stored outcome, never
  a second ticket.
- Stream breaks: JSON fallback on the same id, same guarantee.
- Unknown assignee: named with the real team list, never invented.
- Ambiguous name: both people with departments, buttons to pick.
- Ambiguous date: proposed date must be confirmed first.
- Slow model: 30 second cap, safe error, message preserved.

## 12. Testing and CI

61 automated tests, all hitting the real test database:

- 10 date resolver, 5 assignee resolver, 5 duplicate similarity, 9
  regressions, 3 proxy, 13 chat state machine, 16 HTTP API including
  streaming frames, duplicate ask and confirm, cancel, deletion, and auth
  rejection.
- Creation tests use collision proof titles so live demo data can never make
  them flaky. This was learned the hard way: realistic titles genuinely
  matched real tickets once duplicate detection shipped.
- `npm run lint`, `npm run typecheck` (strict, all workspaces), production
  builds for web and API.
- `.github/workflows/ci.yml` runs lint, typecheck, and the web build on
  every push. API tests run when the Supabase secrets exist.

## 13. Deployment

Two Vercel projects from one repo: `rockdesk-api` rooted at `apps/api`
(Express compiled, one thin function file per route, chat endpoints at 120
seconds) and `rockdesk-iota` rooted at `apps/web`. A root services config
keeps the repo level project building. Environment is split cleanly:
`NEXT_PUBLIC_` browser keys for web, server only secrets for the API, demo
credentials in the README, live health endpoint for smoke checks.

## 14. Assumptions and limits

- Default model `qwen/qwen3.8-27b` on Groq; Llama 3.3 70b was retired there.
- Chat is public; only admin needs login.
- Bare weekday means the coming one; bare month date means the nearest
  future one, confirmed first.
- One pending draft per session, by design.
- Search is `ILIKE`, fine for demo scale; full text later.
- Cut deliberately: notifications, Slack and WhatsApp inputs, Docker.
  Streaming, voice, and duplicates were bonus and are now built.

## 15. Review Q and A prep

- Why not regex instead of an LLM? The brief forbids it as the main approach,
  and free text in six languages has no stable patterns. The LLM only
  proposes; backend code resolves dates, people, and missing fields.
- How do you stop hallucinations? The model never writes to the database
  directly. Assignees resolve against the people table, dates through the
  resolver, missing fields recomputed, creation through one RPC.
- Why Jaccard instead of embeddings for duplicates? Deterministic, no extra
  model latency or cost, unit testable, and plenty for title similarity.
  Embeddings would be the upgrade for description level matching.
- Why stream validated text instead of model tokens? The projects own safety
  rule forbids showing unvalidated model output. Paced delivery of checked
  text gives the UX win without breaking the rule.
- Why Supabase Auth instead of a custom login endpoint? Password hashing,
  JWT issuance, and rotation are outsourced to audited infrastructure. The
  API still enforces roles itself.
- What happens on double submit? Same client message id returns the stored
  outcome; the database RPC makes creation atomic.
- What did you cut and why? Notifications and extra chat surfaces. The
  briefs weighting puts the end to end flow first, and scope was cut before
  touching deployment.

## 16. Demo walkthrough (silent, captioned)

Recorded demo: https://youtu.be/eS1Pqk6yo40

Record the browser at 1080p with click highlighting, fresh chat per shot,
captions overlaid. This covers all 12 acceptance checks.

1. Complete message with assignee and date. Send the checkout, Priya, Friday
   message. Hold on the confirmation card.
2. Missing fields. New chat, "Login page crashes on Safari." Hold on the
   single question, answer "Amit Kumar, by Friday", hold on the ticket.
3. Bare date. New chat, Safari plus "by the 4th". Hold on the confirm
   question, answer "Yes, October", hold on the ticket.
4. Ambiguous name. New chat, "Search results are wrong, Rahul to fix by
   tomorrow." Hold on both Rahuls with departments. Click one, hold on
   the ticket.
5. Unknown name. New chat, same message with a made up name. Hold on the
   reply listing the real team.
6. Other languages. New chat, the Hinglish payment message. Hold on the
   Hinglish reply and English titled card. Optionally repeat in Spanish.
7. Relative date. New chat, Rahul Sharma by tomorrow, urgent. Later open
   the ticket in admin and hold on the due date.
8. Cancel and small talk. New chat, send anything, then "forget it", hold
   on the discard reply. Then "hello", hold on the polite reply with no
   ticket.
9. Duplicate. New chat, repeat a message close to an existing ticket. Hold
   on the duplicate card, click Create anyway, hold on the ticket.
10. Streaming and voice. New chat, watch the reply render progressively.
    Click the mic, dictate a sentence, show it landing in the box.
11. Admin. Sign in, search once, open the newest ticket, change status,
    hold on the new activity entry. Change nothing else.
