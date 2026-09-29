// Wording for the automatic cleaning steps that change the shape of the data
// (rather than tidying values in place). The backend records a plain-language
// reason on each of these actions -- how many options a question was split
// into, which rating scale was scored -- and the "What Adanse already fixed"
// list shows it, so a researcher can see why columns appeared or changed.

import { REVERSE_RULE } from "./reverseScores.js";

const EXPLAINED_STEPS = {
  split_multi_select: "Split a “select all that apply” question",
  score_rating_grid: "Scored a rating scale",
};

// A readable name for the step, or "" for a rule this file does not explain
// (the caller falls back to its generic label).
export function stepLabel(rule) {
  return EXPLAINED_STEPS[rule] || "";
}

// The backend ends every score_rating_grid reason with an instruction written
// before reversing existed. The screen now offers it: each question of the grid
// has a tick box under the step.
const REVERSE_INSTRUCTION =
  "A negatively worded statement is scored the same way and must be reversed by you.";
export const REVERSE_POINTER =
  "A negatively worded statement is scored the same way: tick it below to reverse its scores.";

// The reason to show under the step, or "" when there is nothing to show.
// Only the explained steps show one: other steps are self-describing.
export function stepReason(action) {
  if (!action || !EXPLAINED_STEPS[action.rule]) return "";
  if (typeof action.reason !== "string") return "";
  const reason = action.reason.trim();
  return action.rule === "score_rating_grid"
    ? reason.replace(REVERSE_INSTRUCTION, REVERSE_POINTER)
    : reason;
}

// The backend records one score_rating_grid action per column, each repeating
// the same scale. Their reasons also name that column's own hidden copy of the
// original words, so a merged row cannot reuse one of them: it is worded here
// from the shared fields, and only for a real group.
function groupedRatingReason(members) {
  const first = members[0];
  const scale = Array.isArray(first.scale) ? first.scale : [];
  if (scale.length < 2 || !first.scale_name) return stepReason(first);
  return (
    `${members.length} questions were answered on the same ${scale.length}-point ` +
    `${first.scale_name} scale (${scale[0]} to ${scale[scale.length - 1]}), so the ` +
    `answers were converted to scores 1 to ${scale.length} (by position on the scale). ` +
    "The original words are kept in the file but left out of analysis. " +
    REVERSE_POINTER
  );
}

function ratingGridKey(action) {
  return JSON.stringify([action.scale_name, action.grid_columns ?? action.scale ?? null]);
}

// What "What Adanse already fixed" lists, from the backend's applied actions:
//  - a step that changed 0 rows is left out (nothing happened, so nothing to
//    report),
//  - a reversal the researcher applied is left out (the rating-scale entry
//    shows it, as a ticked question), and
//  - the rating-scale steps of one grid become a single entry listing its
//    columns, in the position of the grid's first column.
// Each entry: { key, rule, columns, reason, rows, values }. A grouped entry has
// rows: null, because the columns' row counts overlap and cannot be added.
export function appliedSteps(actions) {
  const list = Array.isArray(actions) ? actions : [];
  const steps = [];
  const grids = new Map();

  list.forEach((action, index) => {
    if (!action || !((action.affected_rows ?? 0) > 0)) return;
    if (action.rule === REVERSE_RULE) return;

    const single = {
      key: `${action.rule || "action"}-${index}`,
      rule: action.rule,
      columns: action.column ? [action.column] : [],
      reason: stepReason(action),
      rows: action.affected_rows,
      values: action.affected_values ?? 0,
    };

    if (action.rule !== "score_rating_grid") {
      steps.push(single);
      return;
    }

    const gridKey = ratingGridKey(action);
    const group = grids.get(gridKey);
    if (!group) {
      grids.set(gridKey, { step: single, members: [action] });
      steps.push(single);
      return;
    }
    group.members.push(action);
    group.step.columns.push(...single.columns);
    group.step.values += single.values;
  });

  for (const { step, members } of grids.values()) {
    if (members.length === 1) continue;
    step.reason = groupedRatingReason(members);
    step.rows = null;
  }
  return steps;
}
