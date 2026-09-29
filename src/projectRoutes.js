// Pure routing rules for a project (Stage 2 of the real-routes work; Stage 1
// was /account and /credits, see viewRoutes.js). No React, no fetch, no
// storage -- these decide URLs and steps from plain facts so the rules can be
// tested without a browser and reused by both the router and the sidebar.
//
// URL shape: /project/:id/:step, step one of PROJECT_STEPS below. /project/:id
// with no step is transient -- see defaultProjectStep().

export const PROJECT_STEPS = Object.freeze([
  "setup",
  "dataset",
  "review",
  "analysis",
  "chapter4",
]);

const STEP_SET = new Set(PROJECT_STEPS);

export function isProjectStep(value) {
  return STEP_SET.has(value);
}

// RFC 4122 layout (8-4-4-4-12 hex), case-insensitive, any version/variant
// nibble -- conversation ids are Postgres gen_random_uuid() (v4), but this
// does not pin the version so a differently-generated UUID id still passes.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidProjectId(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

/*
 * ---------------------------------------------------------
 * DEFAULT STEP
 * ---------------------------------------------------------
 *
 * Where /project/:id (no step) lands -- the same choice `select()` in
 * useThesisWorkflow.js makes today, as a pure function of the project's own
 * fields. `hasPendingReviewVersion` is not on the project row; the caller
 * gets it from GET .../datasets (see resolveProjectStep below) only when
 * dataset_path is set and active_dataset_version_id is not -- exactly the
 * case today's goReviewPendingDataset() covers.
 */
export function defaultProjectStep(project, { hasPendingReviewVersion } = {}) {
  if (!project) return "setup";

  if (project.analysis_results) return "analysis";
  if (project.analysis_plan) return "analysis";
  if (project.dataset_path && project.active_dataset_version_id) return "dataset";

  if (project.dataset_path) {
    return hasPendingReviewVersion ? "review" : "dataset";
  }

  return "setup";
}

/*
 * ---------------------------------------------------------
 * RESOLVE AN EXPLICIT STEP
 * ---------------------------------------------------------
 *
 * G3: one hop. A requested step that the project's current data does not
 * support is corrected to the step the spec's table says to fall back to --
 * never to a second requested step, so this can't chain into a redirect
 * loop. `facts` are booleans the caller already has to hand from the loaded
 * project (+ the dataset-version list for `hasPendingReviewVersion`) and,
 * for "chapter4", chapter4Gate(analysis).blocked.
 *
 * step "setup" | "dataset" -- always allowed once the project itself loaded
 *   (the caller is responsible for 404 handling before this runs).
 * step "review" -- allowed only with a pending version; else "dataset".
 * step "analysis" -- allowed with an active version, a plan, or results;
 *   else "dataset".
 * step "chapter4" -- allowed only with results AND the gate open; else
 *   "analysis".
 * An unrecognised step string is treated like no step at all: resolved via
 * defaultProjectStep (this is also how a legacy/misspelled link degrades).
 *
 * Returns { step, redirected, reason }. `reason` is one of "pending-review",
 * "no-active-dataset", "chapter4-blocked", "unknown-step", or null when
 * `step` is what was requested.
 */
export function resolveProjectStep(requestedStep, project, facts = {}) {
  const {
    hasPendingReviewVersion = false,
    chapter4Blocked = true,
  } = facts;

  if (!isProjectStep(requestedStep)) {
    return {
      step: defaultProjectStep(project, { hasPendingReviewVersion }),
      redirected: true,
      reason: "unknown-step",
    };
  }

  if (requestedStep === "review" && !hasPendingReviewVersion) {
    return { step: "dataset", redirected: true, reason: "pending-review" };
  }

  // Shared by "analysis" and chapter4's fallback below: computed once so the
  // two agree on what "analysis is reachable" means.
  const analysisAllowed =
    Boolean(project?.active_dataset_version_id) ||
    Boolean(project?.analysis_plan) ||
    Boolean(project?.analysis_results);

  if (requestedStep === "analysis" && !analysisAllowed) {
    return { step: "dataset", redirected: true, reason: "no-active-dataset" };
  }

  if (requestedStep === "chapter4" && (!project?.analysis_results || chapter4Blocked)) {
    // Fall back to wherever "analysis" itself would land, not to "analysis"
    // by name: a typed-in link can request chapter4 on a project with
    // nothing at all yet (no active dataset, no plan, no results), and
    // "analysis" would not be reachable there either. Landing anywhere not
    // itself allowed would violate G3 (one hop) and G5 (never show what the
    // server would refuse) -- see resolveProjectStep.test.js's idempotency
    // check, which is what caught this.
    return {
      step: analysisAllowed ? "analysis" : "dataset",
      redirected: true,
      reason: "chapter4-blocked",
    };
  }

  return { step: requestedStep, redirected: false, reason: null };
}

