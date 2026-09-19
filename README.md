# Adanse Frontend

A guided thesis workflow: research context → dataset → analysis plan → results (quantitative + qualitative) → Chapter 4 → follow-up research chat. React 18 + Vite, talking to the [adanse-backend](../backend) FastAPI API and directly to Supabase Auth.

## Architecture

- **React 18 + Vite** — no Redux/state library; each major flow owns its state in a single custom hook (`useThesisWorkflow`, `useCredits`)
- **`react-router-dom`**, used narrowly — only 4 real routes exist (`/payment/callback`, `/privacy`, `/terms`, `/reset-password`), each rendering independently of auth state since a Paystack/email redirect can't rely on in-memory SPA state surviving. Everything else falls through to `<App />`, which is its own `step`-based screen switch (no further routing) driven by `useThesisWorkflow`.
- **Supabase JS client**, created once in `supabaseClient.js` — the frontend authenticates directly against Supabase Auth; this app's own backend never issues sessions, it only verifies the resulting JWT (see [adanse-backend's auth model](../backend/README.md#auth))
- **`reactflow`** — powers the draggable code→theme grouping graph in the qualitative review step
- One global stylesheet (`styles.css`), no CSS modules or CSS-in-JS

## Directory structure

```
src/
  main.jsx                  ReactDOM root: BrowserRouter + AuthProvider wrapping App
  App.jsx                   top-level layout, auth gating, the `step` screen switch
  AuthContext.jsx           wraps every Supabase Auth call (sign in/up, OTP, reset, sign out)
  api.js                    the one fetch client for the FastAPI backend (see API client)
  supabaseClient.js         creates the Supabase JS client from VITE_SUPABASE_*
  errors.js                 maps thrown api.js errors to user-facing copy
  otp.js                    pure state helpers for the 8-box signup OTP input
  passwordValidation.js     shared password-strength rule, used by signup/reset/change-password
  styles.css                global stylesheet (~4700 lines, ~50 sections, :root design tokens)
  chapter4-preview.css      grayscale override so the in-app Chapter 4 preview matches the .docx

  hooks/
    useThesisWorkflow.js    owns the entire project/dataset/plan/analysis/qualitative lifecycle
    useCredits.js           balance, transaction history, Paystack checkout + return-verification

  components/
    ThesisSetup.jsx          step 1: title/objectives/research questions/hypotheses/methodology
    UploadZone.jsx            drag-and-drop / click-to-browse dataset picker
    ColumnPreview.jsx         post-upload column/type preview table
    DatasetReview.jsx         cleaning report, grouping confirmation, validate/activate
    ThesisWorkspace.jsx       analysis plan, qualitative data-source selection + objective tagging,
                               quantitative results, qualitative review entry points
    QualitativeReview.jsx     the interactive Braun & Clarke coding/theme-review flow, one column
                               at a time (accept/decline codes, drag-regroup themes, merge/split,
                               define, finalize)
    Chapter4.jsx               live in-browser preview of the generated chapter (mirrors the
                               backend's .docx section-for-section)
    chapter4/resultsTransform.js   pure formatting/synthesis functions shared by Chapter4.jsx —
                               deliberately kept in sync with generate_chapter() on the backend
    AuthScreen.jsx            sign-in / sign-up / OTP verification, all in one screen
    ResetPassword.jsx         real route, landing page for the Supabase password-reset email link
    Account.jsx                change password + sign out
    Credits.jsx                 balance, transaction list, package purchase
    CreditActionButton.jsx    reusable button for any credit-charging action — shows live cost,
                               blocks on insufficient balance, confirms if the action would zero it
    ConversationSidebar.jsx   conversation list grouped by day, new/select/delete, account/credits
    WelcomeModal.jsx           one-time post-signup modal showing the starting credit balance
    ParticleField.jsx          decorative canvas background (auth/landing screen only)
    PaymentCallback.jsx        real route, the page Paystack's redirect lands on directly
    LegalPage.jsx               shared shell + tiny hand-rolled markdown renderer
    PrivacyPolicy.jsx / TermsOfService.jsx   feed ../legal/*.md into LegalPage

  legal/
    privacy-policy.md, terms-of-service.md
```

## Local setup

```powershell
npm install
npm run dev
```

Copy `.env.example` to `.env`:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_BASE=http://127.0.0.1:8000/api/v1
VITE_SITE_URL=
```

These are the **only** environment variables the frontend reads. `VITE_API_BASE` falls back to `http://127.0.0.1:8000/api/v1` if unset; `VITE_SITE_URL` is optional and falls back to the browser's own origin (see [Auth integration](#auth-integration)). Dev server runs on port 5173 (`vite.config.js`); no path aliases, no custom env prefix.

## Product flow

Research context → Dataset (upload, clean, review, activate) → Analysis plan (quantitative, auto-built; qualitative, researcher-selected and optionally tagged to objectives) → Run analysis → Results (quantitative cards + qualitative Braun & Clarke review, per column) → Chapter 4 (preview + download) → follow-up research chat.

The authentication screen intentionally stays restrained and simple. The thesis workspace is more structured than a generic chatbot: Adanse asks for the research context first, profiles the dataset itself, proposes supported methods with its reasoning shown, and only produces the Word chapter once the researcher has reviewed and confirmed the qualitative findings.

## Routing & screens

`main.jsx` wraps everything in `BrowserRouter`. Four routes render independently of the app's own auth/step state (because Paystack and email-link redirects land on a fresh page load, not mid-session):

- `/payment/callback` → `PaymentCallback.jsx`
- `/privacy` → `PrivacyPolicy.jsx`
- `/terms` → `TermsOfService.jsx`
- `/reset-password` → `ResetPassword.jsx`

Everything else (`/*`) renders `<App />`. Inside `App.jsx`: `authLoading` → a full-screen loading state; no `user` → `AuthScreen`; otherwise the sidebar + main layout, where a `step` value (state, not a route) selects the screen:

| `step` | Renders |
|---|---|
| `setup` | `ThesisSetup` |
| `upload` | inline upload + column-preview section |
| `review` | `DatasetReview` |
| `workspace` | `ThesisWorkspace` |
| `chapter4` | `Chapter4` |
| `account` | `Account` |
| `credits` | `Credits` |

A `progress-steps` bar (Research / Dataset / Analysis / Chapter 4) tracks the main flow; `account`/`credits` are treated as overlay "settings pages" that hide it.

## API client (`api.js`)

`request(path, {method, body, formData, retry})` is the shared client: injects `Authorization: Bearer <supabase access token>` (via `supabase.auth.getSession()`), retries exactly once on a 401 by refreshing the session, parses JSON tolerantly, and throws an `Error` with `.status`/`.code`/`.details` from the backend's `detail` field on any non-OK response. `downloadChapter4` is hand-rolled separately since it needs the raw response as a `Blob` plus the credit-usage headers.

Grouped by area:

- **Conversations/messages**: `listConversations`, `createConversation`, `getConversation`, `deleteConversation`, `updateConversation`, `listMessages`, `addMessage`, `chat`
- **Thesis project**: `createThesisProject`, `getThesisProject`, `updateThesisProject`
- **Dataset / dataset versions**: `uploadThesisDataset`, `listDatasetVersions`, `getDatasetVersion`, `validateDatasetVersion`, `activateDatasetVersion`, `applyDatasetGroupings`
- **Analysis plan**: `buildAnalysisPlan`
- **Qualitative data source selection**: `selectQualitativeColumns(id, columns, columnObjectives)`
- **Qualitative review** (Braun & Clarke stages 3–6): `getQualitativeSession`, `submitCodeReview`, `groupCodesIntoThemes`, `submitThemeReview`, `defineQualitativeThemes`, `finalizeQualitativeThemes`
- **Run / Chapter 4**: `runThesisAnalysis`, `downloadChapter4`
- **Credits/payments**: `getCredits`, `getCreditTransactions`, `checkoutCredits`, `verifyCreditPayment`

## Auth integration

`supabaseClient.js` creates the one Supabase client from `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (warns to console and falls back to placeholders rather than crashing if unset). `AuthContext.jsx` wraps every auth operation — sign in, sign up (stamps `needs_welcome: true` for the one-time `WelcomeModal`), email OTP verify/resend, password reset, password update, sign out — and subscribes to `supabase.auth.onAuthStateChange` to keep the user in sync across tabs. `api.js` independently pulls the access token per-request rather than sharing a cache with `AuthContext`; both just ask the Supabase SDK directly, which is safe since the SDK itself caches/refreshes the session.

`AuthContext.resetPasswordForEmail`'s redirect is env-driven: it uses `VITE_SITE_URL` when set, falling back to `window.location.origin` otherwise, so production, Vercel previews, and local dev each redirect back to themselves.

## Styling

Single global `src/styles.css`, organized into ~50 commented sections, plus `src/chapter4-preview.css` (must load after `styles.css`) which grays out the in-app Chapter 4 preview to match the downloaded document's appearance. Design tokens, all on `:root`: `--bg`, `--surface`, `--ink`, `--muted`, `--line`, `--gold`, `--gold-soft`, `--green`, `--green-soft`, `--red`, `--red-soft`, `--shadow`, `--display` (Space Grotesk), `--body` (DM Sans), `--sidebar-width`.

## Testing

```powershell
npm test
```

Runs `node --test src/**/*.test.js` — Node's built-in test runner (`node:test` + `node:assert/strict`), no external test framework. Flat `test("description", () => {...})` blocks per file, no `describe`/nested suites. Current coverage: `otp.test.js` (signup OTP input state helpers) and `components/chapter4/resultsTransform.test.js` (the Chapter 4 formatting/synthesis functions, including the researcher-tag-based objective↔theme relevance logic — deliberately kept behaviorally identical to the backend's `generate_chapter()`).

## Deployment

`vercel.json` is a single SPA-fallback rewrite (`/(.*)` → `/index.html`). `.github/workflows/ci.yml` runs on every push/PR to `main`/`develop`, running `npm test` and `npm run build`; Vercel is configured to require that check before deploying. The production site is deployed by Vercel from `main`.
