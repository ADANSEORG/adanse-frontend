import test from "node:test";
import assert from "node:assert/strict";

import { stepLabel, stepReason } from "./cleaningSteps.js";

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
