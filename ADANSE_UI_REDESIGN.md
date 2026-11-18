# Adanse UI Redesign Spec

## 0. Instructions for the agent

You are redesigning the frontend of **Adanse**, a thesis data-analysis app (Research → Dataset → Analysis → Chapter 4). The current beta UI looks like generic AI-generated design. Replace it with a calm, dense, academic "workbench" look.

**Hard rules**
1. **Use the UI libraries already in the codebase.** Do not add new component libraries. Inspect `package.json` first and list what is installed. Map every token and component below to those libraries' theme/override system (theme config, CSS variables, or SCSS variables, whichever applies).
2. **Do not change business logic, API calls, routing, or data models.** This is a presentation-layer change only.
3. Work in small steps: tokens → app shell → stepper → Research step → Dataset → Analysis → Chapter 4. Commit after each.
4. Keep all existing functionality working. Run the existing tests/build after each step.
5. If something in this spec conflicts with an existing component's behaviour, keep the behaviour and adapt the styling.

**Fonts:** self-host or load via the project's existing font mechanism. If new fonts can't be added, fall back to the stacks listed below.

---

## 1. Design goals

- Feels like a serious research tool (think Jamovi, SPSS, Zotero, RStudio), not a landing page.
- Dense, calm, predictable. The form is visible immediately, with no giant hero.
- Flat and simple, in the spirit of older educational platforms (Moodle / Blackboard era): white pages, solid colours, 1px borders, small corners, underlined links, plain tables.
- Neutral base with the Adanse logo gold as the single brand colour.
- No decoration for its own sake: no shadows, gradients, glows, pills or animation flourishes.

## 2. What to remove (the "AI look")

- Giant tight-tracked hero headings.
- Small uppercase letter-spaced eyebrow labels (e.g. `01 · RESEARCH CONTEXT`, `OPTIONAL · FILL IN FROM MY CHAPTERS`, sidebar `PINNED` / `OLDER`).
- Cream/beige page background and oversized rounded containers.
- Large dashed drop-zone boxes.
- Marketing copy ("we'll map your research to the data").
- Gradients, glows, sparkle icons, and any box shadows.
- Large rounded corners and pill shapes.
- Decorative patterns (no kente stripe, no ornamental graphics). The existing logo is the only brand mark.
- Spinners as the default loading state (see section 9b).
- Four plain coloured bars as the step indicator.
- Default browser scrollbar arrows in the sidebar.

## 3. Design tokens

### Colour

**The brand gold must come from the logo.** Sample the exact gold from the Adanse logo file and set it as `--brand`. If the logo file cannot be read, use `#D9A520`. Do not invent a different gold.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FFFFFF` | Page background |
| `--surface` | `#F4F5F7` | Sidebar, side panels, table headers |
| `--border` | `#D9DDE3` | All 1px borders and dividers |
| `--text` | `#222222` | Primary text |
| `--text-muted` | `#5A6270` | Helper text, metadata |
| `--brand` | logo gold | Primary button fill, active step, active sidebar marker, top bar rule |
| `--brand-hover` | `--brand` darkened ~10% | Hover/pressed |
| `--brand-soft` | `--brand` at ~12% on white | Selected sidebar item, subtle highlights |
| `--on-brand` | `#222222` | Text on a gold fill (dark, never white) |
| `--link` | `#1F5FA6` | Links (underlined) and focus rings |
| `--success` | `#2E7D32` | Completed step, success states |
| `--warning` | `#B26A00` | Inline data warnings |
| `--danger` | `#C62828` | Errors, destructive actions |

Rules:
- Gold is a **fill or rule only**. Never use gold as text colour on white (it fails contrast).
- Text on gold is always dark.
- Links are classic blue and underlined, like older educational sites.
- Every colour is a flat solid. No gradients, no transparency tricks.

### Typography

