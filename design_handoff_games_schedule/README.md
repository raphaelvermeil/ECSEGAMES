# Handoff: ECSESS Games — Schedule tab + Event detail

## Overview
The Schedule section of the ECSESS Games site: a competition platform for McGill engineering
students who are locked to one of three program teams (Electrical, Computer, Software) and compete
for points. Two surfaces are covered here:

- **Screen A — Schedule.** Three day tabs (the Games run Fri 25 – Sun 27 September), a
  "runs all weekend" strip for ongoing events, category filters, and an Upcoming rail.
- **Screen B — Event detail.** A centred modal over a dimmed, blurred schedule, with a
  scoring panel and an audit-log history view for execs.

Two roles are in scope. **Student** reads only. **Exec** additionally gets `+ Add event`, `Edit event`,
and the scoring panel. A floating dev-only role switcher (bottom-right, dashed grey, deliberately
un-branded) toggles between them; it is scaffolding, not a feature — drop it.

Out of scope: auth, leaderboard, the CS Games editor, CTF integration, recurring events, mobile.

## About the Design Files
`ECSESS Games Schedule.dc.html` in this bundle is a **design reference written in HTML/React** —
a prototype showing intended look and behaviour, not production code to copy. The task is to
**recreate it in the target codebase** using its existing environment, component library, and
conventions. If the project has no frontend yet, pick the appropriate framework and build it there.
All data in the prototype is mock data held in React state; there are no network calls and no
localStorage.

## Fidelity
**High-fidelity.** Colours, type, spacing, and interaction states are final. Recreate the UI
faithfully. The one exception is the two placeholder assets noted under **Assets**.

---

## Screens / Views

### Chrome (already built in the live site — reproduce, do not redesign)
- **Top bar:** full width, 72px tall, background `--chrome` `#1a1c1a`, horizontal padding 22px,
  flex row, `gap: 30px`.
  - Circular ECSESS logo mark, 36px, then `GAMES` — display font, 21px, weight 600,
    `letter-spacing: .2em`, colour `--cream`.
  - Nav: `Home · Schedule · Events · Leaderboard`. Mono 14px/500 in `--accent`, padding `9px 14px`.
    Inactive items get a transparent 1px border that becomes `--accent-dim` on hover. The active
    item (`Schedule`) gets a 1px `--accent` border plus a 3px solid `--accent` underline
    (implemented as `box-shadow: 0 3px 0 0 var(--accent)`), and `aria-current="page"`.
  - Right side: outline bell icon (22px, stroke 1.6, `--accent`) and a 34px circular avatar,
    background `#4a5cd6`, white outline person glyph.
- **Banner band:** full-bleed, min-height 180px, background `--band` `#093325`, padding `36px 40px`,
  vertically centred. Contains the page title `SCHEDULE` (display, 56px, weight 600, `--cream`) and
  the subtitle `Everything happening at the Games.` (mono 15px, `--accent`, 14px above-gap).
  A static CRT scanline overlay sits on the band only: absolutely positioned,
  `repeating-linear-gradient(to bottom, rgba(0,0,0,.5) 0 1px, transparent 1px 3px)` at
  `opacity: .28`, `pointer-events: none`. Never animated.
- **App frame:** the whole app sits in a rounded frame — `border-radius: 14px 14px 0 0`,
  `overflow: hidden`, `min-width: 1380px`, `max-width: 2500px`, centred, on a `#f4f4f0` page.

### Screen A — Schedule
- **Purpose:** everyone finds out what is happening and when; execs create events and award points.
- **Layout:** `<main>` padding `26px 40px 80px`; CSS grid,
  `grid-template-columns: minmax(0, 2.05fr) minmax(340px, 1fr)`, `gap: 24px`, `align-items: start`.
  Left column = day tabs + panel. Right column = Upcoming rail. Desktop only, 1440 → 2500px.

**Category filters** (top of the left column, above everything else)
- Flex row, `gap: 10px`, `margin-bottom: 16px`, four toggle chips — one per category.
- Chip: `display:flex; align-items:center; gap:9px; padding:8px 14px`, mono 12px/500,
  `letter-spacing:.09em`, uppercase, plus a 9px square dot.
- Active: background = category colour at 12% alpha, 1px border at 40% alpha, text = category colour,
  dot = category colour. Inactive: transparent background, 1px `rgba(127,148,130,.3)` border,
  text and dot `--text-muted`. All four on by default. `aria-pressed` reflects state.
- Filters apply to the day tabs, the day list, the ongoing strip, and the rail simultaneously.
- Colour is never the only signal — every chip carries its label as text.

