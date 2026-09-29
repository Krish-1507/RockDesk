# API Guide

## 1. Base URL

Development:

```text
http://localhost:<API_PORT>
```

Production:

```text
https://<api-vercel-domain>
```

The web application reads the API base URL from an environment variable.

Recommended:

```text
NEXT_PUBLIC_API_BASE_URL
```

Do not embed a production URL directly in components.

---

## 2. Authentication

Admin-protected API requests use:

```http
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

The frontend obtains the access token through Supabase Auth.

The API must reject missing/invalid admin credentials with `401` and reject authenticated non-admin users with `403`.

The chat endpoints are public by default. They use a high-entropy opaque `sessionToken` issued by the server when a session is created. Only its hash is stored in Postgres. The token is presented in a dedicated header such as `X-Chat-Session-Token`. Do not accept a raw session UUID as the sole authorization mechanism.

---

## 3. Response Conventions

Successful JSON responses use:

```json
{
  "data": {}
}
```

Errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be processed.",
    "details": []
  }
}
```

Never return stack traces.

---

## 4. Health

### GET /health

Purpose: deployment smoke test.

Response:

```json
{
  "status": "ok"
}
```

No authentication required.

---

## 5. Auth

Supabase Auth performs the actual email/password sign-in. The API does not implement password hashing or a second credential store.

If an explicit application endpoint is desired:

### GET /api/auth/me

Returns the current application user/profile.

Response:

```json
{
  "data": {
    "id": "uuid",
    "name": "Krish",
    "email": "demo@example.com",
    "role": "admin"
  }
}
```

---

## 6. Chat API

### POST /api/chat/sessions

Creates a public chat session.

Response:

```json
{
  "data": {
    "sessionId": "uuid",
    "sessionToken": "opaque-high-entropy-token"
  }
}
```

The frontend keeps the opaque token for the current chat session. It must not expose or log it unnecessarily.

### POST /api/chat/message

Purpose: send one user message and continue the current ticket-construction workflow.

Required headers:

```http
X-Chat-Session-Token: <opaque-session-token>
Content-Type: application/json
```

Request:

```json
{
  "sessionId": "uuid",
  "message": "Login page crashes on Safari, Rahul will fix it by Friday.",
  "timezone": "Asia/Kolkata",
  "clientMessageId": "uuid"
}
```

Validation:
- `sessionId` must be a valid UUID belonging to the caller.
- `message` must be a non-empty bounded string.
- `timezone` must be a valid IANA timezone.
- `clientMessageId` should be unique per user/session submission when provided.

Response when clarification is needed:

```json
{
  "data": {
    "sessionId": "uuid",
    "assistantMessage": {
      "id": "uuid",
      "content": "Who should I assign this to?",
      "detectedLanguage": "en"
    },
    "state": "awaiting_clarification",
    "draft": {
      "title": "Login page crashes on Safari",
      "description": "...",
      "assignee": null,
      "dueDate": null,
      "priority": "Medium",
      "missingFields": ["assignee"]
    },
    "ticket": null
  }
}
```

Response when ticket is created:

```json
{
  "data": {
    "sessionId": "uuid",
    "assistantMessage": {
      "id": "uuid",
      "content": "Ticket #128 created.",
      "detectedLanguage": "en"
    },
    "state": "idle",
    "draft": null,
    "ticket": {
      "id": "uuid",
      "ticketNumber": 128,
      "title": "Login page crashes on Safari",
      "assignee": {
        "id": "uuid",
        "name": "Rahul Sharma"
      },
      "dueDate": "2026-10-02",
      "priority": "Medium",
      "status": "Open"
    }
  }
}
```

Response for cancellation:

```json
{
  "data": {
    "sessionId": "uuid",
    "assistantMessage": {
      "id": "uuid",
      "content": "Understood. I discarded the pending ticket.",
      "detectedLanguage": "en"
    },
    "state": "idle",
    "draft": null,
    "ticket": null
  }
}
```

