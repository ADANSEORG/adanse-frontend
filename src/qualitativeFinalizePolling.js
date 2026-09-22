/*
 * Pure logic for polling a qualitative column's session while stage 6
 * (finalize) runs as a background task on the backend (see
 * app/services/thesis.py: start_qualitative_finalize()). Kept decoupled
 * from React state, the same pattern categoryOrder.js/analysisOverride.js
 * use, so it's directly testable under plain node:test. The actual
 * setInterval/fetch scaffolding lives in QualitativeReview.jsx; this
 * module only decides whether the session is still finalizing, what to
 * show while it is, and what to hand back to the caller once it's done.
 *
 * The backend session shape this reads (see get_qualitative_session()):
 *   phase: "finalizing" | "complete" | "failed" | ...other stages
 *   finalize_step: a short human-readable progress string, or null
 *   finalize_error: a readable failure message, set only when phase is
 *     "failed"
 *   result: the finished Chapter 4 report, set only when phase is
 *     "complete"
 */

export const FINALIZE_POLL_INTERVAL_MS = 4000;

export const FINALIZE_HEADLINE = "Finalizing… this can take a few minutes.";

export function isFinalizing(session) {
  return session?.phase === "finalizing";
}

export function isFinalizeFailed(session) {
  return session?.phase === "failed";
}

export function isFinalizeComplete(session) {
  return session?.phase === "complete";
}

export function finalizeStepText(session) {
  return session?.finalize_step || "Working…";
}

export function finalizeErrorMessage(session) {
  return session?.finalize_error || "Could not finalize themes.";
}

// Shape onQualitativeFinalized() (useThesisWorkflow.js) expects -- the
// same {column, status, result} the old synchronous finalize response
// used to return directly, now assembled from a polled "complete" session
// instead.
export function buildFinalizedOutcome(column, session) {
  return {
    column,
    status: "complete",
    result: session?.result ?? null,
  };
}

export const CHAPTER4_AFFORDABILITY_MESSAGE =
  "You've explored your themes. Buy credits to download your full Chapter 4.";

// Checked right after a finalize completes (see QualitativeReview.jsx's
// polling effect) -- the qualitative finalize charge is deducted at
// START, before the run even begins, so by the time it completes the
// researcher's balance already reflects it; this only decides whether
// what's left still covers the chapter4 download, using the same GET
// /credits response (balance + costs) the rest of the app already reads
// its credit costs from, never a hardcoded number.
export function chapter4AffordabilityWarning(balance, costs) {
  const chapter4Cost = costs?.chapter4;
  if (!Number.isFinite(balance) || !Number.isFinite(chapter4Cost)) return null;
  if (balance >= chapter4Cost) return null;
  return CHAPTER4_AFFORDABILITY_MESSAGE;
}