**Runs-all-weekend strip**
- 1px **dashed** `--hair` border, background `--bg-raised`, padding `14px 18px`, `margin-bottom: 16px`.
- Label `RUNS ALL WEEKEND` — mono 10px/500, `letter-spacing:.16em`, `--accent-dim`, no wrap.
- Then a wrapping flex row of ongoing events. Each is a button on `--bg` with a 3px left border in
  its category colour, padding `9px 14px`, title in mono 13px `--cream` followed by the short
  description in mono 11px `--text-muted`. Hover background `#17251d`. Opens the event detail.

**Day tabs**
- Container: background `--bg-raised`, 1px `--hair` border. Tab strip is a 3-column grid
  (`role="tablist"`, each tab `role="tab"` + `aria-selected`).
- Tab: column flex, `gap: 7px`, padding `18px 20px`, 1px `--hair` right divider, 3px bottom border
  (`--accent` when selected, transparent otherwise), background `--bg` when selected.
  - Kicker `DAY 1` — mono 10px/500, `letter-spacing:.18em`; `--accent` selected, `--text-muted` not.
  - Label `FRI 25` — display 26px/600, `letter-spacing:.03em`; `--cream` selected, `--text-muted` not.
  - Count `2 events` — mono 11px, `--text-muted`. Singular/plural handled.
- Tabs are `FRI 25` / `SAT 26` / `SUN 27`, labelled DAY 1–3. Day 1 selected by default.

**Day panel (tabpanel, padding `22px 22px 26px`)**
- One row per event, in start-time order. Row is a full-width button:
  `grid-template-columns: 96px minmax(0,1fr) auto`, `gap: 20px`, `align-items: start`,
  background `--bg`, 1px `--hair` border, 3px left border in the category colour,
  padding `18px 20px`, `margin-bottom: 12px`.
  - Left: start time — display 24px/600, `--cream`; below it `until 17:00` — mono 11px, `--text-muted`.
  - Middle: title mono 16px `--cream`; short description mono 13px/1.6 `--text-muted`,
    `max-width: 60ch`, `text-wrap: pretty`; then a location line — 12px outline pin icon +
    mono 11px `--accent-dim`.
  - Right: category chip — 1px border at 40% alpha, text in the category colour, 7px square dot,
    mono 10px/500, `letter-spacing:.11em`, uppercase, `white-space: nowrap`.
  - Hover: border colour → category colour, background `#141f19`, 120ms.
  - Whole row opens the event detail.
- Empty state (filters exclude everything on this day): centred, padding `52px 10px`,
  `No events match these filters.` in mono 13px `--text-muted`, plus a `CLEAR FILTERS`
  outline button beneath.

**Upcoming rail (right column)**
- Panel: background `--bg-raised`, 1px `--hair` border. Header row padding `16px 18px`, 1px bottom
  hairline: `UPCOMING` (display 18px/600, `letter-spacing:.08em`, `--cream`) and a right-aligned
  count `10 EVENTS` (mono 11px, `--text-muted`, `letter-spacing:.09em`).
- Body: `max-height: 860px`, `overflow-y: auto`, `overflow-x: hidden`.
- Chronological from "now", grouped under **sticky** date headers (`SAT 26 SEP`) —
  `position: sticky; top: 0`, background `--bg-raised`, padding `12px 18px 8px`, mono 11px/500,
  `letter-spacing:.16em`, `--accent-dim`, 1px bottom hairline.
- Row: `grid-template-columns: 62px minmax(0,1fr) auto`, `gap: 14px`, padding `14px 18px`,
  separated by 1px `rgba(63,143,87,.18)` rules — **rules, not boxes**.
  - Exact start time — display 17px/500, `--cream`.
  - Title mono 14px `--cream`; one-line description mono 12px/1.5 `--text-muted` beneath.
  - Right-aligned category chip (same recipe, 10px).
  - 2px transparent left border that brightens to the category colour on hover, plus a
    `rgba(110,231,135,.035)` background wash. 120ms.
- Ongoing events are excluded from the rail (they live in the strip).
- Empty states: `No events match these filters.` + `Clear filters` when filtered out;
  `Nothing scheduled yet.` when genuinely empty — followed by `+ ADD EVENT` **for execs only**.

**Exec-only: Add event**
- `+ ADD EVENT` sits at the top-right of the banner band, baseline-aligned with the page title.
  Filled `--accent`, text `#07130d`, padding `14px 22px`, display 15px/600, `letter-spacing:.06em`,
  `filter: brightness(1.12)` on hover. It is the only filled-accent button on the page.

