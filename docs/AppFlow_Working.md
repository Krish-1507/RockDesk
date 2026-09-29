# App Flow and Working Specification

## 1. Global State Model

The core workflow is a small state machine.

```text
IDLE
  │
  │ user sends message
  ▼
ANALYZING
  │
  ├── general_chat ─────────────► IDLE
  │
  ├── cancel ───────────────────► IDLE
  │
  ├── incomplete/ambiguous ─────► AWAITING_CLARIFICATION
  │
  └── complete ─────────────────► CREATING
                                      │
                                      ▼
                                   CREATED
                                      │
                                      ▼
                                     IDLE
```

The persistent state belongs to `chat_sessions.pending_state` and `pending_ticket`.

---

## 2. Flow A: Complete Ticket

User:

> Checkout page is throwing 500 errors for some users. Priya will fix it by Friday, high priority.

### Step 1
Persist user message.

### Step 2
Load:
- conversation context.
- timezone.
- current date.
- assignable users.

### Step 3
AI structured result:

```text
intent = create_ticket
status = complete
language = en
title = Checkout page throwing 500 errors
description = ...
assigneeCandidate = Priya
dueDate = relative Friday
priority = High
```

### Step 4
Backend resolves:

```text
Priya -> exact/unique database user
Friday -> absolute date in configured timezone
```

### Step 5
Create ticket.

### Step 6
Return:

> Ticket #128 created. Checkout page throwing 500 errors | Assignee: Priya | Due: Oct 2, 2026 | Priority: High

### Step 7
UI displays structured confirmation card.

---

## 3. Flow B: Missing Assignee

User:

> Login page crashes on Safari, this will be resolved by Friday.

AI result:

```text
status = needs_clarification
missing = [assignee]
```

Backend stores pending draft.

Assistant:

> Who should I assign this to?

User:

> Rahul Sharma.

New analysis receives both:
- old pending draft.
- new answer.

Backend resolves Rahul Sharma uniquely.

If date was already clear:

```text
create ticket
clear pending state
```

---

## 4. Flow C: Missing Assignee + Date

User:

> Login page crashes on Safari.

Assistant:

> Who should I assign this to, and when should it be due?

Pending draft:

```json
{
  "title": "Login page crashes on Safari",
  "missingFields": ["assignee", "due_date"]
}
```

User:

> Rahul, Friday.

AI merges the response into the draft.

Backend resolves Rahul and Friday.

Ticket is created.

---

## 5. Flow D: Ambiguous First Name

Known users:

```text
Rahul Sharma - Backend
Rahul Verma - Frontend
```

User:

> Search results are wrong, Rahul to fix by tomorrow.

AI detects:

```text
assigneeCandidate = Rahul
```

Backend searches database.

Two matches.

Do not create the ticket.

Return assistant message:

> I found two people named Rahul. Which one should I assign: Rahul Sharma (Backend) or Rahul Verma (Frontend)?

Optional UI enhancement:
- Show both as clickable selection cards.

When the user selects Rahul Sharma:

```text
pending draft + selected user
        ↓
create ticket
```

---

## 6. Flow E: Assignee Not Found

User:

> Amitabh will fix the checkout issue by Friday.

No database match.

Assistant:

> I couldn't find Amitabh in the assignable users. Who should I assign this to?

Optionally show current users.

Do not silently use a similar name.

---

## 7. Flow F: Explicit Unassigned

User:

> Create a ticket for the login issue, due tomorrow, but leave it unassigned.

AI:

```text
assigneeResolution = explicitly_unassigned
```

Backend accepts `assignee_id = null`.

Ticket can be created.

Assistant:

> Ticket #131 created. Login issue | Unassigned | Due: Sep 30, 2026 | Priority: Medium

---

## 8. Flow G: Explicit No Deadline

User:

> Create a ticket for the login issue, assign it to Rahul, no deadline.

Backend accepts `due_date = null`.

Do not ask for a date.

---

## 9. Flow H: Date Ambiguity

Current date example:

```text
2026-09-29
Timezone: Asia/Kolkata
```

User:

> Login issue should be fixed by the 4th.

Because the month can be ambiguous, ask:

> Did you mean 4 October 2026?

If the user confirms:

> Yes.

Merge the confirmation and continue.

