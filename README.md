# RockDesk — Chat-to-Ticket (PyRock assessment)

Describe an issue in plain words, in any language. RockDesk turns it into a clean, trackable ticket.

> The LLM interprets. The backend validates and decides. The database persists. The UI explains.

## Live demo

| Surface | URL |
|---|---|
| Chat | `<web-vercel-url>/chat` |
| Admin | `<web-vercel-url>/admin` |
| API health | `<api-vercel-url>/health` |

> Deployment to the reviewer's Vercel account is a 10-minute, 3-command job — see [Deploy](#deploy). All builds, tests, and live end-to-end runs below were verified against the production Supabase project and the real Groq LLM.

**Demo admin credentials:** `admin@rockdesk.demo` / `RockDesk-Admin-2026`

The public chat needs no login. Assignable people are seeded: Priya Menon, Rahul Sharma, Rahul Verma (intentional duplicate for ambiguity testing), Amit Kumar, Neha Singh.

## Monorepo layout

```text
apps/web        Next.js 16 + TypeScript + Tailwind v4  → Vercel (web project)
apps/api        Express 5 + TypeScript (api/index.ts) → Vercel (api project, Node runtime)
packages/shared Zod schemas, domain types, constants (single source of truth)
supabase/       Ordered SQL migrations + seed.sql (schema source of truth)
docs/           Product/implementation contract (read first)
```

## Quick start (local)

Prerequisites: Node 20+, Supabase CLI (logged in), a Supabase project.

```bash
npm install

# 1. Link + migrate + seed
supabase link --project-ref <your-ref>
supabase db push
supabase db query --linked -f supabase/seed.sql

# 2. Create the demo admin Auth user + link profile (one-off script, then delete it)
#    See README section "Demo admin account".

# 3. Configure env
cp .env.example .env   # fill in Supabase URL/keys + GROQ_API_KEY (+ optional GROQ_FALLBACK_API_KEY)

# 4a. Run the API (http://localhost:4000)
npm run dev:api
# 4b. Run the web (http://localhost:3000) — needs apps/web/.env.local:
# NEXT_PUBLIC_SUPABASE_URL=...  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...  NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
npm run dev:web
```

### Demo admin account

Create via the Supabase dashboard (Authentication → Add user) or the Auth Admin API,
then link the profile so the API recognises the admin role:

```sql
update public.app_users set auth_user_id = '<auth.users.id>', role = 'admin'
where email = 'admin@rockdesk.demo';
```

## Environment variables

Web (`apps/web/.env.local`, `NEXT_PUBLIC_` prefix — browser-visible only):

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_API_BASE_URL
```

API (server-only — never prefix with `NEXT_PUBLIC_`, never commit):

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
GROQ_API_KEY                  # primary
GROQ_FALLBACK_API_KEY         # optional; automatic failover when the primary errors
LLM_MODEL                     # default: qwen/qwen3.8-27b
APP_TIMEZONE_DEFAULT          # default: Asia/Kolkata
AI_RATE_LIMIT_PER_MINUTE      # default: 20
CORS_ORIGINS                  # comma-separated web origins
PORT                          # local only; default 4000
```

See `.env.example` at the repo root. `.env`, `.env.local`, and `apps/web/.env.local` are git-ignored.

## Architecture

```text
Next.js web ──HTTPS + Bearer JWT / chat session token──▶ Express API (Vercel Node runtime)
                                                              │            │
                                                     Supabase Postgres/Auth  Groq LLM (JSON mode)
```

- **Chat is public.** `POST /api/chat/sessions` issues a high-entropy opaque token; only its SHA-256 hash is stored. Every message request presents it via `X-Chat-Session-Token`.
- **Admin is protected.** Supabase Auth email/password → `Authorization: Bearer` → API verifies the token and loads the `app_users` role. Non-admins get 403.
- **Pending drafts live in Postgres** (`chat_sessions.pending_ticket`), never in memory — safe on serverless.
- **Atomic creation** via the `create_ticket_from_chat` RPC (ticket + `TICKET_CREATED` event + draft clear).
- **Idempotency** via `clientMessageId` (unique per session); retries return the stored outcome.
- **Rate limiting** is DB-backed (`rate_limits` table), not an in-memory Map.

## AI approach

