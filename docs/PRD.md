# Chat-to-Ticket
## Product Requirements Document

**Assignment:** PyRock Mid-level Full Stack Engineer take-home
**Build window:** 24 hours from receipt of the brief
**Document status:** Implementation-ready source of truth
**Primary objective:** Ship a reliable, deployed, end-to-end product that turns natural-language chat into clean, trackable tickets.

---

## 1. Product Summary

Chat-to-Ticket is an AI-powered internal ticketing application. A user describes an issue or task naturally in a chat interface. The system understands the message, extracts ticket fields, asks for missing or ambiguous information, and creates a structured ticket only when the required information is sufficiently known.

The product must support normal English, non-Latin scripts, mixed-language messages, relative dates, ambiguous people, cancellations, and ordinary non-ticket conversation.

The application has two primary surfaces:

1. **Chat workspace** for creating tickets conversationally.
2. **Admin workspace** for searching, filtering, reviewing, editing, and managing tickets and assignable users.

The assignment's required flow is chat -> clarification when needed -> ticket creation -> admin visibility. That end-to-end reliability is more important than optional bonus features.

---

## 2. Problem

Teams often report issues in chat, for example:

> Login is broken on Safari, Rahul will fix it by the 4th.

Someone normally has to translate that conversation into a ticket manually. That creates friction, inconsistent formatting, forgotten fields, and avoidable ambiguity.

Chat-to-Ticket removes the manual transcription step while preserving human control where the source message is incomplete or ambiguous.

---

## 3. Target Users

### 3.1 Chat user
A team member who wants to report an issue or task without opening a conventional ticket form.

Needs:
- Fast natural-language input.
- No rigid form before typing.
- Follow-up questions only when necessary.
- Responses in the language they used.
- Clear confirmation when a ticket is created.

### 3.2 Admin
A person responsible for monitoring and maintaining tickets.

Needs:
- Reliable structured ticket data.
- Search and filters.
- Status and field editing.
- Ticket detail view with source context.
- User management for assignee matching.

---

## 4. Product Goals

### Must achieve

- Convert normal chat messages into structured tickets.
- Never invent an assignee or deadline.
- Ask for all missing required fields in one short clarification message.
- Detect ambiguous assignees and ask the user to choose.
- Resolve relative dates against the current date and configured timezone.
- Support any natural language, including mixed-language input.
- Preserve the original user message and original-language content.
- Store a normalized English title for admin consistency.
- Persist pending ticket state across multiple chat turns.
- Allow cancellation without creating a ticket.
- Prevent ordinary non-ticket messages from creating tickets.
- Expose created tickets in the admin panel.
- Provide authenticated admin access.
- Deploy the application over HTTPS with demo credentials.

### Nice to have after core completion

- Duplicate-ticket detection.
- Streaming AI response.
- Overdue view.
- Ticket activity timeline.
- CI pipeline.
- Voice input.

The assignment itself explicitly says bonus features come after core functionality, and the working end-to-end flow should win over extra scope.

---

## 5. Non-Goals for the 24-hour build

Do not build these unless every P0 requirement is complete and tested:

- Real Slack integration.
- Real WhatsApp integration.
- Complex RBAC beyond admin/member.
- Multi-tenant organization management.
- Billing/subscriptions.
- Vector database / RAG.
- Multi-agent orchestration.
- Custom notification infrastructure.
- Mobile application.
- Offline mode.
- Advanced analytics.
- Large marketing website.
- Microservice decomposition.

---

## 6. Functional Requirements

### 6.1 Chat

The user can:
- Open or resume a chat session.
- Send free-text messages.
- See assistant replies in the same thread.
- Answer follow-up questions naturally.
- Cancel a pending ticket with language such as "forget it", "cancel", "never mind", or equivalent meaning.

The system must:
- Persist chat messages.
- Persist the active pending ticket draft.
- Understand a follow-up answer in the context of the previous conversation.
- Return a ticket confirmation card when creation succeeds.

### 6.2 AI extraction

Extract:
- English normalized title.
- Description.
- Assignee candidate.
- Due date.
- Priority.
- Optional status.
- Optional tags.
- Detected language.
- User intent.
- Clarification state.

Required fields for ticket creation:
- Issue summary/title.
- Assignee, unless explicitly unassigned.
- Due date, unless the user explicitly says there is no deadline.

Priority defaults to Medium when not specified.

The model output must be structured and validated before application code uses it.

### 6.3 Clarification loop

If one or more required fields are missing, ask for all missing values in one concise message.

Examples:

Missing assignee and due date:
> Got it. Who should I assign this to, and when should it be due?

Ambiguous assignee:
> I found two people named Rahul. Which one should I assign: Rahul Sharma (Backend) or Rahul Verma (Frontend)?

Ambiguous date:
> Did you mean 4 October 2026?

Invalid assignee:
> I couldn't find that person. Available matches are Priya Menon, Rahul Sharma, Rahul Verma, and Amit Kumar. Who should I assign it to?

Never guess.

### 6.4 Multi-language

Input may be:
- English.
- Hindi.
- Spanish.
- Arabic.
- Chinese.
- Hinglish or other mixed-language text.
- Mixed scripts.