### Screen B — Event detail (modal)
- Overlay: `position: fixed; inset: 0`, `rgba(4,9,7,.72)`, `backdrop-filter: blur(4px)`,
  `padding: 56px 20px`, scrollable, `animation: fade 180ms ease-out`.
- Panel: `max-width: 780px`, background `--bg-raised`, 1px `--accent-dim` border,
  `animation: opacity 0 → 1 / scale(.98) → 1 over 180ms ease-out`.
  `role="dialog" aria-modal="true"`, `tabIndex=-1`.
- **Header** (padding `26px 30px 22px`, 1px bottom hairline): category chip top-left; on the right
  `Edit event` (exec only, outline button, mono 11px uppercase) and a 32px square close button.
  Title beneath: display 38px/1.08, `--cream`, `text-wrap: pretty`.
  Metadata row: flex, `gap: 22px`, mono 12px `--text-muted`, each item preceded by a 14px outline
  icon (stroke 1.7, `--accent-dim`) — calendar / clock / pin: date, `15:00 – 17:00`, location.
  Ongoing events read `Fri 25 – Sun 27 Sep 2026` and `Open all weekend`.
- **Body:** full description, mono 14px/1.75 `--text`, `max-width: 62ch`, padding `24px 30px 6px`.
- **Notices:** two-column grid, `gap: 22px`, padding `20px 30px 24px`. Section headings
  `ACCESS & SUSTAINABILITY` and `CAPTAIN'S ROLE` — mono 10px/500, `letter-spacing:.16em`,
  `--accent-dim`; body mono 13px/1.7 `--text-muted`.
- **Footer** (1px top hairline, padding `16px 30px 20px`): `Last edited by Raphael Vermeil · 3 Aug 2026, 14:22`
  in mono 11px `--text-muted`, underlined, hover `--accent`. Events never edited read
  `Created by …` instead. Clicking it swaps the modal body to the history view.

**Scoring panel (exec only)** — separated by a 1px top hairline, padding `22px 30px 26px`,
section label `SCORING` (mono 11px/500, `letter-spacing:.18em`, `--accent-dim`).
- Table as a grid: `1fr 1.3fr .7fr .9fr .6fr 36px`, `gap: 10px`.
  Header row mono 10px/500 `letter-spacing:.12em` `--text-muted`:
  `RECIPIENT · SEGMENT · POINTS · AWARDED BY · WHEN`.
- Row: team mono 13px `--cream`; segment mono 12px `--text`; points **display 17px/500**,
  `--accent` when positive (prefixed `+`), `--coral` when negative; actor and time mono 12px
  `--text-muted`; trailing `···` menu button (28×24, hover border `--hair`, colour `--accent`).
  Rows separated by 1px `rgba(63,143,87,.18)`.
- The `···` menu reveals inline `Edit` (outline) and `Delete` (coral outline) buttons below the row.
- **Deleted entries stay visible**: `line-through`, `opacity: .5`, `···` replaced by a `REVOKED` tag
  (mono 9px/500, coral text, 1px `rgba(255,123,84,.45)` border, padding `3px 6px`). The history
  stays honest — nothing is ever removed from the table.
- Inline edit swaps the row into a number input (points) + text input (note) + filled `SAVE` +
  underlined `Cancel`. Saving appends `edited` history entries with before → after diffs.
- **Award form** beneath the table: background `--bg`, 1px `--hair` border, padding 18px, heading
  `AWARD POINTS`. Two-column grid, `gap: 14px`:
  - Recipient — segmented control `Electrical / Computer / Software`, 1px `--hair` frame,
    selected segment filled `--accent` with `#07130d` text.
  - Segment — native select: `CS Games comp`, `Chicken Rush`, `Captains Challenge`, `Scunts`, `Other`.
  - Points — number input, negatives permitted, placeholder `e.g. 250 or -50`.
  - Description — text input, placeholder `What are these points for?`.
  - `AWARD POINTS` — filled accent, display 13px/600.
  - Errors render beneath the grid in `--coral`, mono 12px.

**Delete confirmations** (score entries and events alike) are small inline confirms that name
exactly what is being removed — `Remove 250 points from Software?`,
`Remove "CS Games comp" and its score entries?` — with `Remove` in coral outline and `Cancel` as an
underlined text button. Never a bare "Are you sure?".

