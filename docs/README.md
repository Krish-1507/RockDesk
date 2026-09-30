# PyRock Chat-to-Ticket Implementation Pack

This folder holds the product and technical reference documents for the
PyRock Chat-to-Ticket assignment: what the product does, how it is designed,
how it is built, and how it is deployed.

## Files

1. `PRD.md` - product goals, users, features, acceptance criteria.
2. `Design-System.md` - UI design language, tokens, layout, typography, motion, anti-slop rules.
3. `Architecture.md` - application structure, runtime boundaries, services, auth, AI architecture.
4. `Code-Style.md` - TypeScript, API, React, testing, and naming conventions.
5. `Database.md` - PostgreSQL schema, relationships, indexes, migrations, RLS.
6. `API-guide.md` - API routes, contracts, authentication, status codes.
7. `AppFlow_Working.md` - end-to-end state machine and acceptance flows.
8. `Security.md` - authentication, authorization, secrets, RLS, rate limits, input/output safety.

For the full picture in one place, including the demo walkthrough, see
`Complete_Documentation.md` at the repo root.

## Core architecture

```text
Next.js + TypeScript
        |
        | HTTPS + bearer token
        v
Express + TypeScript on Vercel
        |
        +---- Supabase PostgreSQL/Auth
        |
        +---- LLM provider via AI abstraction
```

For the smoothest reviewer experience, chat is public by default and the admin surface is login-protected. Public chat sessions are isolated with opaque high-entropy session tokens.

The application authority model is:

> The LLM interprets. The backend validates and decides. The database persists. The UI explains.

## Important current platform notes

- Vercel supports Node.js runtime functions and Express deployment, including TypeScript server code.
- Supabase provides PostgreSQL, Auth, and Row Level Security.
- Supabase documents `@supabase/server` for request-header-based auth in Vercel-like server runtimes and `@supabase/ssr` for cookie-based Next.js SSR.
- The current Taste Skill repository's default design skill is `design-taste-frontend` (v2 experimental). This pack uses conservative design dials suitable for an operations dashboard.

Always verify provider-specific package APIs against the current documentation when coding because these libraries evolve.
