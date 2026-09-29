# Chat-to-Ticket Design System

## 0. Design Direction

### Product character

Chat-to-Ticket is an internal productivity tool, not a consumer landing page. The visual language should feel precise, editorial, calm, and slightly distinctive. It should communicate that the product is serious about operational data without looking sterile.

### Taste-skill usage

Before implementation, install the current Taste Skill frontend design skill:

```bash
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```

Then read the installed `SKILL.md` and use it as a design implementation constraint. The current upstream project describes this as its v2 experimental default design skill, with three global dials for design variance, motion, and density.

Project dials for this app:

```text
DESIGN_VARIANCE: 6
MOTION_INTENSITY: 4
VISUAL_DENSITY: 7
```

Rationale:
- 6 gives the interface a visible point of view without sacrificing admin usability.
- 4 adds polish without making a work application feel theatrical.
- 7 gives the ticket table and metadata enough density for real operational use.

If the skill is unavailable in the coding environment, continue with this document. Never block implementation on the skill installation.

---

## 1. Visual Principles

1. **No generic AI aesthetic.** No purple-to-blue gradient hero, dark mesh background, or glassmorphism-everywhere treatment.
2. **No fake depth.** Use borders, alignment, typography, and restrained shadows instead of floating cards everywhere.
3. **Strong hierarchy.** Titles, IDs, labels, and actions should be immediately scannable.
4. **Editorial precision.** Use asymmetry selectively: the chat workspace may use a strong primary column and a compact ticket context rail.
5. **Functional color.** Color should communicate action or state, not decorate every row.
6. **Motion should have a reason.** Use transitions for state changes, message arrival, panel movement, and confirmation. No looping decorative animations.
7. **Desktop first for admin, responsive for chat.** The chat surface must still be comfortable on a narrow viewport.

---

## 2. Color System

Use one coherent warm-neutral palette with a single strong action accent.

### Core tokens

```text
--background:        #F5F3EE
--surface:            #FBFAF7
--surface-strong:    #EFECE5
--ink:               #151512
--ink-soft:          #4E4C46
--ink-muted:         #77736A
--border:            #D8D3C9
--border-strong:     #BDB7AC
--accent:            #F0644E
--accent-dark:       #C94A37
--accent-soft:       #FBE1DB
--focus:             #2F5BEA
--success:            #3E7650
--warning:            #A26724
--danger:             #B83C34
--white:             #FFFFFF
```

### Usage

- **Accent** is for primary actions, active controls, new-ticket highlights, and key call-to-action elements.
- **Focus** is for keyboard focus rings and accessibility states, not decorative branding.
- **Success/warning/danger** are semantic only.
- Avoid using more than one strong accent in the same component.
- Do not place colored status dots beside every item. Use a pill, text label, border, or subtle background when a state needs visual encoding.

### Dark mode

Dark mode is optional and should not be implemented until the light interface is complete. Do not introduce an unrelated dark palette.

---

## 3. Typography

### Primary typeface

Use **Geist Sans** through `next/font` if available in the chosen Next.js setup.

### Secondary / metadata typeface

Use **Geist Mono** for:
- Ticket IDs.
- Timestamps where compactness helps.
- API/debug identifiers.
- Code-like metadata.

### Hierarchy

```text
Display:      44/48, weight 650
Page title:   30/36, weight 650
Section:      20/26, weight 620
Card title:   16/22, weight 620
Body:         14/22, weight 450
Small:        12/18, weight 520
Micro:        11/16, weight 550
```

Do not use giant H1s. The app is a working tool, not a marketing page.

### Copy rules

- Sentence case.
- Avoid unnecessary exclamation marks.
- Avoid corporate filler.
- Never write fake AI language such as "I have intelligently analyzed your request".
- Be direct and human.

---

## 4. Spacing

Use a 4px base rhythm.

```text
4   = xs
8   = sm
12  = md-xs
16  = md
20  = lg-xs
24  = lg
32  = xl
40  = 2xl
48  = 3xl
64  = 4xl
```

Recommended application values:
- Desktop page gutter: 32px.
- Wide desktop gutter: 40px to 48px.
- Card padding: 20px or 24px.
- Compact table row: 52px to 60px.
- Chat message gap: 12px.
- Major section gap: 32px.

Never use arbitrary spacing values when one of the tokens works.

---

## 5. Radii

Avoid excessively rounded UI.

```text
Button:       10px
Input:        10px
Card:         14px
Dialog:       16px
Pill:         999px
```

Do not make every section a rounded floating card.

---

## 6. Borders and Shadows

Borders are the primary structure tool.

```text
Default border: 1px solid var(--border)
Strong border:  1px solid var(--border-strong)
```

Shadows:
- Default cards: no shadow or extremely subtle shadow.
- Dialogs: one clear elevation level.
- Popovers: one clear elevation level.
- Never stack multiple glowing shadows.

---

## 7. Layout System

### Global shell

```text
App Shell
├── Sidebar or compact rail
├── Main content
└── Optional contextual rail
```

### Chat page

Desktop:

