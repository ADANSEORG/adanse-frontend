// Wording for the automatic cleaning steps that change the shape of the data
// (rather than tidying values in place). The backend records a plain-language
// reason on each of these actions -- how many options a question was split
// into, which rating scale was scored -- and the "What Adanse already fixed"
// list shows it, so a researcher can see why columns appeared or changed.

const EXPLAINED_STEPS = {
  split_multi_select: "Split a “select all that apply” question",
  score_rating_grid: "Scored a rating scale",
};

// A readable name for the step, or "" for a rule this file does not explain
// (the caller falls back to its generic label).
export function stepLabel(rule) {
  return EXPLAINED_STEPS[rule] || "";
}

// The reason to show under the step, or "" when there is nothing to show.
// Only the explained steps show one: other steps are self-describing.
export function stepReason(action) {
  if (!action || !EXPLAINED_STEPS[action.rule]) return "";
  return typeof action.reason === "string" ? action.reason.trim() : "";
}
