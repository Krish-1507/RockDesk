# Deployment Runbook (RockDesk on Vercel)

Two projects, one repo (`https://github.com/Krish-1507/RockDesk`).

## API — `rockdesk-api` (classic project, Root Directory `apps/api`)

- Install is plain `npm install`. The `@chat-to-ticket/shared` workspace
  dependency resolves from the committed `apps/api/vendor/shared` copy
  (synced from `packages/shared` by `scripts/sync-shared-vendor.mjs`, which
  runs automatically before local dev/test/build/bundle).
- Build compiles shared + api (`scripts/vercel-api-build.mjs`, location-
  anchored so it works from any builder cwd).
- Routing: one function file per route under `api/` (`health.mjs`,
  `chat/sessions.mjs`, `chat/message.mjs`, `tickets/index.mjs`,
  `users/index.mjs`, `auth/me.mjs`, plus static `by-id` aliases for detail
  routes). **This host setup skips dynamic-segment files** (`[id].mjs`,
  `[...all].mjs` never match) — detail routes therefore ship as static
  `by-id` aliases backed by additive Express routes that read the id from
  the query string (`GET/PATCH/DELETE /api/tickets/by-id?id=`,
  `GET /api/chat/sessions/by-id?sessionId=`). The `/:id` variants remain for
  local dev. The web client uses the `by-id` variants.
- Do NOT use an esbuild ESM bundle here: `debug` (via `body-parser` via
  Express) dynamic-requires builtins and crashes ESM lambda init. Native
  `@vercel/node` tracing of `api/*.mjs` + committed `vendor/` is the
  working combination.
- Env (Production + Preview, server-only): `SUPABASE_URL`,
  `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `GROQ_API_KEY`,
  `GROQ_FALLBACK_API_KEY`, `LLM_MODEL`, `APP_TIMEZONE_DEFAULT`,
  `AI_RATE_LIMIT_PER_MINUTE`, `CORS_ORIGINS=https://<web-domain>`.
- Smoke test: `GET https://rockdesk-api.vercel.app/api/health` → `{"status":"ok"}`.

## Web — `rockdesk-iota` (services project, web service, `apps/web`)

- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_API_BASE_URL=https://rockdesk-api.vercel.app`.
- `NEXT_PUBLIC_*` values bake in at build time: after changing them,
  redeploy WITHOUT build cache.
- The root `vercel.json` keeps only the web service (catch-all rewrite).
  The old api service + `/api/*` rewrite were removed once the API moved
  to its own project.

## Supabase

`supabase link`, `supabase db push`, `supabase db query --linked -f supabase/seed.sql`,
create + link the admin Auth user (`admin@rockdesk.demo`). Demo credentials
must stay active ≥ 14 days after submission.