### History view
Replaces the modal body in place. Header: back arrow (32px outline button), `HISTORY` kicker,
event title beneath, close button on the right. Rows are reverse-chronological,
`grid-template-columns: 96px minmax(0,1fr)`, `gap: 16px`, padding `14px 0`, 1px hairline between.
- Action verb — mono 10px/500, `letter-spacing:.14em`, uppercase; `awarded` → `--accent`,
  `deleted` → `--coral`, `created`/`edited` → `--accent-dim`.
- Sentence in mono 13px `--text`; for edits a diff line beneath: label in `--text-muted`, old value
  `--text-muted` with `line-through`, an `->` arrow in `--accent-dim`, new value in `--cream`.
- Then `actor · 3 Aug 2026, 14:22` in mono 11px `--text-muted`.

### Create / edit event modal (exec only)
Same overlay treatment, `max-width: 700px`. Heading `NEW EVENT` / `EDIT EVENT` (display 26px/600).
Fields stack in an 18px-gap grid, every label mono 10px/500 `letter-spacing:.14em` `--text-muted`,
every input on `--bg` with a 1px `--hair` border and padding `11px 12px`:
1. **Title** — text.
2. **Short description** — text, with a live `0 / 80` counter right-aligned above the field
   (turns `--coral` past 80). This is what appears in the Upcoming rail.
3. **What it is** — textarea, 4 rows.
4. **Access & sustainability** and **Captain's role** — two textareas side by side, 3 rows each.
5. **Starts** / **Ends** — side by side, each a date input + a 110px time input.
6. **Location** — text.
7. **Category** — segmented control, four options, each in its own colour: selected gets a 12%-alpha
   background, category-coloured text, and a 2px bottom border in its colour.

Actions: `SAVE EVENT` / `SAVE CHANGES` (filled accent), `Cancel` (underlined text button), and — in
edit mode only — `Delete event` in coral, pushed right, which opens the inline confirm.

**Validation** (client-side, on submit, inline beneath the offending field in `--coral`, mono 12px —
each message says what is wrong and how to fix it):
- Title required → `Add a title so people know what this is.`
- Short description required → `Add a one-line description — it appears in the upcoming list.`
- Short description over 80 chars → `Trim this to 80 characters or fewer.`
- Start date/time required → `Set a start date and time.`
- End date/time required → `Set an end date and time.`
- End must be after start → `End time must be after the start time.`
- Location required → `Add a location, or write Online.`

---

## Interactions & Behavior
- **Opening the detail:** any event row (day panel, rail, ongoing strip) opens the detail modal.
- **Dismissal:** Esc, the close button, or a backdrop click. Clicks inside the panel stop propagation.
- **Focus management:** the triggering element is stored on open; the dialog receives focus on mount;
  Tab and Shift+Tab are trapped inside the panel (query visible focusable descendants, wrap at the
  ends); focus returns to the trigger on close. Focus rings are `2px solid var(--accent)` with
  `outline-offset: 2px`, via `:focus-visible`.
- **Motion is restrained.** Hover transitions 120ms (borders brighten to `--accent` or the category
  colour). Overlay fades 180ms; the panel scales from `.98` over 180ms. No scroll-triggered reveals,
  no ambient animation, no decorative glow. The band scanline texture is static.
- **`prefers-reduced-motion: reduce`** collapses all animation and transition durations to `.01ms`.
- Switching day tabs, toggling filters, and awarding points are all instant — no loading or error
  states, since there is no backend.
- Saving a new event selects the day tab the event lands on.

## State Management
All state is local React state — no persistence, no fetching.

| State | Shape | Notes |
|---|---|---|
| `role` | `'student' \| 'exec'` | Dev switcher only; replace with real auth. |
| `day` | `25 \| 26 \| 27` | Selected day tab. |
| `filters` | `{ [category]: boolean }` | All true by default. |
| `events` | `Event[]` | Mock data; becomes the API payload. |
| `openId` | `string \| null` | Which event's detail modal is open. |
| `tab` | `'detail' \| 'history'` | Modal body. |
| `form` | `FormState \| null` | Create/edit form; `mode: 'create' \| 'edit'`. |
| `errors` | `{ field: message }` | Populated on submit. |
| `menuFor`, `confirmScore`, `editScore`, `formConfirm` | ids / booleans | Per-row menu, delete confirm, inline score edit, event delete confirm. |
| `award` | `{ team, segment, points, desc }` | Award form. |
| `awardErr` | `string` | Award validation message. |

**Event shape:** `{ id, title, short, desc, access, captain, cat, loc, ongoing, start: Date,
end: Date, scores: Score[], created: {by, at}, edited: {by, at} | null, history: HistoryEntry[] }`