```text
┌────────────┬──────────────────────────────┬────────────────┐
│ Sessions   │ Conversation                 │ Ticket context │
│ 240px      │ Flexible                     │ 300-340px      │
└────────────┴──────────────────────────────┴────────────────┘
```

The context rail should collapse when there is no useful ticket draft rather than staying as a large empty panel.

### Admin page

```text
Sidebar + main workspace

Header
Search / filters
Data table
Detail drawer or detail page
```

Use a dense but breathable table, not a collection of giant cards.

---

## 8. Core Components

### Button

Variants:
- Primary.
- Secondary.
- Ghost.
- Destructive.

Rules:
- Clear labels.
- Visible keyboard focus.
- Disabled state must look intentional.
- Avoid icon-only buttons when a text label is materially clearer.

### Input

Rules:
- Label above field.
- Visible focus ring.
- Error text below.
- Do not use placeholder as the only label.

### Badge / status pill

Use for:
- Priority.
- Status.
- Language.
- Source.

Do not use pills for every metadata field.

### Chat bubble

User and assistant messages may have different surface treatment, but avoid the common oversized bubble style. Let the typography and alignment carry most of the distinction.

### Ticket card

When a ticket is created, show:
- Ticket number.
- Title.
- Assignee.
- Due date.
- Priority.
- Status.

The card should read like a compact operational record, not a marketing card.

### Clarification choices

When the AI needs disambiguation, show compact selectable options with enough context to choose safely:

```text
Rahul Sharma
Backend Engineering

Rahul Verma
Frontend Engineering
```

Selection must not silently submit a second unrelated message. It should resolve the active draft explicitly.

### Data table

Columns should include:
- Ticket.
- Status.
- Assignee.
- Priority.
- Due.
- Updated.

Newest first by default.

Use hover and focus states, not constant background stripes.

---

## 9. Chat UX Rules

### Composer

- Sticky to bottom of viewport.
- Textarea grows up to a sensible maximum.
- Enter sends only when appropriate; Shift+Enter creates a new line.
- Send button is visible but secondary to typing.
- Loading state must preserve the draft input.

### Assistant response behavior

Use short messages. If multiple missing fields exist, ask them in a single sentence.

Avoid:
- "Please provide the following required fields: ..."
- Long explanations.
- Fake confidence.

Prefer:
> Who should I assign this to, and when should it be due?

### Ticket-created confirmation

The confirmation card should be visually distinct enough that a reviewer can see the ticket was persisted.

Include the ticket number and structured values.

---

## 10. Admin UX Rules

### Table states

Must support:
- Loading skeleton.
- Empty state.
- Filtered empty state.
- Error state.

Empty state copy:
> No tickets match these filters.

Not:
> Oops! Looks like nothing is here yet.

### Ticket detail

Keep source context visible. The original chat message is a critical trust feature because it lets an admin compare AI output with the input.

### Editing

Prefer in-context editing where practical. Do not open a wizard for a single field update.

---

## 11. Animation

Motion intensity = 4.

Allowed:
- 120-220ms hover/focus transitions.
- 180-300ms panel transitions.
- Message fade/slide on arrival.
- Ticket confirmation entrance.
- Layout transitions when a draft rail appears/disappears.

Do not use:
- Infinite marquee.
- Parallax.
- Cursor-following effects in the admin tool.
- Excessive spring physics.
- Full-page transition animations that delay navigation.

Use `motion/react` if the project already uses Motion. Respect `prefers-reduced-motion`.

Animate only transform and opacity for custom transitions.

---

## 12. Icons

Use one icon family consistently. Prefer Phosphor, Hugeicons, Radix, or Tabler if a library is needed. Do not hand-draw SVG icons.

No decorative emoji in the core UI.

---

## 13. Accessibility

- WCAG-conscious contrast.
- Keyboard navigation for every action.
- Visible focus state.
- Correct label association.
- `aria-live` for assistant response and status announcements where useful.
- Modal focus management.
- Reduced motion support.
- Do not communicate state by color alone.

---

## 14. Responsive Rules

### Desktop
Primary admin target is 1280px and above.

### Tablet
Collapse contextual rail before collapsing the main chat experience.

### Mobile
Chat remains fully usable.
Admin table may horizontally scroll or switch to compact rows.

Never make mobile users pinch-zoom a desktop dashboard.

---

## 15. Anti-Slop Checklist

Before shipping the frontend, verify:

- No purple/blue AI gradient background.
- No glassmorphism everywhere.
- No giant hero heading.
- No meaningless colored dots on every row.
- No excessive card nesting.
- No generic "Welcome to your dashboard" copy.
- No random serif/sans font mixing.
- No excessive border radius.
- No animation that makes the product feel slower.
- No placeholder lorem ipsum.
- No fake charts with invented metrics.
- No empty decorative tiles.

---

## 16. Source of Design Guidance

The Taste Skill README and current `SKILL.md` emphasize anti-default discipline, three design dials, controlled typography, deliberate layouts, a single coherent palette, Motion for interaction, and reduced-motion accessibility. The implementation should follow those principles while prioritizing the assignment's operational nature over decorative experimentation.
