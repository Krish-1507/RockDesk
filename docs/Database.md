# Database Design

## 1. Database Choice

Use **Supabase PostgreSQL**.

Reason: the application has relational entities and query patterns: users are assigned to tickets, tickets originate from chat messages, messages belong to sessions, and admin search/filter queries benefit from SQL joins and indexes.

Supabase provides PostgreSQL, Auth, generated APIs, and Row Level Security. Database migrations are kept in the repository under `supabase/migrations` and are the source of truth for schema changes.

---

## 2. Authentication Data Model

Do not store application password hashes in `app_users` when Supabase Auth is used.

Supabase Auth owns credentials.

The application stores profile/authorization data in `app_users`.

```text
Supabase auth.users
       │
       │ 1:1
       ▼
app_users
```

---

## 3. Tables

### 3.1 app_users

Purpose: assignable people plus application roles.

Fields:

```text
id               uuid PK
auth_user_id     uuid NULL UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL
name             text NOT NULL
email            text NOT NULL UNIQUE
role             enum('admin','member') NOT NULL DEFAULT 'member'
department       text NULL
active           boolean NOT NULL DEFAULT true
created_at       timestamptz NOT NULL DEFAULT now()
updated_at       timestamptz NOT NULL DEFAULT now()
```

`auth_user_id` links an application user to a Supabase Auth identity when that person can sign in. The assignable-user list does not require every assignee to have an Auth identity. This keeps the demo seed simple while preserving a clean identity boundary.

Recommended setup: create one dedicated demo admin Auth user and one corresponding `app_users` row with `role = 'admin'`. Seed the assignable people as `app_users` rows with `auth_user_id = null` unless the UI needs them to sign in.

---

### 3.2 chat_sessions

```text
id                   uuid PK
user_id                  uuid NULL REFERENCES app_users(id)
public_access_token_hash   text NOT NULL
pending_ticket       jsonb NULL
pending_state        text NOT NULL DEFAULT 'idle'
created_at           timestamptz NOT NULL DEFAULT now()
updated_at           timestamptz NOT NULL DEFAULT now()
```

`pending_state` values:

```text
idle
awaiting_clarification
ready_to_create
```

The JSON draft stores structured intermediate values that have already been understood but are not yet safe to persist as a ticket.

For the public chat surface, issue a high-entropy opaque session token when the session is created. Store only its hash in the database. The browser sends the opaque token on subsequent chat-session requests. This avoids requiring chat login while preventing simple session-ID enumeration.

Example:

```json
{
  "title": "Login page crashes on Safari",
  "description": "Safari users experience a crash on login.",
  "assigneeCandidate": "Rahul",
  "assigneeId": null,
  "dueDate": null,
  "priority": "Medium",
  "missingFields": ["assignee", "due_date"],
  "language": "en"
}
```

Never store raw model chain-of-thought.

---

### 3.3 chat_messages

```text
id                   uuid PK
session_id           uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE
role                 enum('user','assistant') NOT NULL
content              text NOT NULL
detected_language    text NULL
created_at           timestamptz NOT NULL DEFAULT now()
```

The original user message must remain unchanged.

For public chat sessions, the server associates messages with the session after validating the opaque session token.

For assistant messages, store the user-visible response, not internal prompt text.

---

### 3.4 tickets

```text
id                   uuid PK
ticket_number        bigint UNIQUE NOT NULL
organization_id      uuid NULL  -- reserve for future multi-tenancy, do not require for demo
 title                text NOT NULL
description          text NOT NULL
original_title        text NULL
assignee_id           uuid NULL REFERENCES app_users(id)
due_date             date NULL
priority              enum('Low','Medium','High','Urgent') NOT NULL DEFAULT 'Medium'
status                enum('Open','In Progress','Resolved') NOT NULL DEFAULT 'Open'
tags                  text[] NOT NULL DEFAULT '{}'
language              text NULL
source_message_id     uuid NULL REFERENCES chat_messages(id)
source_type           text NOT NULL DEFAULT 'chat'
created_by            uuid NULL REFERENCES app_users(id)
created_at            timestamptz NOT NULL DEFAULT now()
updated_at            timestamptz NOT NULL DEFAULT now()
```

Important policy:
- `assignee_id = null` is valid only when the user explicitly requests no assignment or a deliberate unassigned workflow is supported.
- `due_date = null` is valid only when the user explicitly says no deadline.

### Recommended constraint behavior

Use DB-level checks for enum-like fields so invalid values cannot be written accidentally.

---

### 3.5 ticket_events

Bonus-quality operational table, implemented in the core if time permits without delaying P0.

