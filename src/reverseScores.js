// Reverse-scoring rating questions the researcher marks as negatively worded.
//
// The backend scores a rating grid 1..N by position on the scale, exactly as
// answered (rule score_rating_grid), so "I find the course confusing" scores
// high when the respondent agrees with something bad. On the review screen the
// researcher ticks such questions; applying creates a new dataset version whose
// scores for them are (N + 1) - score (POST .../reverse-scores). The request is
// the full set that should END UP reversed, so unticking a reversed question
// restores it. A version's actions keep only the net reversals, one
// reverse_rating_scores action per reversed column.

import { resetSentence } from "./personalData.js";

export const REVERSE_RULE = "reverse_rating_scores";

const CHANGEABLE_STATUSES = new Set(["cleaned", "validated"]);

// The columns this version stores reversed.
export function reversedColumns(actions) {
  const list = Array.isArray(actions) ? actions : [];
  return new Set(
    list
      .filter((action) => action && action.rule === REVERSE_RULE && action.column)
      .map((action) => action.column)
  );
}

// Ticking can change a version only while it is still being reviewed, as with
// the personal-data actions.
export function canReverse(version, loading = false) {
  return Boolean(
    !loading &&
      version &&
      version.kind !== "original" &&
      CHANGEABLE_STATUSES.has(version.status || "cleaned")
  );
}

// The body for one grid's Apply: everything reversed now, with this grid's
// questions as ticked. Another grid's unapplied ticks are not sent -- each grid
// has its own Apply, and its button only ever changes its own questions.
export function reverseRequest(current, ticked, gridColumns) {
  const grid = new Set(gridColumns);
  const next = [...current].filter((column) => !grid.has(column));
  for (const column of gridColumns) {
    if (ticked.has(column)) next.push(column);
  }
  return next;
}

// Whether a grid's ticks differ from what the version stores.
export function gridChanged(current, ticked, gridColumns) {
  return gridColumns.some((column) => current.has(column) !== ticked.has(column));
}

// What the confirmation says before applying one grid's ticks.
export function reverseConfirmation(current, ticked, gridColumns, versionIsActive = false, rerunCost = null) {
  const reverse = gridColumns.filter((c) => ticked.has(c) && !current.has(c));
  const restore = gridColumns.filter((c) => current.has(c) && !ticked.has(c));
  const quoted = (columns) => columns.map((c) => `“${c}”`).join(", ");
  const lines = [];
  if (reverse.length) {
    lines.push(
      `Reverse the scores of ${quoted(reverse)}? A score becomes its mirror on the scale ` +
        "(on a 5-point scale, 5 becomes 1 and 4 becomes 2), so a higher score means the " +
        "same direction as on the other questions. The answers themselves are kept as written."
    );
  }
  if (restore.length) {
    lines.push(`Put ${quoted(restore)} back to the scale’s original direction?`);
  }
  lines.push("This creates a new dataset version that you will need to validate and activate.");
  if (versionIsActive) {
    lines.push(resetSentence(rerunCost));
  }
  return lines.join(" ");
}
