# Implementation Plan

## 0. Goal

Finish and deploy a production-quality assignment within 24 hours.

The plan is optimized around the PyRock weighting:

- End-to-end functionality: highest priority.
- AI parsing/clarification: next highest priority.
- Code quality and TypeScript.
- UX.
- Deployment/docs.
- Testing.

Cut bonus scope before cutting deployment or core acceptance behavior.

---

## 1. Phase 0: Setup and Design (0-2h)

### Tasks

- Create repo and branch.
- Initialize Next.js + TypeScript frontend.
- Initialize Express + TypeScript API.
- Initialize workspace.
- Create `.env.example`.
- Create Supabase project.
- Install Taste Skill.
- Read all docs.
- Configure strict TypeScript.
- Configure lint/format/test.
- Add shared types/schema package.

### Exit criteria

- `web` starts.
- `api` starts.
- Supabase connection is reachable.
- `GET /health` returns OK.
- Both apps build locally.

---

## 2. Phase 1: Database + Auth (2-5h)

### Tasks

- Create migrations.
- Create app enums.
- Create `app_users`.
- Create chat session/message tables.
- Create tickets.
- Create ticket events if timing allows.
- Add indexes.
- Add RLS.
- Seed demo users.
- Configure Supabase Auth email/password.
- Implement frontend login.
- Implement API auth middleware.
- Implement `/api/auth/me`.

### Exit criteria

- Demo admin can log in.
- API identifies caller.
- Admin role is enforced.
- Migrations can recreate DB from scratch.

---

## 3. Phase 2: Ticket and Chat Persistence (5-7h)

### Tasks

- Session create/load.
- Message persistence.
- Ticket repository.
- User repository.
- Ticket number sequence.
- Ticket list endpoint.
- Ticket detail endpoint.
- Ticket patch endpoint.

### Exit criteria

- Ticket CRUD works through API tests.
- Chat history persists.
- Admin can see a seeded ticket.

---

## 4. Phase 3: AI Extraction (7-10h)

### Tasks

- Define Zod schema.
- Define provider interface.
- Implement provider adapter.
- Write system prompt.
- Add current date + timezone context.
- Add user list context.
- Add conversation + pending draft context.
- Implement structured output.
- Validate output.
- Retry invalid output once.

### Exit criteria

The following work in automated tests with a mocked provider:

- complete ticket.
- missing assignee.
- missing date.
- missing both.
- ambiguous assignee intent.
- cancellation.
- non-ticket.

---

## 5. Phase 4: Business Resolution + Clarification (10-12.5h)

### Tasks

- Assignee exact/fuzzy candidate resolution.
- Duplicate first-name ambiguity.
- Explicit "unassigned" support.
- Date normalization.
- Relative date handling.
- Month ambiguity handling.
- Explicit "no deadline" support.
- Pending draft merge.
- Clarification response generation.
- Cancellation reset.

### Exit criteria

All P0 chat acceptance flows pass locally.

---

## 6. Phase 5: Frontend Core (12.5-15.5h)

### Tasks

Chat:
- Session loading.
- Message list.
- Composer.
- Sending state.
- Assistant response.
- Clarification choices.
- Draft preview.
- Ticket created card.

Admin:
- Shell.
- Ticket list.
- Search.
- Filters.
- Pagination.
- Detail.
- Edit.
- Status change.

### Exit criteria

A reviewer can complete the full demo without using an API tool manually.

---

## 7. Phase 6: Polish + Accessibility (15.5-17h)

### Tasks

- Apply design tokens.
- Tune typography.
- Tune spacing.
- Add loading skeletons.
- Add empty/error states.
- Add focus states.
- Add keyboard navigation.
- Add reduced motion support.
- Improve mobile chat layout.

### Exit criteria

UI looks intentional, not like a default component-kit demo.

---

## 8. Phase 7: Testing and Hardening (17-19h)

### Automated

- AI service tests.
- API integration tests.
- Auth tests where practical.
- Date resolver tests.
- Assignee resolver tests.

### Acceptance matrix

```text
01 complete message
02 missing assignee
03 missing date
04 missing assignee + date
05 duplicate first name
06 missing/invalid assignee
07 Hindi
08 Spanish
09 Arabic
10 Chinese
11 Hinglish
12 tomorrow
13 next Friday
14 end of week
15 by the 4th
16 cancel
17 hello
18 admin filter
19 admin edit status
20 admin edit assignee/date
```

### Exit criteria

No known P0 failure.

---

## 9. Phase 8: Deployment (19-22h)

### Web
Deploy Next.js to Vercel.

### API
Deploy Express/Node API to Vercel.

### Supabase
- Apply production migrations.
- Apply seed data.
- Verify Auth settings.

### Environment variables

Web:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_API_BASE_URL
```

API:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
LLM_API_KEY or provider-specific secret
APP_TIMEZONE_DEFAULT
AI_RATE_LIMIT_PER_MINUTE
CORS_ORIGINS
```

Use current Supabase key naming as provided by the dashboard. Do not expose secret keys with `NEXT_PUBLIC_` prefixes.

### Exit criteria

- Clean browser login works.
- Chat works.
- Admin works.
- AI works.
- Database writes persist.

---

## 10. Phase 9: Submission (22-24h)

### Tasks

- Fix production-only bugs.
- Run live acceptance tests.
- Verify demo credentials.
- Verify README.
- Record 2-3 minute demo or prepare demo notes.
- Verify Git history is readable.
- Verify `.env.example` contains no secrets.
- Verify no secret files are committed.

### Submission checklist

```text
[ ] Source repository
[ ] Live chat URL
[ ] Admin URL
[ ] API URL if separate
[ ] Demo admin credentials
[ ] Seeded assignees
[ ] README
[ ] .env.example
[ ] Demo notes/video
[ ] Core acceptance tests passed
```

---

## 11. Scope Triage Rules

### If behind schedule at 10h
Cut:
- Ticket events.
- Duplicate detection.
- Fancy animation.

Keep:
- AI.
- clarification.
- DB.
- auth.
- ticket/admin.

### If behind at 15h
Cut:
- advanced visual polish.
- optional user profile features.
- ticket event UI.

### If behind at 19h
Do not build anything new. Deploy and test.

---

## 12. Definition of Done

The assignment is done when a reviewer can reproduce the required scenarios from the live URL, inspect the resulting ticket in the admin panel, and understand the architecture from the README.