- **Interface and all headings:** `"Source Sans 3", "Segoe UI", Arial, sans-serif`. Plain, no display fonts.
- **Chapter 4 document view only:** `"Source Serif 4", Georgia, "Times New Roman", serif`, because that page should look like a thesis.
- **Mono (data values, column names):** `"IBM Plex Mono", Consolas, monospace`

| Role | Size | Weight |
|---|---|---|
| Page title | 22px | 600 |
| Section heading | 16px | 600 |
| Body / form | 14–15px | 400 |
| Helper text | 13px | 400, `--text-muted` |
| Table | 13–14px | 400 |

Sentence case everywhere. No uppercase transforms, no letter-spacing, no negative tracking.

### Shape and spacing

- Radius: **3px** for inputs, buttons, panels, cards, tags and menus. No pills. Circles only for the avatar and stepper numbers.
- Borders: 1px solid `--border`.
- Shadows: **none anywhere**, including menus and modals (they use a 1px border).
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32.
- Max content width: 1200px, centred.

### Identity

- Use the **existing Adanse logo as is**, top-left of the sidebar, next to the word "Adanse".
- The top bar is white with a **3px solid `--brand` bottom border**. That is the only brand flourish. No patterns or ornaments.

---

## 4. App shell

```
┌───────────────┬──────────────────────────────────────────────┐
│ Sidebar 240px │ Top bar: [Project title (editable)]  [Stepper]│
│               ├──────────────────────────────────────────────┤
│               │ ━━━━ 3px gold rule ━━━━                      │
│               ├──────────────────────────────────────────────┤
│               │ Main content                                  │
└───────────────┴──────────────────────────────────────────────┘
```

### Sidebar (240px, `--surface`, right border)

- Top: logo + "Adanse", then a full-width primary button **"New analysis"** (brand fill, 3px radius, normal size. Not a giant button).
- List of analyses, grouped under sentence-case group headings by project (e.g. "Pinned", "Earlier"). Group headings are 12–13px muted, normal case.
- Each item shows:
  - **Title** (auto-generated, see below), single line, ellipsis on overflow with full title in a tooltip.
  - **Meta line:** date + a small status tag (`Draft`, `Dataset added`, `Analysed`, `Chapter 4 ready`).
- **Auto-title rule:** use the research title if set, else the first objective truncated to ~50 chars, else "Untitled analysis" + date. Never show multiple identical "New Analysis" rows.
- Hover reveals pin and delete icons (small, muted). Active item gets `--brand-soft` background and a 2px left border in `--brand`.
- Custom thin scrollbar (8px, `--border` thumb, transparent track). No arrow buttons.
- Bottom: user row (avatar initials, name truncated) and credits as one quiet muted line: `38,684 credits`. Not bold, not prominent.

### Top bar

- Left: editable project title (inline edit, sans, 20px, 600). Subtitle shows study status in muted text.
- Right/below: **Stepper** (see below).
- Height ~56px, white, 3px solid `--brand` bottom border.

### Stepper

Horizontal, 4 steps: **Research → Dataset → Analysis → Chapter 4**.

- Each step: numbered circle (24px) + label.
- States: **done** = green circle with check icon, **current** = `--brand`-filled circle with a dark number and bold label, **upcoming** = outlined grey circle with muted label.
- Steps are connected by a 1px line (solid in green for completed segments, grey for the rest).
- Completed steps are clickable. Upcoming steps that are not yet reachable are disabled with a tooltip explaining what is needed.

---

## 5. Research step (main focus)

**Two-column layout** inside main area: form (≈60%) and "Your study so far" summary panel (≈40%). Collapses to one column under 1024px, with the summary moving to a collapsible section above the form.

### Left: form

Page title (22px, 600): **Research details**. One-line muted helper: "Describe your study. Adanse uses this to choose suitable statistical tests."

