import test from "node:test";
import assert from "node:assert/strict";

import { appliedSteps, stepLabel, stepReason } from "./cleaningSteps.js";

const SPLIT_REASON =
  "Answers were separated by commas. It was split into 3 Yes/No columns; the original " +
  "combined column is kept in the file but left out of analysis.";
const GRID_REASON =
  "This is one of 4 questions answered on the same 5-point agreement scale " +
  "(Strongly disagree to Strongly agree), so the answers were converted to scores 1 to 5.";

test("the split and rating-grid steps get readable names", () => {
  assert.equal(stepLabel("split_multi_select"), "Split a “select all that apply” question");
  assert.equal(stepLabel("score_rating_grid"), "Scored a rating scale");
});

test("other rules have no special name, so the caller keeps its generic label", () => {
  assert.equal(stepLabel("trim_whitespace"), "");
  assert.equal(stepLabel(undefined), "");
});

test("the split and rating-grid steps show the reason the backend recorded", () => {
  assert.equal(stepReason({ rule: "split_multi_select", reason: SPLIT_REASON }), SPLIT_REASON);
  assert.equal(stepReason({ rule: "score_rating_grid", reason: `  ${GRID_REASON}\n` }), GRID_REASON);
});

test("no reason is shown when the backend recorded none, or it is not text", () => {
  assert.equal(stepReason({ rule: "split_multi_select" }), "");
  assert.equal(stepReason({ rule: "score_rating_grid", reason: null }), "");
  assert.equal(stepReason({ rule: "score_rating_grid", reason: 5 }), "");
  assert.equal(stepReason(null), "");
});

test("steps this file does not explain never show a reason", () => {
  assert.equal(stepReason({ rule: "trim_whitespace", reason: "Removed spaces." }), "");
});

// ---------------------------------------------------------------------------
// appliedSteps: what the "already fixed" list shows
// ---------------------------------------------------------------------------

const SCALE = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];

function gridAction(column, overrides = {}) {
  return {
    rule: "score_rating_grid",
    column,
    scale_name: "agreement",
    scale: SCALE,
    grid_columns: ["Q1", "Q2", "Q3"],
    labels_column: `${column} (original words)`,
    reason: `One of 3 questions ... The original words are kept in the file ('${column} (original words)') ...`,
    affected_rows: 40,
    affected_values: 40,
    ...overrides,
  };
}

test("steps that changed 0 rows are left out", () => {
  const steps = appliedSteps([
    { rule: "normalize_categorical_values", column: "Sex", affected_rows: 0, affected_values: 0 },
    { rule: "trim_whitespace", column: "Name", affected_rows: 3, affected_values: 3 },
    { rule: "normalize_missing_tokens", column: "Age" }, // no count recorded: nothing to report
  ]);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].rule, "trim_whitespace");
  assert.deepEqual(steps[0].columns, ["Name"]);
  assert.equal(steps[0].rows, 3);
  assert.equal(steps[0].values, 3);
});

test("other steps keep their order and one row each", () => {
  const steps = appliedSteps([
    { rule: "trim_whitespace", column: "A", affected_rows: 1, affected_values: 1 },
    { rule: "trim_whitespace", column: "B", affected_rows: 2, affected_values: 2 },
  ]);
  assert.deepEqual(steps.map((s) => s.columns), [["A"], ["B"]]);
});

test("the rating-scale steps of one grid become a single row listing its columns", () => {
  const steps = appliedSteps([
    gridAction("Q1", { affected_rows: 40, affected_values: 40 }),
    gridAction("Q2", { affected_rows: 38, affected_values: 38 }),
    gridAction("Q3", { affected_rows: 40, affected_values: 40 }),
  ]);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].rule, "score_rating_grid");
  assert.deepEqual(steps[0].columns, ["Q1", "Q2", "Q3"]);
  assert.equal(steps[0].values, 118);
  assert.equal(steps[0].rows, null); // the columns' rows overlap; they are not added up
  assert.match(steps[0].reason, /^3 questions were answered on the same 5-point agreement scale/);
  assert.match(steps[0].reason, /\(Strongly disagree to Strongly agree\)/);
  assert.match(steps[0].reason, /scores 1 to 5/);
  assert.doesNotMatch(steps[0].reason, /original words\)/); // no single column's hidden copy
});

test("the grouped row sits where the grid's first column was, among other steps", () => {
  const steps = appliedSteps([
    { rule: "trim_whitespace", column: "Name", affected_rows: 3, affected_values: 3 },
    gridAction("Q1"),
    { rule: "split_multi_select", column: "Tools", affected_rows: 9, affected_values: 27, reason: SPLIT_REASON },
    gridAction("Q2"),
  ]);
  assert.deepEqual(steps.map((s) => s.rule), ["trim_whitespace", "score_rating_grid", "split_multi_select"]);
  assert.deepEqual(steps[1].columns, ["Q1", "Q2"]);
});

test("a grid with one column applied keeps that column's own reason and counts", () => {
  const [step] = appliedSteps([gridAction("Q1", { affected_rows: 40, affected_values: 40 })]);
  assert.deepEqual(step.columns, ["Q1"]);
  assert.equal(step.rows, 40);
  assert.equal(step.reason, gridAction("Q1").reason);
});

test("two different grids stay two rows", () => {
  const steps = appliedSteps([
    gridAction("Q1"),
    gridAction("S1", { scale_name: "satisfaction", grid_columns: ["S1", "S2"] }),
    gridAction("Q2"),
    gridAction("S2", { scale_name: "satisfaction", grid_columns: ["S1", "S2"] }),
  ]);
  assert.equal(steps.length, 2);
  assert.deepEqual(steps.map((s) => s.columns), [["Q1", "Q2"], ["S1", "S2"]]);
});

test("a grid column that changed 0 rows is left out of its group", () => {
  const [step] = appliedSteps([gridAction("Q1"), gridAction("Q2", { affected_rows: 0, affected_values: 0 }), gridAction("Q3")]);
  assert.deepEqual(step.columns, ["Q1", "Q3"]);
  assert.match(step.reason, /^2 questions were answered/);
});

test("nothing to show gives an empty list, whatever the report held", () => {
  assert.deepEqual(appliedSteps(undefined), []);
  assert.deepEqual(appliedSteps(null), []);
  assert.deepEqual(appliedSteps([null, { rule: "trim_whitespace", affected_rows: 0 }]), []);
});
