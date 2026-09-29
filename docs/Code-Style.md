# Code Style

## 1. General

- TypeScript strict mode is mandatory.
- Prefer explicit types at boundaries and inferred types inside small functions.
- No `any` by default.
- No non-null assertions (`!`) in application logic unless the invariant is genuinely guaranteed and documented.
- Prefer early returns.
- Prefer pure functions for parsing and transformations.
- Avoid deeply nested conditionals.

---

## 2. Naming

### Files

Use kebab-case for frontend components/pages where the framework convention permits, and lower camel case for utility/service files.

Examples:

```text
chat-message.tsx
TicketTable.tsx
assignee-resolver.ts
chat-service.ts
```

Do not mix several naming conventions within the same directory.

### Variables/functions

Use descriptive lowerCamelCase.

```ts
const pendingTicket = ...;
const resolveAssignee = ...;
```

### Types

PascalCase.

```ts
interface TicketDraft {}
type TicketStatus = ...;
```

### Constants

Use SCREAMING_SNAKE_CASE only for truly global constants.

---

## 3. Imports

Order:

1. Node built-ins.
2. External packages.
3. Workspace packages.
4. Local modules.

Use type-only imports where appropriate.

Avoid barrel files that create circular dependency problems.

---

## 4. Controllers and Routes

Controllers should orchestrate, not contain business logic.

Bad:

```ts
router.post('/tickets', async (req, res) => {
  // parse model output
  // find users
  // resolve dates
  // build ticket
  // insert several rows
});
```

Preferred:

```ts
const result = await chatService.processMessage(input);
return res.json(result);
```

Services own business behavior.
Repositories own persistence.

---

## 5. Validation

Validate at every external boundary:

- HTTP request body.
- Query parameters.
- Route parameters.
- LLM output.
- Environment variables.

Use Zod for shared and server-side schemas.

Never trust TypeScript types as runtime validation.

---

## 6. Error Model

Use typed application error codes.

Example:

```ts
type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'AI_TIMEOUT'
  | 'AI_INVALID_OUTPUT'
  | 'DATABASE_ERROR'
  | 'RATE_LIMITED';
```

API response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be processed.",
    "details": []
  }
}
```

Do not leak stack traces to clients.

---

## 7. Async Code

- Always await promises that affect response correctness.
- Do not use floating promises in request handlers.
- Use `Promise.all` only where operations are independent.
- Use sequential transactions when order matters.
- Set AI request timeouts.

---

## 8. Database Code

- Keep DB access inside repositories or data modules.
- Never build SQL strings from untrusted input.
- Use parameterized queries or the Supabase client.
- Select only required columns when practical.
- Paginate list endpoints.
- Use explicit ordering.
- Keep business constraints in the database where appropriate.

---

## 9. AI Code

Prompts live in dedicated files.

Schemas live in dedicated modules.

Provider-specific code lives behind `AIProvider`.

Example:

```ts
export const TicketAnalysisSchema = z.object({
  intent: z.enum([
    'create_ticket',
    'general_chat',
    'cancel_pending_ticket',
  ]),
  status: z.enum(['complete', 'needs_clarification']),
  ...
});
```

Avoid `JSON.parse` followed by unsafe casting. Parsing must be schema validated.

---

## 10. React / Next.js

- Prefer Server Components where they simplify data-free rendering.
- Use Client Components only when interaction/state requires them.
- Avoid placing fetch calls in many leaf components when a page-level data boundary is cleaner.
- Keep API client code in one module.
- Use TanStack Query or another consistent server-state library if introduced. Do not combine several competing server-state libraries.
- Avoid global state unless state truly spans deep component trees.

---

## 11. CSS / Tailwind

- Use design tokens from `Design-System.md`.
- Prefer semantic class groupings over hundreds of arbitrary one-off values.
- Do not sprinkle random hex codes through JSX.
- Keep the palette centralized.
- Avoid arbitrary values when an existing token matches.
- Avoid `!important`.

---

## 12. Accessibility

- Interactive elements must be real buttons/links where applicable.
- Inputs need labels.
- Icons need accessible names when interactive.
- Use `aria-live` for asynchronous chat status where useful.
- Keyboard navigation is mandatory for dialogs and menus.

---

## 13. Comments

Comments explain why, not what.

Good:

```ts
// Keep the pending draft in Postgres because Vercel functions are ephemeral.
```

Bad:

```ts
// Set pendingTicket to null.
pendingTicket = null;
```

Avoid comments that simply restate code.

---

## 14. Tests

Test names describe behavior.

```ts
describe('assignee resolution', () => {
  it('asks for clarification when two users share the same first name', ...);
});
```

Prefer deterministic tests.

Mock the AI provider in service tests.

Do not make the core test suite depend on a live LLM API.

---

## 15. Git

Commit early and often.

Recommended sequence:

```text
chore: scaffold app
feat: add database schema
feat: add auth
feat: add chat persistence
feat: add structured ticket extraction
feat: add clarification loop
feat: add admin dashboard
feat: add acceptance tests
chore: prepare production deployment
```

Do not make one giant "final" commit if avoidable.

---

## 16. Forbidden Shortcuts

Do not:
- hard-code ticket extraction with regex as the primary approach.
- hard-code assignee guesses.
- hard-code dates from the current assignment examples.
- use fake local storage as the source of truth.
- commit secrets.
- hide failing tests.
- ship placeholder pages as completed requirements.
