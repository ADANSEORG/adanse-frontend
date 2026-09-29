import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  REVERSE_RULE,
  canReverse,
  gridChanged,
  reverseConfirmation,
  reverseRequest,
  reversedColumns,
} from "./reverseScores.js";

const reversal = (column) => ({ rule: REVERSE_RULE, column, scale_points: 5, affected_rows: 40 });

// ---------------------------------------------------------------------------
// What the version stores
// ---------------------------------------------------------------------------

test("the reversed columns are the version's reverse_rating_scores actions", () => {
  const actions = [
    { rule: "score_rating_grid", column: "Q1" },
    reversal("Q2"),
    { rule: "trim_whitespace", column: "Q3" },
    reversal("Q4"),
  ];
  assert.deepEqual([...reversedColumns(actions)], ["Q2", "Q4"]);
});

test("no actions, or junk in them, means nothing is reversed", () => {
  assert.equal(reversedColumns(undefined).size, 0);
  assert.equal(reversedColumns(null).size, 0);
  assert.equal(reversedColumns([null, "x", { rule: REVERSE_RULE }]).size, 0);
});

test("only a cleaned or validated version, not while loading, can be changed", () => {
  assert.equal(canReverse({ kind: "cleaned", status: "cleaned" }), true);
  assert.equal(canReverse({ kind: "cleaned", status: "validated" }), true);
  assert.equal(canReverse({ kind: "cleaned" }), true); // no status yet reads as cleaned
  assert.equal(canReverse({ kind: "cleaned", status: "active" }), false);
  assert.equal(canReverse({ kind: "cleaned", status: "failed" }), false);
  assert.equal(canReverse({ kind: "original", status: "cleaned" }), false);
  assert.equal(canReverse({ kind: "cleaned", status: "cleaned" }, true), false);
  assert.equal(canReverse(null), false);
});

// ---------------------------------------------------------------------------
// The request: the full set that should end up reversed
// ---------------------------------------------------------------------------

test("ticking a question adds it to what is already reversed", () => {
  const body = reverseRequest(new Set(["Q1"]), new Set(["Q1", "Q2"]), ["Q1", "Q2", "Q3"]);
  assert.deepEqual(body.sort(), ["Q1", "Q2"]);
});

test("unticking a reversed question leaves it out, which restores it", () => {
  assert.deepEqual(reverseRequest(new Set(["Q1", "Q2"]), new Set(["Q2"]), ["Q1", "Q2"]), ["Q2"]);
  assert.deepEqual(reverseRequest(new Set(["Q1"]), new Set(), ["Q1", "Q2"]), []);
});

test("another grid's reversals are kept, and its unapplied ticks are not sent", () => {
  const current = new Set(["Other1"]);
  const ticked = new Set(["Other1", "Other2", "Q1"]); // Other2 ticked in the other grid, not applied
  assert.deepEqual(reverseRequest(current, ticked, ["Q1", "Q2"]).sort(), ["Other1", "Q1"]);
});

test("a grid has changes only when its ticks differ from what is stored", () => {
  assert.equal(gridChanged(new Set(["Q1"]), new Set(["Q1"]), ["Q1", "Q2"]), false);
  assert.equal(gridChanged(new Set(["Q1"]), new Set(["Q1", "Q2"]), ["Q1", "Q2"]), true);
  assert.equal(gridChanged(new Set(["Q1"]), new Set(), ["Q1", "Q2"]), true);
  // A tick in a different grid is not this grid's change.
  assert.equal(gridChanged(new Set(), new Set(["Other"]), ["Q1", "Q2"]), false);
});

// ---------------------------------------------------------------------------
// The confirmation
// ---------------------------------------------------------------------------

test("the confirmation names what will be reversed and explains the mirror", () => {
  const text = reverseConfirmation(new Set(), new Set(["I find it confusing"]), ["I find it confusing", "Q2"]);
  assert.match(text, /^Reverse the scores of “I find it confusing”\?/);
  assert.match(text, /5 becomes 1 and 4 becomes 2/);
  assert.match(text, /answers themselves are kept as written/);
  assert.match(text, /new dataset version that you will need to validate and activate\.$/);
});

test("the confirmation names what will be put back", () => {
  const text = reverseConfirmation(new Set(["Q1"]), new Set(), ["Q1", "Q2"]);
  assert.match(text, /^Put “Q1” back to the scale’s original direction\?/);
  assert.doesNotMatch(text, /Reverse the scores/);
});

test("on the active version it also says the analysis will be reset and what re-running costs", () => {
  const text = reverseConfirmation(new Set(), new Set(["Q1"]), ["Q1"], true, 20);
  assert.match(text, /Your current analysis plan and results will be reset, and running the analysis again costs 20 credits\.$/);
  assert.doesNotMatch(reverseConfirmation(new Set(), new Set(["Q1"]), ["Q1"], false, 20), /reset/);
});

// ---------------------------------------------------------------------------
// Wiring: the screen reaches the endpoint
// ---------------------------------------------------------------------------

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("the review screen gets the action, and the workflow calls the reverse-scores endpoint", () => {
  assert.match(read("./App.jsx"), /onSetReverseScores=\{reverseScores\}/);
  const workflow = read("./hooks/useThesisWorkflow.js");
  assert.match(workflow, /const reverseScores = async \(columns\)/);
  assert.match(workflow, /setReverseScores\(\s*active\.id,\s*datasetVersion\.id,\s*columns\s*\)/);
  assert.match(workflow, /setDatasetVersion\(result\.version\)/);
  assert.match(read("./api.js"), /\/datasets\/\$\{encodeURIComponent\(versionId\)\}\/reverse-scores`/);
});

test("the review screen sends one grid's request and confirms before applying", () => {
  const screen = read("./components/DatasetReview.jsx");
  assert.match(screen, /onSetReverseScores\(reverseRequest\(reversedNow, ticked, step\.columns\)\)/);
  assert.match(screen, /onClick=\{\(\) => setConfirmingGrid\(step\.key\)\}/);
  assert.match(screen, /onClick=\{\(\) => handleReverse\(step\)\}/);
  // Ticks belong to one version: a new version starts from what it stores.
  assert.match(screen, /reverseTicks\.versionId === version\.id/);
});
