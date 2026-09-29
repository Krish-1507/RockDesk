# Security and Privacy

## 1. Security Objective

The assignment is a small internal application, but it still handles authentication credentials, user records, conversation content, and AI credentials. The design should minimize accidental exposure and prevent the most obvious abuse paths.

---

## 2. Trust Boundaries

```text
Browser
  │
  │ user input + auth token
  ▼
Vercel web
  │
  ▼
Vercel Node/Express API
  │        │
  │        └──── LLM provider
  │
  └───────────── Supabase
               ├── Auth
               └── Postgres
```

Trust boundary rules:

- Browser input is untrusted.
- LLM output is untrusted.
- Supabase client responses are checked for errors.
- Admin role is untrusted until verified server-side.

---

## 3. Authentication

Use Supabase Auth email/password.

Do not implement a second password database.

Do not store plaintext passwords.

Do not store custom password hashes in application tables when Supabase Auth is used.

The API accepts a user access token and verifies it.

Use a clear `401` for missing/invalid credentials.

---

## 4. Authorization

Authentication answers "who are you?"

Authorization answers "what may you do?"

Admin routes must explicitly verify the application role.

Examples:

```text
GET /api/tickets         admin only for global list
PATCH /api/tickets/:id  admin only for admin edits
GET /api/users           authenticated users may read active assignees
POST /api/users          admin only
```

Do not infer admin access from the email address or frontend route.

---

## 5. Supabase Keys

Use the current Supabase key model.

Client-visible values may include:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Server-only secret values include:

```text
SUPABASE_SECRET_KEY
```

or the current equivalent secret credential shown in the Supabase project settings.

Never prefix a secret key with `NEXT_PUBLIC_`.

Never commit secrets.

---

## 6. LLM Secret

The LLM API key exists only in the API deployment environment.

Never:
- import the provider SDK with a client-visible key.
- include the key in frontend source.
- send the key to the browser.
- log the key.
- commit the key.

Use environment variables in Vercel.

---

## 7. RLS

Enable Postgres Row Level Security on application tables exposed through Supabase APIs.

Supabase's current guidance recommends enabling RLS on exposed tables and using policies to define granular row-level authorization.

Even when the Express backend uses a privileged server-side client for some operations, application authorization still happens in the API layer.

Security layers should be additive:

```text
API auth
  +
API authorization
  +
RLS where applicable
  +
DB constraints
```

Do not assume one layer makes the others unnecessary.

---

## 8. Input Validation

Validate:

- JSON body.
- Query parameters.
- Route IDs.
- Timezone.
- Search strings.
- Status/priority enums.
- User identifiers.
- LLM output.

Bound message length, for example:

```text
max user message length: 8,000 characters
max search length: 200 characters
max tags: 20
max tag length: 40
```

These are sensible starting limits; tune them if needed.

---

## 9. Prompt Injection

The application must treat user text as data, not instructions to the system.

System prompt rules must remain in a high-priority system/developer message supported by the chosen provider SDK.

Never construct a system prompt such that a user message can overwrite its core instructions.

Known users, timezone, required-field rules, and output schema must come from trusted application context.

The model must not be given an unrestricted database tool for this assignment.

---

## 10. LLM Output Safety

Never execute model-generated code.

Never execute generated SQL.

Never let the model call arbitrary HTTP endpoints.

Never allow the model to directly mutate the database.

The model returns structured data only.

---

## 11. Assignee Security

Assignee matching must be database-backed.

The LLM may suggest a candidate name.

The backend resolves that candidate.

Rules:

```text
0 matches -> clarification
1 exact unique match -> resolved
multiple matches -> clarification
explicit unassigned -> null
```

Do not let the model invent a UUID.

---

## 12. Date Security and Correctness

Dates must be resolved using server-known current time and an explicit timezone.

Do not accept arbitrary model-generated dates blindly.

The backend validates the final date representation.