1. **Import from Chapters 1–3** (optional): a compact single row with border, icon, text "Upload Chapters 1–3 (.docx) to fill these fields automatically", and a secondary button **"Choose file"**. Still supports drag-and-drop onto the row, but no large dashed box. After upload, show a review list: each extracted item (objective, question, hypothesis, sample size) with a checkbox and an **"Add selected"** button, so the user chooses what to add (keep existing behaviour).
2. **Study title**: text input.
3. **Objectives**: add/remove list. Each row is an input with a remove icon; "Add objective" text button below.
4. **Research questions**: same pattern.
5. **Hypotheses**: same pattern, with an optional H0/H1 label per row if the data model supports it.
6. **Planned sample size**: number input, narrow width.

Each field: label (14px, 500 weight, sentence case), helper text beneath in muted 13px where useful, inline validation errors in `--danger`.

Sticky footer bar at the bottom of the form column: right-aligned primary button **"Save and continue"**, secondary **"Save draft"** on its left. White background, top border.

### Right: "Your study so far" panel

- `--surface` background, 1px border, 3px radius, sticky.
- Title: "Your study so far" (17px, 600).
- Builds **live** as the user types: study title, numbered objectives, numbered research questions, hypotheses, sample size.
- Empty items shown as muted "Not added yet".
- Optional small completeness line at the bottom, e.g. "3 of 5 sections filled". Keep it plain text, no progress rings.

---

## 6. Dataset step

- Page title: **Dataset**.
- Upload row (compact, same pattern as Research import).
- After upload: a **table preview** (first 50 rows, virtualised if large), sticky header on `--surface`, monospace values, row numbers.
- Column header shows name + a **type selector** (Numeric / Categorical / Ordinal / Text / Date) so users can correct detected types. Detected type shown as a small tag.
- Right side or top: dataset summary (rows, columns, missing values count).
- **Inline warnings** (missing values, constant columns, suspicious types) as bordered alert rows with `--warning` left border, listed above the table. Not toasts.
- Primary button: "Save and continue".

## 7. Analysis step

- Page title: **Analysis**.
- One **card per test**, 1px border, 3px radius, stacked vertically:
  - Header: test name (e.g. "Independent samples t-test") + the objective/hypothesis it relates to.
  - One plain-language sentence: **why this test was chosen**.
  - Assumption checks as a compact list with ✓ / ⚠ icons.
  - Output table(s): APA-style (no vertical lines, top/bottom rules, italic statistics, 2–3 decimal places).
  - Footer actions: "Re-run", "Change test", "Exclude from Chapter 4" as text/secondary buttons.
- Charts use the neutral palette plus the brand gold. No gradients, with clear axis labels.

## 8. Chapter 4 step

- Document-style view: a white "page" (max-width ~820px, centred on `--surface` background, 1px border, subtle padding 48px) using the serif font at 16px / 1.6 line-height.
- Headings numbered like thesis sections (4.1, 4.2…). Tables styled APA.
- Left or right narrow outline (table of contents) of sections.
- Top-right actions: primary **"Export .docx"**, secondary "Copy section".
- Edits to text are allowed if the current implementation allows them. Preserve that behaviour.

---

## 9. Component styling checklist

- **Buttons:** primary = `--brand` fill, `--on-brand` (dark) text, 1px border in a darker gold, 3px radius, 34px height, 14px/600. Secondary = white with 1px `--border`. Text button = `--link` coloured, underlined on hover. Focus ring 2px `--link` with 2px offset.
- **Inputs:** 36px height, 1px `--border`, 3px radius, focus border `--link` + 2px outline. Label above, never floating labels.
- **Tags/status:** 12px text, 3px radius, flat tinted background (`--brand-soft` for draft, light green for complete, light grey for neutral).
- **Tables:** no zebra striping by default, 1px horizontal row dividers, `--surface` header, hover row `#FAFAFB`.
- **Alerts:** bordered row with 3px left accent line, icon, text, no heavy fills.
- **Modals/menus:** white, 1px border, 3px radius, no shadow.
- **Icons:** one consistent outline set (use whatever the codebase already has). Size 16–20px. No sparkles or "magic" icons.
- **Motion:** 120–160ms ease for hover/focus and step changes only. No bouncing, shimmer or animated gradients.