```text
id                   uuid PK
ticket_id             uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE
actor_id              uuid NULL REFERENCES app_users(id)
event_type            text NOT NULL
metadata              jsonb NOT NULL DEFAULT '{}'
created_at            timestamptz NOT NULL DEFAULT now()
```

Events:

```text
TICKET_CREATED
ASSIGNEE_CHANGED
DUE_DATE_CHANGED
PRIORITY_CHANGED
STATUS_CHANGED
TICKET_UPDATED
```

This supports a clean audit/activity timeline.

---

## 4. Relationships

```text
app_users
   │
   ├───────────────< chat_sessions
   │                     │
   │                     └────< chat_messages
   │                                  │
   │                                  └──── source for
   │                                         │
   └───────────────< tickets >──────────────┘
                         │
                         └────< ticket_events
```

---

## 5. Indexes

At minimum:

```sql
CREATE INDEX tickets_created_at_idx ON tickets (created_at DESC);
CREATE INDEX tickets_status_idx ON tickets (status);
CREATE INDEX tickets_assignee_idx ON tickets (assignee_id);
CREATE INDEX tickets_priority_idx ON tickets (priority);
CREATE INDEX tickets_due_date_idx ON tickets (due_date);
CREATE INDEX tickets_source_message_idx ON tickets (source_message_id);
CREATE INDEX chat_sessions_user_updated_idx ON chat_sessions (user_id, updated_at DESC);
CREATE INDEX chat_messages_session_created_idx ON chat_messages (session_id, created_at ASC);
```

For assignee matching, use a case-insensitive lookup strategy. A functional index can be added if justified.

Do not over-index a demo database.

---

## 6. Search and Filtering

Ticket list supports:

- text search by title/description/ticket number.
- status.
- assignee.
- priority.
- due date.
- pagination.
- newest-first ordering.

For a 24-hour assignment, use SQL `ILIKE` or Postgres full-text search only as needed. Do not introduce Elasticsearch or another search service.

---

## 7. Ticket Numbering

Use a database sequence for a human-readable `ticket_number`.

Example:

```text
#128
#129
#130
```

The UUID remains the internal primary key.

Do not derive ticket numbers in application memory.

---

## 8. Transaction Boundaries

Creating a ticket should happen atomically with the supporting records that must describe it.

Recommended transaction:

```text
validate final draft
  ↓
insert ticket
  ↓
insert ticket event
  ↓
update session pending state -> idle
```

The source chat message should already exist.

If any required write fails, do not tell the user the ticket was created.

If the chosen Supabase client path makes multi-statement transaction control awkward, use an appropriate Postgres function/RPC for the atomic creation path rather than pretending several client calls are one transaction.

---

## 9. RLS Strategy

Enable Row Level Security on exposed application tables.

Recommended policy model:

### Members
Can:
- Read own chat sessions/messages.
- Create/update their own sessions and messages through authenticated access.
- Create tickets through the backend workflow.

### Admins
Can:
- Read all tickets.
- Update tickets.
- Manage assignable users.
- Read relevant ticket activity.

Because the browser is intended to talk to the Express API for business operations, API authorization remains mandatory even when RLS exists.

Do not rely on `service_role`/secret-key access as a substitute for application authorization.

If a server-side privileged client bypasses RLS, enforce the same authorization in the API service layer and keep the credential server-only.

---

## 10. Migrations

Create ordered SQL migrations:

```text
001_extensions_and_types.sql
002_app_users.sql
003_chat_sessions.sql
004_chat_messages.sql
005_tickets.sql
006_ticket_events.sql
007_indexes.sql
008_rls_policies.sql
009_seed_support.sql if desired
```

The exact numbering may differ, but migration order must be deterministic.

Never modify an already-applied migration to change production schema. Add a new migration.

---

## 11. Seed Data

Seed:

- Admin account/profile.
- Rahul Sharma.
- Rahul Verma.
- Priya Menon.
- Amit Kumar.
- Neha Singh.
- A few sample tickets for the admin UI if useful.

The demo seed must not contain personal credentials.

---

## 12. Retention and Logging

Do not store LLM provider request payloads as a long-term audit log by default.

Store the business-relevant user message and ticket fields.

Application logs should be short-lived and should exclude secrets.

---

## 13. Data Invariants

- Every ticket has exactly one normalized title.
- Every ticket has a source type.
- Every user-facing ticket is traceable to a source message when created through chat.
- Every pending ticket belongs to one session.
- A session may have at most one active pending ticket.
- Ticket status uses only the approved enum values.
- Priority uses only approved enum values.
- An assignee must reference a real `app_users.id`.
