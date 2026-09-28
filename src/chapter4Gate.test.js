import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CHAPTER4_PENDING_REVIEW,
  CHAPTER4_READY,
  CHAPTER4_STALE,
  chapter4Gate,
  hasPendingReview,
} from "./chapter4Gate.js";

const done = (id = 1) => ({ id, status: "complete" });
const review = (id = 1) => ({ id, status: "needs_review" });
const analysisWith = ({ objectives = [[done()]], qualitative = [], stale = false } = {}) => ({
  objective_results: objectives.map((analyses) => ({ analyses })),
  qualitative_results: qualitative,
  has_stale_results: stale,
});

test("with no analysis there is nothing to continue to", () => {
  for (const missing of [null, undefined]) {
    const gate = chapter4Gate(missing);
    assert.equal(gate.blocked, true);
    assert.equal(gate.reason, "no-results");
  }
});

test("finished analysis with every source complete is open, with the usual wording", () => {
  const gate = chapter4Gate(
    analysisWith({ qualitative: [{ column: "Why", status: "complete", result: {} }] })
  );
  assert.equal(gate.blocked, false);
  assert.equal(gate.reason, "ready");
  assert.equal(gate.heading, CHAPTER4_READY.heading);
  assert.equal(gate.message, CHAPTER4_READY.message);
});

test("a qualitative source still being finalized blocks it, with the message the action bar shows", () => {
  // While a finalize runs the source's entry stays needs_review until it completes.
  const gate = chapter4Gate(analysisWith({ qualitative: [{ column: "Why", status: "needs_review", result: null }] }));
  assert.equal(gate.blocked, true);
  assert.equal(gate.reason, "pending-review");
  assert.equal(gate.heading, "Finish reviewing themes above.");
  assert.equal(
    gate.message,
    "Chapter 4 can't be generated until every qualitative data source's themes are finalized."
  );
});

test("one unfinished source among several blocks it", () => {
  const gate = chapter4Gate(
    analysisWith({
      qualitative: [
        { column: "A", status: "complete", result: {} },
        { column: "B", status: "needs_review", result: null },
        { column: "C", status: "complete", result: {} },
      ],
    })
  );
  assert.equal(gate.blocked, true);
});

test("a quantitative analysis that needs review blocks it too", () => {
  assert.equal(chapter4Gate(analysisWith({ objectives: [[done(1), review(2)]] })).blocked, true);
  assert.equal(chapter4Gate(analysisWith({ objectives: [[done(1)], [review(2)]] })).reason, "pending-review");
});

test("out-of-date results block it, whichever way they are flagged", () => {
  for (const analysis of [
    analysisWith({ stale: true }),
    { ...analysisWith(), objective_results: [{ analyses: [{ ...done(), stale: true }] }] },
  ]) {
    const gate = chapter4Gate(analysis);
    assert.equal(gate.blocked, true);
    assert.equal(gate.reason, "stale");
    assert.equal(gate.heading, CHAPTER4_STALE.heading);
    assert.equal(gate.message, "Run analysis again to update the variables you changed before generating Chapter 4.");
  }
});

test("a pending review is reported ahead of stale results", () => {
  const gate = chapter4Gate(
    analysisWith({ stale: true, qualitative: [{ column: "Why", status: "needs_review" }] })
  );
  assert.equal(gate.reason, "pending-review");
  assert.equal(gate.message, CHAPTER4_PENDING_REVIEW.message);
});

test("missing or malformed result lists are treated as nothing pending, without throwing", () => {
  assert.equal(chapter4Gate({}).blocked, false);
  assert.equal(chapter4Gate({ objective_results: [{}], qualitative_results: [] }).blocked, false);
  assert.equal(hasPendingReview({ objective_results: null, qualitative_results: null }), false);
});

// ---------------------------------------------------------------------------
// One rule for every way in. The header link was once left out of this check
// and stayed live during a finalize; these keep the three entry points on the
// shared function rather than each working the condition out for itself.
// ---------------------------------------------------------------------------
const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("the header link is disabled by the shared rule", () => {
  const app = source("./App.jsx");
  assert.match(app, /import \{ chapter4Gate \} from "\.\/chapter4Gate\.js"/);
  assert.match(app, /const chapter4Access\s*=\s*chapter4Gate\(analysis\)/);
  const link = app.slice(app.indexOf('className="flow-continue"'));
  const button = link.slice(0, link.indexOf(">\n"));
  assert.match(button, /disabled=\{\s*chapter4Access\.blocked\s*\}/);
});

test("the action bar under the findings uses the shared rule and has no copy of its own", () => {
  const workspace = source("./components/ThesisWorkspace.jsx");
  assert.match(workspace, /chapter4Gate\(analysis\)/);
  // The gate's own copy of the condition was removed (per-item rendering elsewhere in the
  // file still reads item.status, which is unrelated).
  assert.doesNotMatch(workspace, /const pendingReview\b/);
  assert.doesNotMatch(workspace, /qualitative_results \|\| \[\]\)\.some/);
  assert.doesNotMatch(workspace, /const blocked = pendingReview/);
  assert.match(workspace, /disabled=\{blocked\}/);
});

test("goToChapter4 refuses when the shared rule says blocked, whichever button called it", () => {
  const hook = source("./hooks/useThesisWorkflow.js");
  const body = hook.slice(hook.indexOf("const goToChapter4"));
  assert.match(body.slice(0, body.indexOf("};")), /if \(chapter4Gate\(analysis\)\.blocked\) return;/);
});
