/*
 * Pure logic for the "researcher overrides a low-confidence objective's
 * variables" flow (ThesisWorkspace.jsx's AnalysisOverrideForm) -- kept
 * decoupled from React state so it's directly testable under plain
 * node:test. The actual network call lives in api.js
 * (overrideAnalysisVariables); this module only decides what that call
 * should look like and when it's allowed to happen.
 */

/*
 * True when an objective's plan-time analyses already include a
 * multiple-regression pick. The regression override needs its own
 * multi-select predictor list + outcome dropdown (not yet built -- see
 * ThesisWorkspace.jsx), so this objective gets an explanatory message
 * instead of the two-variable dropdown form.
 */
export function isRegressionAnalysis(analyses) {
  return (analyses || []).some((a) => (a?.test?.test || a?.test) === "regression");
}

/*
 * True only when both variables are chosen and distinct -- the same
 * "two different columns" rule the server enforces, checked client-side
 * first so the button simply stays disabled rather than round-tripping
 * an override the server will reject anyway.
 */
export function canSubmitOverride(columnA, columnB) {
  return Boolean(columnA) && Boolean(columnB) && columnA !== columnB;
}

/*
 * The payload shape the override endpoint expects for a two-variable
 * test. Returns null if the choice isn't submittable yet, so a caller
 * can use the null-ness itself as the submit-button's disabled check.
 */
export function buildPairwiseOverridePayload(columnA, columnB) {
  if (!canSubmitOverride(columnA, columnB)) return null;
  return { column_a: columnA, column_b: columnB };
}