1. `GroqAIProvider` (behind the `AIProvider` interface) sends one prompt module's system/user text: current date + IANA timezone, assignable users, bounded recent conversation, pending draft, latest message — with `response_format: json_object`. If the primary `GROQ_API_KEY` fails (network/auth/5xx), the same request is retried with `GROQ_FALLBACK_API_KEY`.
2. Output is validated with Zod (`TicketAnalysisSchema`); on schema failure it retries **once** with a repair instruction, then fails gracefully (message kept, draft kept, user-safe error).
3. The backend — never the model — resolves assignees against `app_users` (0 or 2+ matches → clarification, never a guess), normalises dates (relative dates, weekday guard, nearest-future ordinal flagged ambiguous until confirmed), and recomputes `missingFields`.
4. Deterministic multilingual responder templates (en/hi/Hinglish/es/ar/zh) ask **one short question for all missing fields**; free-form conversation uses the model's in-language reply.
5. Original messages are stored verbatim; ticket titles are normalised to English; replies match the user's language.

## Verification (all actually run)

```bash
npm run lint                              # eslint, clean
npm run typecheck --workspaces            # strict tsc, clean
npm run test --workspace=@chat-to-ticket/api   # vitest + supertest, 33/33 pass
npm run build --workspace=@chat-to-ticket/web  # production Next build, passes
npm run build --workspace=@chat-to-ticket/api  # production tsc build, passes
```

Live runs against production Supabase + real Groq (`qwen/qwen3.8-27b`): complete ticket (Priya/Friday→2026-10-02/High), missing-assignee loop, ambiguous-Rahul disambiguation + resolution, Hindi/Hinglish/Spanish/Arabic/Chinese tickets, `hello` (no ticket), `forget it` (draft discarded), admin login → search/filter/patch/activity, user directory search. API `/health` returns `{status:"ok"}`.

## Deploy (Vercel multi-service, single domain)

One Vercel project from this repo, configured by the root `vercel.json`:

- service **`api`** (Express, `apps/api`) — public on `/api/*`
- service **`web`** (Next.js, `apps/web`) — public on `/*` (catch-all)

No `bindings` are declared, deliberately: the browser calls the API over the public same-origin `/api/*` route, and no server-side function calls another service. Bindings are for function-to-function calls at runtime — there are none here.

Paste the `.env` contents (or set vars individually) in the Vercel dashboard → Environments: Production and Preview:

```text
# api service (server-only)
SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
GROQ_API_KEY, GROQ_FALLBACK_API_KEY
LLM_MODEL=qwen/qwen3.8-27b
APP_TIMEZONE_DEFAULT=Asia/Kolkata
AI_RATE_LIMIT_PER_MINUTE=20
CORS_ORIGINS=https://<your-domain>
# web service (browser-visible)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# NOTE: do NOT set NEXT_PUBLIC_API_BASE_URL — unset means same-origin /api/*
```

**Supabase** — `supabase link`, `supabase db push`, seed, create + link the admin Auth user, keep demo credentials active ≥14 days.

Standalone alternative (two Vercel projects): API with Root Directory `apps/api`, Install `npm install --prefix ../..`, Build `npm --prefix ../.. run build --workspace=@chat-to-ticket/shared && npm run build`; Web with Root Directory `apps/web` plus `NEXT_PUBLIC_API_BASE_URL=<api-url>`.

## Assumptions

- Groq is the LLM provider (keys supplied); default model `qwen/qwen3.8-27b` (verified JSON mode + multilingual on the live API; `llama-3.3-70b-versatile` has been retired by Groq).
- Chat is public; only `/admin` requires login (per the brief's weighting).
- English-normalised titles; assistant replies in the user's language (Hinglish preserved as Hinglish).
- Bare weekday "Friday" = the upcoming Friday; "the 4th" = nearest future 4th, confirmed before creation.
- No duplicate detection, streaming, or notifications (explicit non-goals until P0 is solid).

## Known limitations

- Vercel deployment needs the reviewer's `vercel login` (interactive); everything else is pre-configured.
- Ticket list search uses `ILIKE` (fine for demo scale; upgrade to pg_trgm/full-text later).
- One active pending draft per session (by design — keeps the state machine explicit).
- AI timeout is 30s; longer stalls return a safe retryable error with the message preserved.
