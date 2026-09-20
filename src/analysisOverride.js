/*
 * Pure logic for the "researcher changes an objective's variables" flow
 * (ThesisWorkspace.jsx's ChangeVariablesControl/AnalysisOverrideForm/
 * RegressionOverrideForm) -- kept decoupled from React state so it's
 * directly testable under plain node:test. The actual network call
 * lives in api.js (overrideAnalysisVariables); this module only decides
 * what that call should look like and when it's allowed to happen.
 */

/*
 * True when an objective's plan-time analyses already include a
 * multiple-regression pick -- decides which override form to show
 * (two-variable dropdowns, or the predictor multi-select + outcome
 * dropdown).
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

/*
 * True only when an outcome is chosen, at least 2 distinct predictors
 * are chosen, and the outcome isn't also one of the predictors -- the
 * same rules the server enforces for a regression override.
 */
export function canSubmitRegressionOverride(dependentColumn, independentColumns) {
  const predictors = Array.from(new Set((independentColumns || []).filter(Boolean)));
  return (
    Boolean(dependentColumn) &&
    predictors.length >= 2 &&
    !predictors.includes(dependentColumn)
  );
}

/*
 * The payload shape the override endpoint expects for a multiple
 * regression. Returns null if the choice isn't submittable yet.
 */
export function buildRegressionOverridePayload(dependentColumn, independentColumns) {
  if (!canSubmitRegressionOverride(dependentColumn, independentColumns)) return null;
  return {
    dependent_column: dependentColumn,
    independent_columns: Array.from(new Set(independentColumns.filter(Boolean))),
  };
}

/*
 * True when any completed analysis in the current results is stale --
 * its variables were overridden after that result was computed, so the
 * numbers on screen no longer describe the current plan. Checks both
 * the project-level flag the server sets (has_stale_results) and the
 * individual items directly, the same defense-in-depth the existing
 * `pendingReview` (qualitative needs_review) check already uses.
 */
export function hasStaleResults(analysis) {
  if (!analysis) return false;
  if (analysis.has_stale_results) return true;
  return (analysis.objective_results || []).some((objective) =>
    (objective.analyses || []).some((item) => item?.stale === true)
  );
}