**Score shape:** `{ id, team, segment, points, by, at, desc, revoked }`

**History entry:** `{ id, verb: 'created'|'edited'|'awarded'|'deleted', actor, at, text,
diff: { label, from, to } | null }`

Data the real implementation will need from the API: events for a date range with their scores and
audit history; create/update/delete event; create/update/revoke score entry. Revoking must be a
soft delete — the UI relies on revoked entries remaining readable.

## Design Tokens

**Colours**
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0b1310` | Page background — near-black with a green cast |
| `--bg-raised` | `#101a15` | Cards, panels |
| `--chrome` | `#1a1c1a` | Top nav bar (neutral charcoal, deliberately not green) |
| `--band` | `#093325` | Dark forest-green banner behind page titles |
| `--accent` | `#6ee787` | Nav links, active states, borders, focus rings, positive points |
| `--accent-dim` | `#3f8f57` | Secondary text, inactive states, hairlines |
| `--cream` | `#e9f5cd` | Headings and high-emphasis text |
| `--text` | `#c6d6c0` | Body text |
| `--text-muted` | `#7f9482` | Timestamps, metadata, captions |
| `--hair` | `rgba(63,143,87,.32)` | Hairline borders |

Row separators use `rgba(63,143,87,.18)`. Hover washes: `#17251d` (on `--bg`), `#141f19` (rows),
`rgba(110,231,135,.035)` (rail). Filled-accent buttons use `#07130d` for their label.

**Category colours** (CRT phosphor hues, chosen to never be confused with the interface green):
| Category | Hex |
|---|---|
| Competition | `#ffd23f` amber |
| Meals | `#ff7b54` coral |
| Administration | `#4cc9f0` cyan |
| Custom | `#c77dff` violet |

`--coral` `#ff7b54` doubles as the error / destructive / negative-points colour. Category fills are
the colour at 12% alpha; category borders at 40% alpha.

**Typography** — two retro faces, both from Google Fonts in the prototype:
- **Display** — `Pixelify Sans` (chunky pixel/arcade). Page titles, event titles in the detail,
  point values, times, day labels. Anything in the register of Jersey 25 or Silkscreen substitutes.
- **UI / body** — `IBM Plex Mono`. Nav, labels, descriptions, timestamps. Departure Mono or
  JetBrains Mono substitute.

Scale — deliberately cliffed, with no gentle gradient between: page title 56px → event detail title
38px → section/day headings 26px → body 14px → metadata 12px → labels 10–11px. Uppercase labels
carry `letter-spacing: .09em`–`.18em`; body text is normal tracking.

**Spacing:** 6 / 7 / 10 / 14 / 18 / 22 / 24 / 26 / 30 / 40px. Panel padding 18–22px, modal padding
`26px 30px`, main padding `26px 40px 80px`.

**Radius:** 0 everywhere — hard edges are the point. The single exception is the app frame,
`14px 14px 0 0`, plus the 50% circles on the logo and avatar.

**Shadows:** none in the product UI. The dev role switcher uses `0 8px 24px rgba(0,0,0,.5)`; the
active nav item's 3px underline is a `box-shadow`, not a real shadow.

## Assets
Two placeholders that need the real thing:
- **ECSESS logo mark** — currently a 36px circle with a 1px `--accent-dim` border and the letters
  `ECS`. Swap in the real circular logo.
- **Avatar** — a 34px `#4a5cd6` circle with a generic outline person glyph. Swap in the real avatar.

All other icons (bell, calendar, clock, pin, chevrons, close) are inline 14–22px stroke SVGs at
stroke-width 1.6–2.2 — replace with the codebase's icon set at the same weight and size.

Mock content is invented but ECSESS-plausible: ongoing **Scunts** and **Damn Things**; Day 1
Captains Challenge, Opening ceremony; Day 2 Park Day, CS Games comp, Chicken Rush, Boiler Room;
Day 3 Pancake kegger, Mini forge, Ultimate Rallies, BOAT races and closing ceremonies. `CS Games comp`
carries four score entries — including one negative correction and one revoked entry — so the scoring
table shows its full range. Replace all of it with real data.

Copy is plain and direct throughout: sentence case in body text, uppercase reserved for labels and
section headers, no exclamation marks, no marketing voice. Keep that voice.

## Files
- `ECSESS Games Schedule.dc.html` — the complete prototype: chrome, banner, filters, ongoing strip,
  day tabs, day list, upcoming rail, event detail modal, scoring panel, history view, create/edit
  form, and the dev role switcher. Open it in a browser to interact with every state.