---

## 7. Chat Session API

### GET /api/chat/sessions/:id

Returns:
- session metadata.
- message history.
- pending draft.

Authorization: valid `X-Chat-Session-Token` for the session, or admin bearer token for administration.

---

## 8. Ticket API

### GET /api/tickets

Query parameters:

```text
search
status
assigneeId
priority
dueFrom
dueTo
page
pageSize
sort
```

Default:

```text
page=1
pageSize=20
sort=newest
```

Response:

```json
{
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "total": 128,
    "totalPages": 7
  }
}
```

### GET /api/tickets/:id

Returns complete ticket detail including source message and relevant activity.

### PATCH /api/tickets/:id

Allowed update fields:

```json
{
  "status": "In Progress",
  "assigneeId": "uuid",
  "dueDate": "2026-10-04",
  "priority": "High",
  "tags": ["safari", "login"]
}
```

Do not accept arbitrary columns from the client.

### DELETE /api/tickets/:id

Delete only if included in the final implementation. If implemented, admin-only is preferred.

---

## 9. User API

### GET /api/users

Returns active assignable users.

Optional query:

```text
search=rahul
```

### POST /api/users

Admin only.

Request:

```json
{
  "name": "Amit Kumar",
  "email": "amit@example.com",
  "department": "Backend"
}
```

If the implementation links users to Supabase Auth identities, create the auth identity using a server-side admin operation and never expose the secret key.

---

## 10. Status Codes

```text
200 success
201 created
204 success without body
400 malformed/invalid request
401 unauthenticated
403 authenticated but not authorized
404 resource not found
409 conflict/idempotency collision
422 semantically invalid request when useful
429 rate limited
500 unexpected server error
502 provider integration failure when appropriate
504 upstream timeout when appropriate
```

---

## 11. Idempotency

`clientMessageId` is strongly recommended for `POST /api/chat/message`.

The API should prevent duplicate processing when a client retries because of a network timeout.

Possible strategy:

```text
unique(session_id, client_message_id)
```

where the column exists on user messages.

If this is too invasive for the 24-hour build, document the limitation and make sure the UI disables repeated sends while the request is in flight.

---

## 12. AI Internal Contract

The AI layer should return a domain object shaped approximately as:

```ts
interface TicketAnalysisResult {
  intent: 'create_ticket' | 'general_chat' | 'cancel_pending_ticket';
  status: 'complete' | 'needs_clarification';
  normalizedEnglishTitle: string | null;
  description: string | null;
  assigneeCandidate: string | null;
  assigneeResolution: 'resolved' | 'ambiguous' | 'not_found' | 'explicitly_unassigned' | 'unknown';
  resolvedAssigneeId: string | null;
  dueDate: string | null;
  dueDateResolution: 'resolved' | 'ambiguous' | 'no_deadline' | 'unknown';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  tags: string[];
  language: string;
  missingFields: string[];
  userResponse: string;
}
```

This is an implementation contract, not a claim that the LLM should be trusted to populate every field correctly. Database-dependent values are resolved by backend code.

---

## 13. AI Prompt Input

The AI service should receive:

- current ISO timestamp.
- current date in configured timezone.
- IANA timezone.
- known assignable users.
- recent conversation.
- current pending draft.
- latest user message.
- explicit business rules from the prompt.

Do not send unbounded chat history.

---

## 14. API Security Rules

- All protected endpoints verify Supabase auth.
- Admin routes verify role.
- Request body size is bounded.
- Rate limiting is applied to AI-triggering endpoints.
- Secrets never appear in frontend bundles.
- CORS is restrictive.
- Error details are sanitized.

---

## 15. Frontend API Client

Create one client module:

```text
apps/web/lib/api/client.ts
```

Responsibilities:
- add auth header.
- serialize query parameters.
- parse standard response shape.
- normalize API errors.
- handle 401 session expiry.

Do not scatter raw `fetch()` calls throughout the UI.
