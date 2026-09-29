# Coding Agent Instructions

## 1. Mission

Build the complete Chat-to-Ticket assignment from the provided PyRock brief and the documents in `/docs`.

Operate as an implementation agent, not as a brainstorming assistant.

The goal is a working, tested, deployable product. Do not stop at scaffolding, pseudocode, placeholder screens, or a partial architecture.

---

## 2. Read Order

Before writing code, read these files completely:

1. `docs/PRD.md`
2. `docs/Design-System.md`
3. `docs/Architecture.md`
4. `docs/Agents.md`
5. `docs/Code-Style.md`
6. `docs/Database.md`
7. `docs/API-guide.md`
8. `docs/ImplementationPlan.md`
9. `docs/AppFlow_Working.md`
10. `docs/Security.md`

Then inspect the repository and existing files.

The PyRock assignment brief remains the external source of truth for mandatory requirements. These documents convert those requirements into implementation decisions.

---

## 3. Autonomy Rules

Proceed without asking for permission for normal implementation decisions.

Make reasonable assumptions when details are not specified and document material assumptions in `README.md`.

Do ask a question only when a missing external credential, environment value, or unavailable system capability genuinely blocks execution.

Do not ask the user to choose between implementation alternatives that have already been decided in these docs.

---

## 4. Required Stack

Use:

- Next.js + TypeScript for web.
- Node.js + Express + TypeScript for API.
- Supabase Postgres.
- Supabase Auth.
- Zod.
- Current stable LLM provider SDK or Vercel AI SDK behind an application-level provider interface.
- Tailwind CSS with the design rules in `Design-System.md`.
- A single consistent icon library.
- Vitest and Supertest or equivalent TypeScript-friendly test stack.

Do not replace Express with a different backend framework unless deployment makes the explicit Express requirement impossible.

Do not replace Supabase with Firebase.

Do not add an ORM unless it materially simplifies the build and does not delay deployment. Supabase SQL migrations are the schema source of truth.

---

## 5. Taste Skill

Attempt:

```bash
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```

Read the resulting skill file if installed.

Use the project dials:

```text
DESIGN_VARIANCE: 6
MOTION_INTENSITY: 4
VISUAL_DENSITY: 7
```

Do not let the design skill override the functional requirements.

The frontend must remain a usable internal operations tool.

---

## 6. Implementation Order

Implement in this order unless a concrete dependency requires otherwise:

### Phase A: foundation
- Workspace.
- TypeScript strict mode.
- Environment validation.
- Basic Next.js app.
- Express API.
- Supabase project connection.
- Database migrations.
- Seed users.

### Phase B: persistence and auth
- Supabase Auth login.
- Application profile lookup.
- Session CRUD.
- Message CRUD.
- Ticket CRUD.
- Ticket events.

### Phase C: AI
- Shared schemas.
- AI provider interface.
- Prompt module.
- Structured analysis.
- Zod validation.
- Retry once on invalid output.
- Assignee resolution.
- Date resolution.
- Clarification state.
- Cancellation.
- Non-ticket intent.

### Phase D: frontend
- Login.
- Chat workspace.
- Ticket draft rail.
- Ticket confirmation card.
- Admin layout.
- Ticket list.
- Filters/search/pagination.
- Ticket detail/edit.
- User management.

### Phase E: hardening
- Acceptance tests.
- Multilingual scenarios.
- Error states.
- Rate limiting.
- Security review.
- Deployment.
- README.

### Phase F: bonus only if stable
- Duplicate detection.
- Streaming.
- Overdue view.
- Activity timeline if not already present.
- CI.

---

## 7. Coding Rules

- Use strict TypeScript.
- No `any` unless there is a documented external typing limitation.
- Validate all external input.
- Return typed domain objects.
- Keep controllers thin.
- Put business rules in services.
- Put data access in repositories.
- Keep prompts out of route handlers.
- Do not duplicate schemas across web and API if they can safely live in `packages/shared`.
- Prefer small functions with one responsibility.
- Never mutate shared global state for user-specific workflows.

---

## 8. AI Rules

The LLM may interpret input but may not become the final authority.

For every AI response:

1. Generate structured output.
2. Validate it.
3. Resolve database-dependent values.
4. Apply business rules.
5. Persist only after the result is safe.

Never:
- invent a user.
- invent a deadline.
- treat a fuzzy name as an exact database match.
- create a ticket while required information is unresolved.
- expose raw model output as if it were authoritative.

Use a single prompt module as the source of instruction text.

---

## 9. UI Rules

Before finalizing any screen, compare it with `Design-System.md`.

Reject your own implementation if it looks like:
- generic AI dashboard.
- default shadcn template.
- excessive cards.
- default Tailwind gray + purple.
- decorative glassmorphism.
- oversized hero landing page.

Use real states instead of visual placeholders.

---

## 10. Testing Gate

Before declaring the implementation complete, run:

```bash
lint
 typecheck
 test
 build
```

Use the actual project scripts rather than assuming these command names exist.

Then manually exercise every acceptance scenario in `AppFlow_Working.md`.

No known P0 defect may remain.

---

## 11. Deployment Gate

Do not call the project complete until:

- Frontend is deployed on Vercel.
- API is deployed on Vercel.
- Supabase database is connected.
- Authentication works from a clean browser.
- LLM calls work in production.
- Environment variables are configured.
- Demo credentials are documented.
- A health endpoint exists for the API.
- HTTPS works.

The final README must contain:
- setup.
- environment variables.
- architecture.
- migration/seed instructions.
- AI approach.
- demo credentials.
- live links.
- known limitations.

---

## 12. Error Handling

Never silently swallow exceptions.

User-facing errors must be understandable.

Server logs must retain actionable diagnostic context.

Every route should return a consistent error shape.

---

## 13. Scope Control

When time is limited:

P0 > P1 > visual polish > bonus.

If a feature threatens deployment, cut the feature, not the deployment.

Never spend an hour polishing an unfinished requirement.

---

## 14. Definition of Done

The feature is done only when:

- code is implemented.
- types pass.
- tests pass.
- database migrations work from a clean project.
- UI handles loading/error/empty states.
- API handles invalid input.
- acceptance scenario works.
- production deployment works.
- documentation reflects the actual implementation.

Do not write "TODO: implement" as a substitute for required behavior.

---

## 15. Final Agent Behavior

At completion, report:

1. What was implemented.
2. What commands/tests were run.
3. What URLs were deployed.
4. What demo credentials exist.
5. Any known limitations.

Do not claim a test or deployment succeeded unless it was actually executed.
