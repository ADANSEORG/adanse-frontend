# Adanse landing and auth pages: scale-up spec

Companion to `ADANSE_UI_REDESIGN.md`. That file's tokens (flat, `--brand` gold from the logo, 3px radius, no shadows, sentence case, sans-serif) still apply. This file replaces the landing and sign-in layout only.

## 0. Problem to solve

The current page is clean but **too small and too empty**. The old page felt strong because it was big and filled the screen. The new one has small text, small inputs, a narrow content area and large dead gaps (about 100px under the gold rule and above the card). We want the old page's presence **without** its AI look: no cream background, no network dots, no 80px headline, no uppercase eyebrow labels.

Presence comes from three things only: **larger type, a layout that fills the viewport, and strong contrast between the two halves.** Do not add decoration to get it.

## 1. Rules for the agent (read first)

1. **Commit or stash the current state before starting**, so there is a rollback point. Tell me the commit hash.
2. Touch only the landing page, sign-in, create-account and forgot-password pages and their shared layout/CSS. Nothing in the logged-in app.
3. Do not change auth logic, routes, copy, colours or fonts. Only layout, sizes and spacing as specified below.
4. Do not add new elements, icons, images, patterns or animations.
5. Do the work in the order of section 5 and take a screenshot after each step. Stop and report if a step does not match.
6. Use exact values from this file. If a global rule (for example a global `h1` style or a `clamp()`) overrides a value, override it with a more specific selector. Do not use `!important` unless there is no other way.
7. When finished, list every file changed.

## 2. Layout: full-viewport split

```
┌──────────────────────────────────────────────────────────────┐
│ [A] Adanse                                thesis data analysis│  header 72px
├══════════════════════════════════════════════════════════════┤  3px --brand rule
│ LEFT PANEL (--surface)          │  RIGHT PANEL (white)        │
│ Thesis data analysis            │      ┌──────────────────┐   │
│ lede paragraph                  │      │ Sign in card      │   │  fills remaining
│ 01 Ask naturally                │      │                   │   │  viewport height,
│ 02 Analyse with confidence      │      └──────────────────┘   │  content vertically
│ 03 Understand the result        │                             │  centred
├──────────────────────────────────────────────────────────────┤
│ Adanse  Research, made clearer.        Privacy  Terms         │  footer 64px
└──────────────────────────────────────────────────────────────┘
```

- Page is a column flex layout with `min-height: 100vh`. The split area gets `flex: 1`, so on a tall screen it stretches and the footer sits at the bottom.
- Split: two columns, `grid-template-columns: 1.15fr 1fr`. Both fill the full height of the split area, edge to edge, no gap between them.
- Left panel background `--surface`, with a 1px `--border` on its right edge. Right panel background `--bg` (white).
- Both panels centre their content vertically (`align-items: center`). This removes the dead gap under the gold rule.

### Shared gutter (this is what keeps everything aligned)

Define once and use for the header, the footer, the left panel's left padding and the right panel's right padding:

```css
:root { --page-gutter: max(40px, calc((100vw - 1280px) / 2 + 40px)); }
.site-header, .site-footer { padding-left: var(--page-gutter); padding-right: var(--page-gutter); }
.panel-left  { padding: 56px 56px 56px var(--page-gutter); }
.panel-right { padding: 56px var(--page-gutter) 56px 56px; display: flex; justify-content: flex-end; align-items: center; }
```

Result: logo, title, steps and the footer's left text share one left edge. The gold rule, the card's right edge and "Terms of Service" share one right edge. The gold rule spans the same width as the header content (`margin: 0 var(--page-gutter)`), or full width. Pick one and keep it the same on every page.

## 3. Sizes (scale-up)

### Header and footer
- Header: height 72px. Logo mark 36px, wordmark 24px / 600. Right text 15px muted.
- Gold rule: 3px solid `--brand`.
- Footer: height 64px, 14px muted text, top border 1px `--border`, flex `space-between`. Left: "Adanse" + "Research, made clearer." with a 16px gap. Right: "Privacy Policy" + "Terms of Service" with a 24px gap, muted, underline on hover only.