// One-time, human copy for the redirects above (section 5/6 of the spec: a
// blocked or invalid destination shows a notice rather than redirecting
// silently). Chapter 4's own reason (blocked by review or stale results)
// comes from chapter4Gate() itself, not from here.
export function redirectNotice(reason) {
  switch (reason) {
    case "pending-review":
      return "That dataset isn't awaiting review anymore.";
    case "no-active-dataset":
      return "This project has no analysis yet -- upload or activate a dataset first.";
    case "chapter4-blocked":
      return null; // chapter4Gate's own message is shown instead.
    case "unknown-step":
      return null; // silent: an old/misspelled link just lands on the right step.
    default:
      return null;
  }
}

/*
 * ---------------------------------------------------------
 * URL <-> {id, step}
 * ---------------------------------------------------------
 *
 * Companions to viewRoutes.js's settingsViewForPath/pathForSettingsView, same
 * tolerance (case, trailing slash). Pure string handling only -- the id here
 * is NOT validated as a UUID; that is isValidProjectId's job, kept separate
 * so a caller can distinguish "not a project URL at all" (null) from "a
 * project URL with a malformed id" (parses fine, isValidProjectId fails).
 */

const PROJECT_PATH_RE = /^\/project\/([^/]+)(?:\/([^/]+))?\/*$/i;

// { id, step } for a /project/:id or /project/:id/:step pathname, or null for
// anything else. `step` is lowercased (so a step name can be compared
// directly against PROJECT_STEPS); `id` is returned exactly as written --
// callers that use it in a comparison or a lookup key should lowercase it
// themselves once isValidProjectId has confirmed it's a real UUID.
export function parseProjectPath(pathname) {
  if (typeof pathname !== "string") return null;

  const match = pathname.match(PROJECT_PATH_RE);
  if (!match) return null;

  const [, id, step] = match;
  return { id, step: step ? step.toLowerCase() : null };
}

export function projectPath(id, step) {
  const encoded = encodeURIComponent(id);
  return step ? `/project/${encoded}/${step}` : `/project/${encoded}`;
}

/*
 * ---------------------------------------------------------
 * BACK
 * ---------------------------------------------------------
 *
 * The general form of viewRoutes.js's settingsBackTarget: -1 (step history
 * back) when there is an earlier in-app entry to step to, or `fallbackPath`
 * (push there instead) when this is the first entry of the tab (a reload or
 * a link opened in a new tab), so Back never leaves the app. Unlike
 * settingsBackTarget's own fallback (which the caller replaces with), the
 * project Back button's fallback is a genuine forward navigation -- per the
 * approved spec's history table, the in-page Back arrow "steps history back
 * if the previous entry is that route, otherwise pushes it" -- so callers
 * push the fallback, not replace it.
 *
 * `historyState` is window.history.state. React Router numbers the entries it
 * owns in `idx`: 0 is the first entry of ours in this tab, and a REPLACE keeps
 * the index. That is what makes it the right test. location.key is not: it is
 * "default" only until the first navigation, and a replace (reopening the last
 * project from "/", /project/:id resolving to its step, the chapter4 gate's
 * correction) gives the tab's first entry a new key -- which read as "there is
 * an earlier entry", so Back stepped out of the app.
 */
export function historyIndex(historyState) {
  const idx = historyState?.idx;
  return Number.isInteger(idx) && idx > 0 ? idx : 0;
}

// The page a history entry was pushed FROM, as the step navigations record it
// (useThesisWorkflow's pushStep: navigate(path, { state: stepPushState(from) })).
// React Router keeps navigate()'s state under history.state.usr. Null for an
// entry nothing recorded on: the tab's first entry, a replace, or a push that
// is not a project step.
export function stepPushState(fromPath) {
  return { prev: fromPath };
}

export function pushedFrom(historyState) {
  const prev = historyState?.usr?.prev;
  return typeof prev === "string" && prev ? prev : null;
}

// Spec section 10: the in-page Back "steps history back if the previous entry
// is that route, otherwise pushes it". Stepping back whenever ANY earlier entry
// existed let two Backs bounce between two pages (Chapter 4 -> Analysis ->
// Chapter 4, when Analysis had been reached by Back from Chapter 4).
export function historyBackTarget(historyState, fallbackPath) {
  return historyIndex(historyState) > 0 && pushedFrom(historyState) === fallbackPath ? -1 : fallbackPath;
}
