# Chat-to-Ticket Architecture

## 1. Architectural Decision

Build a small, explicit full-stack application with a clear separation between presentation, API/business logic, AI interpretation, authentication, and persistence.

### Deployment topology

```text
                    VERCEL
        ┌───────────────────────────┐
        │ Next.js web application   │
        │                           │
        │ /chat                     │
        │ /admin                    │
        └─────────────┬─────────────┘
                      │ HTTPS + Bearer JWT
                      ▼
        ┌───────────────────────────┐
        │ Express + TypeScript API  │
        │ Vercel Node.js runtime    │
        │                           │
        │ Auth middleware           │
        │ Chat orchestration        │
        │ Ticket service            │
        │ User service              │
        │ AI service                │
        │ Validation                │
        └───────┬─────────┬─────────┘
                │         │
                ▼         ▼
        ┌────────────┐  ┌──────────────┐
        │ Supabase   │  │ LLM Provider │
        │ PostgreSQL │  │ via AI layer │
        │ Auth       │  └──────────────┘
        │ RLS        │
        └────────────┘
```

Vercel currently supports Node.js functions and Express applications. Vercel can turn an Express application into a serverless function, and its Node.js runtime supports TypeScript. For a separate Node backend beside Next.js, Vercel documents multi-service deployment. This project may use two Vercel projects for the clearest 24-hour path: one for web and one for API, both from the same repository/monorepo.

---

## 2. Why this architecture

### Why Supabase

The data model is strongly relational:
- Users are assigned to tickets.
- Tickets reference source messages.
- Messages belong to chat sessions.
- Sessions belong to authenticated users.

PostgreSQL handles this naturally and gives straightforward search, filtering, joins, constraints, indexes, and transactional writes.

### Why Express

The assignment explicitly specifies Node.js with Express, Fastify, or NestJS as the backend. Express is familiar, small, and easy to deploy on Vercel.

### Why Next.js

It provides the requested TypeScript frontend, routing, rendering, and a strong deployment path on Vercel without requiring a separate frontend host.

### Why a separate API layer

The application needs server-controlled business logic for:
- LLM invocation.
- Secret management.
- Structured-output validation.
- Assignee resolution.
- Date validation.
- Pending draft state.
- Ticket creation.
- Admin authorization.

The browser should not own these rules.

---

## 3. Runtime Constraints

Because the Express API is deployed on Vercel's Node.js/serverless model:

- Never rely on in-memory workflow state.
- Never rely on local filesystem persistence.
- Never assume one process stays warm.
- Never use module-level mutable objects as the source of truth for sessions, drafts, tickets, or rate limits.
- Every request must be independently reconstructible from authenticated identity and database state.

Database state is authoritative.

For Postgres connections from serverless functions, use the appropriate Supabase pooled connection mode if a raw database driver is used. Prefer the Supabase JavaScript client for this assignment to reduce connection-management complexity.

---

## 4. Monorepo Structure

```text
chat-to-ticket/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── chat/
│   │   │   ├── admin/
│   │   │   ├── login/
│   │   │   └── api-client helpers only
│   │   ├── components/
│   │   ├── lib/
│   │   ├── hooks/
│   │   ├── styles/
│   │   └── package.json
│   │
│   └── api/
│       ├── src/
│       │   ├── config/
│       │   ├── controllers/
│       │   ├── middleware/
│       │   ├── routes/
│       │   ├── services/
│       │   │   ├── ai/
│       │   │   ├── auth/
│       │   │   ├── chat/
│       │   │   ├── tickets/
│       │   │   └── users/
│       │   ├── repositories/
│       │   ├── schemas/
│       │   ├── prompts/
│       │   ├── utils/
│       │   └── index.ts
│       ├── tests/
│       └── package.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── schemas/
│       │   ├── types/
│       │   └── constants/
│       └── package.json
│
├── supabase/
│   ├── migrations/
│   └── seed.sql
│
├── docs/
├── .env.example
├── package.json
├── pnpm-workspace.yaml or npm workspaces
└── README.md
```

Choose one package manager and commit its lockfile. Do not mix package managers.

---

## 5. Layer Responsibilities

### Web
Responsible for:
- Rendering UI.
- Local UI state.
- Calling API.
- Displaying server state.
- Auth session management.
- Accessibility.

Not responsible for:
- Direct ticket creation logic.
- Assignee matching.
- Date interpretation authority.
- LLM key handling.
- Admin authorization decisions.

### API
Responsible for:
- Authentication.
- Authorization.
- Input validation.
- Session/message orchestration.
- AI calls.
- Business rules.
- DB writes.
- Error normalization.