## 9b. Loading states (skeletons, not spinners)

**Use skeletons** wherever the shape of the content is known before it arrives:

| Place | Skeleton |
|---|---|
| Sidebar analysis list | 5–6 rows: one long bar (title) and one short bar (date/status) |
| Opening a project / step | Page title bar plus the form field layout (label bar + input box) |
| "Your study so far" panel | Heading bar plus 4–5 text bars |
| Dataset table preview | Header row plus ~8 rows of cell blocks matching column widths |
| Analysis cards | Card outline with a title bar, one sentence bar and a table block |
| Chapter 4 document view | White page with heading bars and paragraph bars |

**Style:** flat blocks in `#E6E9ED`, 3px radius, matching the final element sizes so nothing jumps when real content loads. Use a slow, subtle opacity pulse (1.5s, between 100% and 60%) or none at all. No shimmer gradients. Disable the pulse under `prefers-reduced-motion`.

**Timing:** only show a skeleton if loading exceeds ~200ms, to avoid flashing. Keep it visible for at least ~300ms once shown.

**Do not use skeletons for:**
- **Buttons while saving:** keep the button in place, disable it, and change its label ("Saving…"). No spinner inside.
- **File uploads:** show a determinate progress bar with the percentage and file name.
- **Running analysis or generating Chapter 4:** show a progress bar plus a plain status line ("Running test 2 of 5: Independent samples t-test"). These are long tasks where progress information matters more than a placeholder.
- **Very small refreshes** (e.g. refreshing credits): update in place, no loader.

If a skeleton component already exists in the installed libraries, use it with the styling above. Otherwise create one small shared `Skeleton` component and reuse it everywhere.

---

## 10. Copy guidelines

- Plain, specific, sentence case. Examples: "Research details", "Upload Chapters 1–3 (.docx)", "Save and continue", "Add objective".
- No marketing or hype language, no exclamation marks, no emoji.
- Helper text explains what to enter, not how clever the app is.
- Errors say what happened and how to fix it.

## 11. Responsive and accessibility

- Breakpoints: ≥1280 full layout; 1024–1279 narrower sidebar (200px) and summary panel; <1024 sidebar becomes a drawer and Research becomes a single column; <640 stepper collapses to "Step 2 of 4: Dataset".
- Text contrast WCAG AA minimum. Verify `--on-brand` on `--brand`, and `--link` on white, both meet AA.
- All interactive elements keyboard reachable with visible focus. Stepper uses proper `aria-current="step"`. Form errors linked with `aria-describedby`.
- Respect `prefers-reduced-motion`.

## 12. Deliverables and acceptance criteria

**Deliverables**
1. Theme/token file(s) implementing section 3 using the existing libraries' theming system.
2. Updated app shell (sidebar, top bar with gold rule, stepper).
3. Redesigned Research step with live summary panel.
4. Restyled Dataset, Analysis and Chapter 4 steps.
5. A short `CHANGELOG-UI.md` listing files touched and any spec items that could not be implemented with the existing libraries and why.

**Acceptance criteria**
- No hero-sized headings, no uppercase eyebrow labels, no cream background, no dashed giant upload box.
- The Research form is fully visible above the fold on a 1080p screen without scrolling past a hero.
- No two sidebar items show the same default title.
- Stepper shows done / current / upcoming states correctly.
- Gold is only ever a fill or rule (primary button, active step, active sidebar marker, top bar rule), never text. Links are blue and underlined.
- No box shadows and no corner radius above 3px anywhere.
- Loading states use skeletons where specified in section 9b, not spinners.
- All existing features still work and the build/tests pass.