The backend must not make a date decision that contradicts the user's explicit correction.

---

## 10. Flow I: Relative Dates

Support:

- today.
- tomorrow.
- next Monday.
- next Friday.
- this Friday.
- end of week.
- by Friday.
- by the 4th.

The current date and timezone are always part of the AI input.

For final storage, use an ISO date `YYYY-MM-DD`.

Do not store phrases such as `tomorrow` in `tickets.due_date`.

---

## 11. Flow J: Multilingual

### Hindi

Input:

> Safari pe login page crash ho raha hai, Rahul Friday tak fix karega.

Expected:
- language = Hindi or appropriate language code.
- English normalized title.
- Rahul resolved against database.
- Friday absolute date.
- Hindi/Hinglish assistant response.

### Spanish

> La página de pago falla para algunos usuarios. Priya lo arreglará el viernes.

Same behavior.

### Arabic

Preserve the original Arabic text in `chat_messages.content` and return the assistant response in Arabic.

### Chinese

Same behavior.

### Hinglish

Keep the natural mixed-language response, while normalized admin data remains English.

---

## 12. Flow K: Non-Ticket

User:

> Hello

AI intent:

```text
general_chat
```

Assistant:

> Hi. Tell me about an issue or task and I can turn it into a ticket.

No ticket.

---

## 13. Flow L: Cancellation

User:

> The search page is broken.

Assistant asks for missing fields.

User:

> Never mind.

AI intent:

```text
cancel_pending_ticket
```

Backend:

```text
pending_ticket = null
pending_state = idle
```

Assistant:

> Understood. I discarded the pending ticket.

No ticket is created.

---

## 14. Flow M: Clarification Answers Are Contextual

User:

> Login is broken.

Assistant:

> Who should I assign this to, and when should it be due?

User:

> Rahul and tomorrow.

The second message should not be treated as an unrelated new ticket. It updates the pending draft.

This is one of the most important behaviors in the app.

---

## 15. Flow N: Admin Editing

Admin opens ticket #128.

Changes status:

```text
Open -> In Progress
```

API validates enum.

DB update persists.

Optional event:

```text
STATUS_CHANGED
metadata = {
  "from": "Open",
  "to": "In Progress"
}
```

UI refreshes or updates local query cache.

---

## 16. Flow O: Error During AI Request

User sends message.

AI timeout.

Backend:
- stores the user message.
- retains pending draft if one exists.
- does not create ticket.
- logs error.

Assistant:

> I couldn't process that right now. Your message is safe. Please try again.

Do not expose provider internals.

---

## 17. Flow P: Invalid Structured Output

Provider returns malformed data.

Backend:

```text
parse
  ↓
Zod validation fails
  ↓
retry once
  ↓
if still invalid -> user-safe error
```

Do not crash the route.

---

## 18. Flow Q: Production Retry / Duplicate Send

Browser submits a message.

Network times out before response.

User retries.

The server uses `clientMessageId` to detect that the same user submission was already accepted.

Return the existing outcome where practical rather than creating two tickets.

---

## 19. State Invariants

At all times:

1. A ticket cannot be created with unresolved required fields.
2. A pending draft belongs to one session.
3. A clarification response updates the existing draft.
4. Cancellation clears only the active pending draft.
5. Admin ticket edits do not alter original chat history.
6. Original user messages are never rewritten.
7. Ticket numbers are assigned by the database.
8. Database state is authoritative over in-memory UI state.

---

## 20. UI State Mapping

```text
API state                 UI state
-----------------------------------------------
idle                      normal chat
analyzing                 assistant typing/loading
awaiting_clarification   clarification message + draft rail
creating                 disabled send + progress state
created                  confirmation card
error                    recoverable error message
```

---

## 21. Acceptance Test Script

Run these manually on the deployed application before submission.

```text
A. "Checkout page is throwing 500 errors for some users. Priya will fix it by Friday, high priority."
B. "Login page crashes on Safari, this will be resolved by the 4th."
C. "Rahul, yes October."
D. "Search results are wrong, Rahul to fix by tomorrow."
E. Hindi input
F. Hinglish input
G. Spanish input
H. Arabic input
I. Chinese input
J. "hello"
K. "forget it"
L. admin status edit
M. admin search
N. admin assignee filter
O. admin priority filter
P. admin due-date filter
```