### AI service
Responsible for:
- Language understanding.
- Structured extraction.
- Intent classification.
- Draft interpretation.
- Human-language clarification wording.

Not responsible for:
- Final authorization.
- Direct database mutation.
- Selecting an assignee from ambiguous database matches.
- Persisting tickets.

### Repository/data layer
Responsible for:
- Supabase queries.
- Consistent data access.
- Mapping DB rows to typed domain objects.

### Database
Responsible for:
- Persistence.
- Foreign keys.
- Check constraints.
- Indexes.
- RLS.
- Transaction boundaries where needed.

---

## 6. AI Request Lifecycle

```text
POST /api/chat/message
        │
        ▼
Authenticate caller
        │
        ▼
Validate request body
        │
        ▼
Load session + recent conversation + pending draft
        │
        ▼
Load assignable users
        │
        ▼
Build AI input:
- system instructions
- current date
- timezone
- user list
- conversation
- pending draft
- latest message
        │
        ▼
Generate structured model output
        │
        ▼
Validate output schema
        │
   invalid? retry once
        │
        ▼
Business validation
        │
        ├── non-ticket -> assistant reply only
        ├── cancellation -> clear draft
        ├── clarification -> save draft + assistant reply
        └── complete -> create ticket in transaction
                              │
                              ▼
                       save source message
                              │
                              ▼
                       save ticket event
                              │
                              ▼
                       return confirmation
```

---

## 7. Authentication Model

Use Supabase Auth for email/password authentication.

The admin surface signs in with Supabase Auth using email/password. The resulting access token is sent to the API as:

```http
Authorization: Bearer <access-token>
```

The Express API verifies admin credentials and loads the application profile from `app_users`.

The chat surface is public by default because the brief only requires the admin area to be login-protected. Public chat sessions use an unguessable opaque session token; the database stores only a hash of that token. This allows chat without an account while still isolating sessions.

Authorization is decided by the API before privileged operations.

For current Supabase server runtimes, `@supabase/server` is the first-party package intended for request-header-based auth in Vercel and similar environments. If its Express adapter adds unnecessary complexity, use the documented lower-level primitives with the same security model.

---

## 8. AI Provider Abstraction

Use a domain interface:

```ts
export interface AIProvider {
  analyzeTicket(input: TicketAnalysisInput): Promise<TicketAnalysisResult>;
}
```

The provider adapter may use a current LLM SDK or Vercel AI SDK.

Recommended implementation pattern:

```text
AIProvider
   │
   └── StructuredAIProvider
         │
         └── provider SDK
```

The application should not import provider-specific SDKs outside this adapter module.

---

## 9. Reliability Strategy

### Invalid model output
- Validate with Zod.
- Retry once with a compact repair instruction.
- On second failure return a friendly error.

### LLM timeout
- Bound the request with an application timeout.
- Return a recoverable error.
- Keep the user's message stored before the AI call where practical so the interaction is not silently lost.

### Database failure
- Do not claim a ticket was created if persistence failed.
- Return a user-safe error.
- Log server-side details with a request ID.

### Duplicate submissions
- Support a client-generated message id or idempotency key for chat submissions.
- The same logical user submission should not create two tickets if the browser retries.

---

## 10. Observability

Every API request gets a request ID.

Useful structured log fields:

```text
requestId
userId
sessionId
route
statusCode
durationMs
aiProvider
aiAttempt
operation
errorCode
```

Never log:
- Access tokens.
- Supabase secret keys.
- LLM API keys.
- Passwords.
- Raw sensitive payloads unless explicitly needed for safe debugging in local development.

---

## 11. Performance Targets

These are engineering targets, not hard guarantees:

- API validation path should be fast and deterministic.
- Ticket list should paginate instead of loading all records.
- Search/filter queries should be indexed.
- Chat history should load the minimum useful context, not an unbounded transcript.
- AI prompt should contain a bounded recent conversation plus the pending draft.
- UI should optimistically show the sent message while the AI request is processing, but only mark a ticket created after server confirmation.

---

## 12. Architecture Invariants

Never violate these without documenting the reason:

1. Browser never receives the LLM secret.
2. Browser never decides whether a ticket is complete.
3. LLM never writes to the database directly.
4. Assignee identity must resolve against database users.
5. Ambiguity cannot be silently converted into certainty.
6. Pending state lives in Postgres.
7. Password hashes are not stored in application tables when Supabase Auth is used.
8. Ticket source message is preserved.
9. P0 behavior is covered by tests.
10. Deployment must work over HTTPS.
