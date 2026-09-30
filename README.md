# RockDesk

Type a problem in plain words. Get a clean ticket. That is the whole product.

RockDesk is my entry for the PyRock Chat to Ticket assignment. You describe an issue in a chat box, in English, Hindi, Hinglish, Spanish, Arabic, or Chinese. The app turns it into a structured ticket with an assignee, a due date, and a priority. When something is missing or unclear, it asks one short follow up question. It never guesses.

The rule behind the build: the model suggests, the backend decides.

## Submission

| Item | Value |
|---|---|
| Chat | `https://rockdesk-iota.vercel.app/chat` |
| Admin panel | `https://rockdesk-iota.vercel.app/admin` |
| API | `https://rockdesk-api.vercel.app` (try `/api/health`) |
| Repo | `https://github.com/Krish-1507/RockDesk` |
| Admin login | `admin@rockdesk.demo` / `RockDesk-Admin-2026` |
| Chat login | none needed, the chat is public |
| Assignable people | Priya Menon, Rahul Sharma, Rahul Verma, Amit Kumar, Neha Singh |
| Demo walkthrough | `Complete_Documentation.md`, section 16 |

Rahul Sharma and Rahul Verma share a first name on purpose, so reviewers can test what happens with an ambiguous name.

## Run it locally

You need Node 20 or newer, a Supabase project, and a Groq API key.

```bash
npm install

# point the Supabase CLI at your project, then create the tables and seed data
supabase link --project-ref <your-ref>
supabase db push
supabase db query --linked -f supabase/seed.sql
```

Create the demo admin in the Supabase dashboard under Authentication, Add user. Then link it to the admin profile:

```sql
update public.app_users set auth_user_id = '<auth.users.id>', role = 'admin'
where email = 'admin@rockdesk.demo';
```

Copy the env template and fill it in:

```bash
cp .env.example .env
```

The web app needs its own file at `apps/web/.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Then run both sides in two terminals:

```bash
npm run dev:api   # http://localhost:4000
npm run dev:web   # http://localhost:3000
```

Checks I run before calling anything done:

```bash
npm run lint          # eslint, all workspaces
npm run typecheck     # strict tsc, all workspaces
npm run test:api      # vitest + supertest, 61 tests
```

## How it works

The chat is public. Opening `/chat` creates a session and hands the browser an opaque token. Only a hash of that token is stored, so a leaked database still does not expose sessions. Every message sends the token back in a header.

For each message the API sends one prompt to Groq: todays date, your timezone, the people who can be assigned, the recent conversation, the current draft, and your new message. The model must answer with JSON, which is checked with Zod. If the JSON is broken, the backend asks the model to fix it once. If that fails too, your message is kept and you get a plain error instead of a crash. If the primary Groq key fails, the same request is retried with a fallback key.

Then the backend takes over and the model is out of the picture:

- Assignees are matched against the people table. Zero matches or two matches both lead to a question, never a guess.
- Relative dates become real dates. A bare weekday means the coming one. A bare date like "the 4th" means the nearest future 4th, and the app confirms it with you first.
- Missing fields are recomputed every turn, and the reply asks one short question that covers all of them.
- Tickets are created in a single database call that also writes the activity event and clears the draft, so a retry can never create the ticket twice. Every message carries an idempotency id for the same reason.

Replies come back in your language. Titles are stored in English so the admin queue stays consistent, and your original message is always kept next to the ticket.

Replies stream in word by word over server sent events, from the same validated pipeline as the plain JSON endpoint. The model output is checked before anything is shown, so streaming never leaks an unvalidated answer. If the stream breaks halfway, the app retries with the same message id, which returns the stored result instead of making a second ticket.

Before a complete ticket is created, the backend compares its title against open tickets. On a close match it asks first and names the ticket number, with buttons to create anyway or discard. Yes, no, and create anyway phrasing all resolve the question, in every supported language.

The composer also has a microphone button that uses the browsers built in dictation and types what you say. Nothing is uploaded until you press send.

Admin sign in goes through Supabase Auth. The browser holds the JWT, the API checks it on every admin call and loads your role from the profiles table. Anything that is not an admin gets a 403.

## Project layout

```text
apps/web         Next.js + TypeScript + Tailwind, the chat and admin UI
apps/api         Express + TypeScript, the API that Vercel runs as functions
packages/shared  Zod schemas and types that both sides import
supabase/        SQL migrations in order, plus seed data
docs/            design notes, the API guide, and the demo script
```

## Environment variables

Web (`apps/web/.env.local`, these ship to the browser):

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `NEXT_PUBLIC_API_BASE_URL` | Where the API lives |

API (server only, never commit these):

| Variable | What it is |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Supabase secret key |
| `GROQ_API_KEY` | Primary LLM key |
| `GROQ_FALLBACK_API_KEY` | Optional, used automatically if the primary key fails |
| `LLM_MODEL` | Defaults to `qwen/qwen3.8-27b` |
| `APP_TIMEZONE_DEFAULT` | Defaults to `Asia/Kolkata` |
| `AI_RATE_LIMIT_PER_MINUTE` | Defaults to 20 |
| `CORS_ORIGINS` | Comma separated web origins |
| `PORT` | Local only, defaults to 4000 |

## API

Chat routes use the session token in the `X-Chat-Session-Token` header. Admin routes use a Bearer JWT.

| Method | Endpoint | Notes |
|---|---|---|
| `POST` | `/api/chat/sessions` | Start a session, returns id and token |
| `POST` | `/api/chat/message` | Send a message, returns the reply plus draft or ticket |
| `POST` | `/api/chat/stream` | Same as message, but the reply streams as server sent events, then a done frame with the full payload |
| `GET` | `/api/chat/sessions/by-id?sessionId=` | Full history for a session |
| `GET` | `/api/tickets` | Search, filters, pagination, newest first |
| `GET` | `/api/tickets/by-id?id=` | Ticket detail with activity |
| `PATCH` | `/api/tickets/by-id?id=` | Edit status, assignee, date, priority, tags |
| `DELETE` | `/api/tickets/by-id?id=` | Delete a ticket and its activity, admin only |
| `GET` | `/api/users` | Assignable people, optional search |
| `POST` | `/api/users` | Add a person, admin only |
| `GET` | `/api/auth/me` | Who the current token belongs to |

One deviation from the brief to be upfront about: there is no custom `POST /api/auth/login`. Login runs through Supabase Auth directly, which returns the JWT and hashes passwords for me. The API verifies that token and checks the role. It covers what the endpoint was meant to do.

## Assumptions

- The default model is `qwen/qwen3.8-27b` on Groq. The Llama 3.3 70b model was retired on their side.
- Chat needs no login. Only `/admin` does.
- "Friday" on its own means the coming Friday.
- "The 4th" means the nearest future 4th and is confirmed before the ticket is created.
- A title close to an open ticket triggers a create anyway question first.
- No notifications. That was cut to keep the core solid.

## Limitations

- Ticket search is a simple `ILIKE` query. Fine for demo size, would need full text search later.
- One pending draft per chat session, by design.
- The model gets 30 seconds. Slower answers come back as a safe error and your message is kept.

## CI

Every push runs lint, typecheck, and a production web build. API tests run too when the Supabase secrets are present, and skip gracefully when they are not, since they talk to a real database. The secrets the test job needs are `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `GROQ_API_KEY`.

## Docs

- `Complete_Documentation.md`, the full technical writeup including the demo walkthrough
- `docs/API-guide.md`, every route and its contract
- `docs/Architecture.md`, `docs/Database.md`, `docs/Deployment.md` for the rest