Store ISO dates.

---

## 13. Rate Limiting

Protect `POST /api/chat/message` because every successful call may incur model cost.

For a 24-hour assignment, a simple per-user/per-IP bounded rate limiter is sufficient if persisted in a suitable store or implemented through a provider with serverless-safe state.

Because Vercel functions are ephemeral, do not use an in-memory `Map` as the production source of truth for rate limits.

For an even simpler implementation, use a server-side rate limiting service or a database-backed counter with a short time window.

Do not block the assignment on a sophisticated distributed limiter.

---

## 14. CORS

Allow only the deployed web origin and local development origin.

Example policy:

```text
http://localhost:3000
https://<web-vercel-domain>
```

Do not use `*` for authenticated application endpoints.

---

## 15. Headers

Set security-conscious headers where practical:

- Content-Type.
- Referrer-Policy.
- X-Content-Type-Options.
- Content-Security-Policy where feasible.
- Strict-Transport-Security in production.

Do not add a restrictive CSP that breaks the chosen Supabase/Auth flow without testing it.

---

## 16. CSRF

Because the API is designed around bearer tokens rather than ambient browser cookies for API authorization, CSRF risk is reduced compared with a cookie-only API.

If browser credentials are changed to cookies later, revisit CSRF protections.

---

## 17. Sensitive Logging

Never log:

- passwords.
- auth tokens.
- API keys.
- secret keys.
- session refresh tokens.
- full raw authorization headers.

Be cautious with raw chat messages. Conversation content may contain internal information. In production-style logging, prefer metadata and request IDs.

---

## 18. Database Constraints

Use constraints for:

- valid enum values.
- non-null required ticket title.
- valid foreign keys.
- sensible array sizes where practical.

Application validation is not a replacement for DB integrity.

---

## 19. Secrets and Environment Files

`.env.example` may contain variable names and safe placeholder values.

Never commit:

```text
.env
.env.local
production secrets
service-role keys
LLM API keys
```

Add secret patterns to `.gitignore` and, if practical, a secret-scanning hook/CI check.

---

## 20. Dependency Hygiene

- Use maintained package versions available at implementation time.
- Lock dependency versions through the chosen package manager lockfile.
- Avoid unnecessary dependencies.
- Run the package manager's audit/check tooling where practical.

Do not let dependency churn delay the core assignment.

---

## 21. Admin Safety

Admin edits should be explicit and constrained.

Do not accept arbitrary JSON fields and spread them into a database update.

Use an allowlist:

```text
status
assigneeId
dueDate
priority
tags
```

---

## 22. Public Demo Protection

Because the reviewer will access a live public URL:

- seed demo accounts.
- use non-sensitive sample data.
- set an LLM usage limit.
- rate-limit AI calls.
- do not expose internal Supabase dashboard links in the UI.
- do not expose stack traces.
- keep the demo account separate from personal accounts.

The brief requires demo credentials to remain active for at least 14 days after submission.

---

## 23. Security Verification Checklist

Before submission:

```text
[ ] LLM key is server-only
[ ] Supabase secret key is server-only
[ ] No secrets in Git history
[ ] Auth rejects invalid tokens
[ ] Admin routes reject member users
[ ] RLS is enabled for exposed tables
[ ] User messages have bounded length
[ ] AI output is schema-validated
[ ] Model cannot directly mutate DB
[ ] Assignee is resolved against DB
[ ] Ambiguous names never auto-resolve
[ ] Dates are normalized and validated
[ ] AI endpoint is rate-limited
[ ] CORS is restrictive
[ ] Errors do not expose stack traces
[ ] Logs do not contain secrets
```

---

## 24. Security Philosophy

The strongest security property of this application is not a complicated infrastructure diagram. It is a strict separation of authority:

> User input is untrusted. AI interpretation is untrusted. Backend rules decide. Database constraints enforce. Secrets stay server-side.
