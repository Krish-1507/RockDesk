# PyRock Chat-to-Ticket Implementation Pack

This folder contains the implementation source-of-truth documents for the PyRock Chat-to-Ticket assignment.

## Files

1. `PRD.md` - product goals, users, features, acceptance criteria.
2. `Design-System.md` - UI design language, tokens, layout, typography, motion, anti-slop rules.
3. `Architecture.md` - application structure, runtime boundaries, services, auth, AI architecture.
4. `Agents.md` - coding-agent execution instructions and definition of done.
5. `Code-Style.md` - TypeScript, API, React, testing, and naming conventions.
6. `Database.md` - PostgreSQL schema, relationships, indexes, migrations, RLS.
7. `API-guide.md` - API routes, contracts, authentication, status codes.
8. `ImplementationPlan.md` - 24-hour build order and scope triage.
9. `AppFlow_Working.md` - end-to-end state machine and acceptance flows.
10. `Security.md` - authentication, authorization, secrets, RLS, rate limits, input/output safety.
11. `ONE_SHOT_AGENT_PROMPT.md` - ready-to-paste execution prompt for the coding agent.

## Recommended agent instruction

Tell the coding agent:

```text
Read every file in docs/ before changing code. Treat the documents as the implementation contract. Then inspect the repository, install dependencies, implement the application end to end, run tests/typecheck/lint/build, and deploy it. Do not stop at scaffolding or placeholders. Make reasonable non-blocking assumptions and document them in README.md. Keep the PyRock brief's P0 requirements ahead of all bonus features.
```

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
