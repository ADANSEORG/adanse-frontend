# Adanse UI redesign

Implements `ADANSE_UI_REDESIGN.md` as a presentation-layer change. No API
calls, routing, data models or workflow rules were changed.

## Theme and tokens

- New palette in `src/styles.css`: `--bg #ffffff`, `--surface #f4f5f7`,
  `--border #d9dde3`, `--text #222222`, `--text-muted #5a6270`,
  `--link #1f5fa6`, `--success #2e7d32`, `--warning #b26a00`,
  `--danger #c62828`, and `--radius 3px`.
- `--brand` is `#ebac31`, sampled from `public/logo.svg`; `--brand-hover`,
  `--brand-soft` and `--on-brand` derive from it. Gold is used only as a
  fill or rule, never as text on white.
- Existing token names (`--ink`, `--muted`, `--line`, `--gold`, etc.) remain
  as aliases so older rules keep working.
- Fonts: Source Sans 3 for the interface and headings, Source Serif 4 for
  the Chapter 4 document, IBM Plex Mono for numeric values and tables.
  Loaded with the existing stylesheet's `@import`.
- Removed uppercase transforms, letter-spacing, box shadows, text shadows,
  gradients, display fonts and animation declarations from the old theme.
  Corners are capped at 3px except avatars and stepper numbers.
- Added `src/theme.css`, loaded last from `src/main.jsx`, for the new shell
  and redesigned page structures without rewriting the behaviour-bearing
  stylesheet.

## App shell

- Sidebar is 240px (200px between 1025px and 1279px, drawer below 1024px)
  on `--surface`, with the logo and "Adanse", a normal-size "New analysis"
  button, thin custom scrollbar, and an account row.
- Sidebar items now show an auto-generated title, a date and a status tag.
  The active row has `--brand-soft` and a 2px gold left border. Pin and
  delete stay as muted icons revealed on hover/focus.
- Top bar is white with a 3px gold bottom rule, the project title (20px) and
  study status, plus the four-step stepper. On narrow screens the stepper
  collapses to "Step n of 4" and the sidebar opens as a drawer.
- Stepper: 24px circles, green check for done, gold fill with dark number
  for current, grey outline for upcoming, 1px green/grey connectors,
  `aria-current="step"`, disabled upcoming steps with an explanatory title.
- The old "Continue to Chapter 4" header action is now a compact top-bar
  button on the Analysis screen (hidden below 1180px, where the same action
  remains in the analysis action bar). It still uses `chapter4Gate`.

## Pages

- **Research details**: two-column form and live "Your study so far" panel,
  compact import row with drag-and-drop, editable objective/question/
  hypothesis rows, narrow sample-size input, sticky footer, plain
  completeness line. Below 1024px the summary moves above the form.
- **Dataset**: page head and compact upload row; upload wait uses a status
  line plus a delayed skeleton of the dataset rows. Current-dataset card is
  restyled flat.
- **Analysis**: page head, summary strip, flat planned/complete cards with
  the reason sentence, a compact assumption-check list, and a running
  status line.
- **Chapter 4**: document page max-width 820px on `--surface`, serif at
  16px/1.6, APA-style horizontal table rules, flat outline navigation and a
  compact export bar.
- **Auth**: flat card, 36px inputs, gold submit button, sentence-case
  eyebrow. The decorative particle canvas and marketing hero were removed;
  the sign-in form is now the whole screen. Reset-link and payment checks use
  skeletons instead of spinners.

## Files touched

- `src/styles.css`, `src/chapter4-preview.css`, `src/theme.css`
- `src/main.jsx`, `src/App.jsx`
- `src/components/Stepper.jsx` (new), `src/components/Skeleton.jsx` (new)
- `src/hooks/useDelayedLoading.js` (new)
- `src/components/ConversationSidebar.jsx`, `src/sidebarGroups.js`
- `src/components/ThesisSetup.jsx`, `src/components/ChapterFill.jsx`
- `src/components/UploadZone.jsx`, `src/components/ColumnPreview.jsx`,
  `src/components/DatasetReview.jsx`
- `src/components/ThesisWorkspace.jsx`, `src/components/Chapter4.jsx`
- `src/sidebarGroups.test.js`

## Spec items adapted or not implemented

- **Editable project title**: there is no title-only save path. Reusing the
  Research form save would overwrite the study context, so the top-bar title
  is read-only. A proper inline rename needs a small API addition.
- **"Save draft"**: the app has no draft save; the existing "save on
  continue" behaviour is kept and the footer says so.
- **File upload percentage**: uploads use `fetch` without progress events,
  so the screen shows the upload state and a delayed skeleton instead of a
  determinate bar.
- **Dataset table preview / type selectors**: the frontend only receives
  column metadata (`ColumnPreview`) and review controls; the 50-row
  virtualised table would need row-level data from the API. Existing review
  behaviour and controls are restyled, not replaced.
- **Running analysis progress**: the backend does not stream per-test
  progress, so the screen shows an indeterminate status line rather than
  "test 2 of 5".
- **"Copy section" in Chapter 4**: no copy behaviour exists and adding one
  would be new functionality, so it is omitted; the export action remains.
- **Sidebar status tags**: the conversations endpoint does not include
  workflow state. Conventionally named status fields are honoured when
  present, the active row is filled from the live project state, and
  everything else reads "Draft".
- **Hypothesis H0/H1 labels**: the data model stores hypotheses as plain
  strings, so no per-row label is added.
- **Stepper navigation**: only transitions the existing workflow exposes are
  clickable (Research from any step, Dataset from Analysis, Analysis from
  Chapter 4). Chapter 4 itself is reached through its action bar, as before.
- **Chapter 4 skeleton while generating**: the action bar keeps the button
  label ("Preparing document…") because generation progress is not exposed.