### Left panel
```css
.landing-title { font-size: clamp(36px, 3.4vw, 52px); line-height: 1.1; font-weight: 700; letter-spacing: 0; margin: 0 0 16px; }
.landing-lede  { font-size: 19px; line-height: 1.6; color: var(--text-muted); max-width: 560px; margin: 0 0 36px; }
.step          { display: grid; grid-template-columns: 40px 1fr; padding: 22px 0; border-top: 1px solid var(--border); }
.step:last-child { border-bottom: 1px solid var(--border); }
.step-number   { font-size: 18px; font-weight: 600; color: var(--text-muted); }
.step-title    { font-size: 20px; font-weight: 600; }
.step-desc     { font-size: 16px; color: var(--text-muted); margin-top: 4px; }
```
The title must **wrap inside its column and never overlap the card**: the left column needs `min-width: 0`. Do not use `white-space: nowrap`. Maximum title size is 52px at any width.

### Sign-in card
```css
.signin-card { width: 100%; max-width: 460px; padding: 36px 40px; background: var(--bg); border: 1px solid var(--border); border-radius: 3px; box-shadow: none; }
.signin-card h2 { font-size: 26px; font-weight: 600; margin: 0 0 8px; }
.signin-card .subtitle { font-size: 16px; color: var(--text-muted); margin: 0 0 24px; }
.signin-card label { font-size: 15px; font-weight: 600; display: block; margin: 0 0 6px; }
.signin-card input, .signin-card .btn { height: 48px; font-size: 16px; border-radius: 3px; }
.signin-card .field + .field { margin-top: 18px; }
.signin-card .forgot { display: inline-block; margin: 10px 0 20px; padding: 0; font-size: 14px; }  /* flush with input edge */
.signin-card .divider { margin: 20px 0; }
.signin-card .footer-line { font-size: 14px; margin-top: 16px; }
.signin-card .note { font-size: 13px; color: var(--text-muted); margin-top: 12px; }
```
- Remove the small "Welcome back" label. Card title is "Sign in to Adanse".
- Sign in button: `--brand` fill, `--on-brand` text, 16px / 600. Use the same `var(--brand)` as the header rule and logo (find and remove any hard-coded gold hex values).
- Google button: white, 1px `--border`, 16px / 600.

### Compact mode for short screens
```css
@media (max-height: 760px) {
  .signin-card { padding: 24px 32px; }
  .signin-card input, .signin-card .btn { height: 42px; font-size: 15px; }
  .signin-card .field + .field { margin-top: 12px; }
  .landing-title { font-size: 36px; }
  .step { padding: 14px 0; }
}
```

### Narrow screens
- Under 1000px: stack the panels. The card (right panel) comes first, the left panel below it. Panels become full width, `--surface` stays on the left panel.
- Under 640px: card padding 24px 20px, title 32px, hide the steps' descriptions if space is tight.

## 4. Other auth pages

Create account and Forgot password use exactly the same shell (header, split, footer, gutter). Only the card contents change. The left panel stays identical on all three so the page feels stable when the user moves between them.

## 5. Order of work

1. Add `--page-gutter` and the shared header/footer so every edge aligns. Screenshot.
2. Build the full-height split with the two panel backgrounds. No size changes yet. Screenshot.
3. Apply the left panel sizes. Screenshot.
4. Apply the card sizes and the compact-mode media query. Screenshot.
5. Apply the narrow-screen behaviour. Check at 900px and 600px wide.
6. Apply the same shell to Create account and Forgot password.

## 6. Acceptance checklist

Check at three viewport sizes: **1366x768, 1536x864 and 1920x1080**.

- [ ] No dead gap under the gold rule. The content is vertically centred in the split area.
- [ ] The whole card, including "Create one" and the "Your research is associated with your account" note, is visible without scrolling at 1536x864 and larger. At 1366x768 it may scroll by no more than the footer height.
- [ ] Title is at most 52px, wraps inside the left panel and never touches the card.
- [ ] Body text 16px or larger everywhere in the card and steps, inputs and buttons 48px high (42px in compact mode).
- [ ] The logo, title, steps and footer text share one left edge. The gold rule, the card and "Terms of Service" share one right edge.
- [ ] "Forgot password?" is flush with the left edge of the inputs.
- [ ] Gold appears only as a fill or rule, and every gold uses `var(--brand)`.
- [ ] No cream background, dots, shadows, uppercase eyebrow labels or radius above 3px.
- [ ] Auth still works (sign in, Google, forgot password, create account).