The assistant response should be in the language of the latest user message, while structured storage also records the detected language.

The normalized English title is stored separately from the original-language message so the admin surface stays consistent.

### 6.5 Admin

Required admin functions:
- Email/password login.
- Ticket list.
- Search.
- Filter by status.
- Filter by assignee.
- Filter by priority.
- Filter by due date.
- Sort newest first.
- Pagination.
- Ticket detail.
- Edit ticket fields.
- Change status among Open, In Progress, Resolved.
- Add/list assignable users.

Ticket detail must show:
- Ticket ID/number.
- Title.
- Description.
- Assignee.
- Due date.
- Priority.
- Status.
- Tags.
- Language.
- Original chat message.
- Creation source.
- Created/updated timestamps.

---

## 7. UX Principles

1. **Conversation first.** The chat should feel faster than a traditional ticket form.
2. **No silent guessing.** Ambiguity is visible and actionable.
3. **Minimum interruption.** Ask the smallest number of questions needed to create a valid ticket.
4. **State is visible.** When a ticket is partially understood, show the draft without pretending it is complete.
5. **Admin consistency.** English-normalized titles make scanning easy.
6. **Fast feedback.** Every send action has a clear loading, success, or error state.
7. **Human presentation.** Avoid generic AI dashboard patterns, excessive gradients, decorative clutter, and meaningless animation.

---

## 8. Core Acceptance Scenarios

### Scenario 1: Complete message
Input:
> Checkout page is throwing 500 errors for some users. Priya will fix it by Friday, high priority.

Expected:
- Ticket created immediately.
- Assignee Priya.
- Correct Friday date based on current date/timezone.
- Priority High.
- Confirmation shown.

### Scenario 2: Missing assignee
Input:
> Login page crashes on Safari, this will be resolved by the 4th.

Expected:
- Ask who should be assigned.
- Also clarify the month if necessary.
- Do not create prematurely.

### Scenario 3: Mixed-language
Input:
> Payment page bahut slow chal raha hai, Amit isko 4 tarikh tak dekh lega.

Expected:
- Correct language detection.
- English normalized title.
- Assignee Amit.
- Correct date.
- Reply in natural Hinglish/Hindi style.

### Scenario 4: Ambiguous assignee
Input:
> Search results are wrong, Rahul to fix by tomorrow.

Expected:
- Detect multiple Rahuls.
- Present disambiguation options.
- Do not select one automatically.

### Scenario 5: Cancellation
Input sequence:
> Login issue on Safari.

Assistant asks for missing data.

User:
> Forget it.

Expected:
- Pending draft discarded.
- No ticket created.

### Scenario 6: Non-ticket
Input:
> Hello

Expected:
- Polite conversational response.
- No ticket created.

---

## 9. Success Criteria

A reviewer can:

1. Open the deployed chat URL.
2. Send a natural-language message.
3. Create a complete ticket without a form.
4. Trigger a clarification flow.
5. Answer the clarification in a separate turn.
6. See the created ticket confirmation.
7. Log into the admin panel.
8. Find the ticket.
9. Filter/search it.
10. Edit status/assignee/date.
11. Re-run multilingual and ambiguity scenarios.

The demo should work from a clean browser session with only the documented credentials.

---

## 10. Demo Data

Seed at least:

- Priya Menon
- Rahul Sharma
- Rahul Verma
- Amit Kumar
- Neha Singh
- Admin demo account

Use the duplicate Rahul records intentionally because the brief requires ambiguous-assignee testing.

Include a small number of seeded tickets only if useful to make the admin panel immediately understandable. Clearly distinguish seeded examples from newly created tickets.

---

## 11. Quality Bar

The application should feel like a small internal product that could plausibly be used by a real team, not a mockup.

The reviewer should be able to understand:
- Why the AI made a clarification.
- Why the backend accepted/rejected a model result.
- How the session keeps state.
- How the assignee is resolved.
- How dates are normalized.
- How data reaches the admin panel.

---

## 12. Requirements Traceability

| Brief area | Product requirement |
|---|---|
| Chat UI | Chat workspace + session persistence |
| AI parsing | Structured schema + Zod validation |
| Relative dates | Date resolution with timezone |
| Assignee matching | DB-backed matching and ambiguity handling |
| Multi-language | Language detection + same-language response |
| Clarification | Pending draft + missing-field flow |
| Admin | Search/filter/detail/edit/users |
| Auth | Supabase Auth email/password |
| Deployment | Vercel + Supabase |
| Testing | Automated AI/service/API tests |
| Bonus | Duplicate detection or streaming only after P0 |

---

## 13. Product Decision Summary

**Frontend:** Next.js + TypeScript

**Backend:** Node.js + Express + TypeScript

**AI layer:** Provider-agnostic service using structured generation with Zod validation. A Vercel AI SDK provider adapter may be used to keep provider swapping straightforward.

**Database:** Supabase PostgreSQL

**Authentication:** Supabase Auth

**Deployment:** Vercel for frontend and backend, Supabase for database/auth

**State:** Persistent database state only. Never depend on process memory for pending tickets, sessions, rate limits, or critical workflow state.

**Primary architectural rule:**

> The LLM interprets. The backend validates and decides. The database persists. The UI explains.
