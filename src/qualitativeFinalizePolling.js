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
// instead. chargedCredits comes along too (session.finalize_charged_credits,
// left set on a completed session -- see finalize_qualitative_column()'s
// success path) so the caller can confirm what was actually charged
// instead of leaving the deduction silent.
export function buildFinalizedOutcome(column, session) {
  const chargedCredits = session?.finalize_charged_credits;
  return {
    column,
    status: "complete",
    result: session?.result ?? null,
    chargedCredits: Number.isFinite(chargedCredits) ? chargedCredits : null,
  };
}

// The label for the Finalize button, including this column's per-column
// cost once it's known. finalize_cost_estimate is computed server-side
// by qualitative_finalize_cost() -- the SAME formula the backend actually
// charges with, see define_qualitative_themes() -- and read straight off
// the session here rather than recomputed, so the two can't drift apart.
export function finalizeButtonLabel(session, { retry = false } = {}) {
  const base = retry ? "Retry finalize" : "Finalize themes";
  const cost = session?.finalize_cost_estimate;
  return Number.isFinite(cost) ? `${base} → (${cost} credits)` : `${base} →`;
}

// Checked BEFORE the researcher clicks Finalize -- same wording pattern
// as CreditActionButton's own insufficient-balance notice (Chapter4.jsx),
// so blocked-by-credits reads the same way everywhere in the app: the
// specific numbers, not a generic "insufficient credits".
export function finalizeInsufficientBalanceMessage(session, balance) {
  const cost = session?.finalize_cost_estimate;
  if (!Number.isFinite(cost) || !Number.isFinite(balance)) return null;
  if (balance >= cost) return null;
  return `You don't have enough credits for this — it uses ${cost} credits and you have ${balance}.`;
}

// A brief, explicit confirmation of what a completed finalize actually
// charged and what's left -- posted to the conversation log (see
// useThesisWorkflow.js's onQualitativeFinalized()) rather than left as a
// silent deduction the researcher could only discover in transaction
// history.
export function finalizeConfirmationMessage(column, chargedCredits, newBalance) {
  if (!Number.isFinite(chargedCredits) || !Number.isFinite(newBalance)) return null;
  const creditWord = chargedCredits === 1 ? "credit" : "credits";
  return `Finalized "${column}" — charged ${chargedCredits} ${creditWord}. New balance: ${newBalance}.`;
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
