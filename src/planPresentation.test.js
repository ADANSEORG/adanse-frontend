import { test } from "node:test";
import assert from "node:assert/strict";

import {
  analysisStatus,
  columnLabel,
  columnPairLabel,
  hypothesisDecision,
  hypothesisEntries,
} from "./planPresentation.js";

test("column names are shown verbatim, not title-cased", () => {
  assert.equal(columnLabel("Current CWA"), "Current CWA");
  assert.equal(columnLabel("PU1: AI tools help me understand course content"), "PU1: AI tools help me understand course content");
  assert.equal(columnLabel("hours_per_week"), "hours_per_week");
  assert.equal(columnLabel(null), "");
  assert.equal(columnPairLabel(["Hours per week using AI tools", "Current CWA"]), "Hours per week using AI tools × Current CWA");
  assert.equal(columnPairLabel(undefined), "");
});

test("a planned, confident analysis reads Ready, not Needs review", () => {
  assert.deepEqual(analysisStatus({ status: "ready" }), { label: "Ready", tone: "complete" });
});

test("a low-confidence planned analysis reads Needs review", () => {
  assert.deepEqual(analysisStatus({ status: "ready", confidence: "low" }), { label: "Needs review", tone: "review" });
});

test("a completed analysis reads Complete; a stale or failed one does not", () => {
  const done = { status: "complete", result: { test: "correlation" } };
  assert.deepEqual(analysisStatus(done), { label: "Complete", tone: "complete" });
  assert.equal(analysisStatus({ ...done, stale: true }).label, "Out of date");
  assert.equal(analysisStatus({ status: "review", error: "boom" }).label, "Failed");
});

test("a qualitative item awaiting review, or an unknown status, needs review", () => {
  assert.equal(analysisStatus({ status: "needs_review" }).label, "Needs review");
  assert.equal(analysisStatus({}).label, "Needs review");
  assert.equal(analysisStatus(null).label, "Needs review");
});

const PLAN = {
  items: [
    { id: 2, analyses: [{ id: "2-corr-1", test_name: "Pearson correlation", status: "ready" }] },
  ],
  hypotheses: [
    {
      id: "H1", number: 1, hypothesis: "There is a relationship between hours and CWA.",
      linked_analysis: { objective_id: 2, analysis_id: "2-corr-1" }, analyses: [],
      test_name: "Pearson correlation", columns: ["Hours", "Current CWA"], status: "ready",
    },
    {
      id: "H2", number: 2, hypothesis: "CWA differs by gender.",
      linked_analysis: null,
      analyses: [{ id: "H2-t-1", test_name: "Welch independent-samples t-test", status: "ready" }],
      test_name: "Welch independent-samples t-test", columns: ["Current CWA", "Gender"], status: "ready",
    },
    {
      id: "H3", number: 3, hypothesis: "Students are happy.", linked_analysis: null, analyses: [],
      test_name: null, columns: [], status: "review", review_reason: "Could not tell which variables.",
    },
  ],
};

test("hypothesisEntries reports linked, own and unplanned hypotheses before a run", () => {
  const [h1, h2, h3] = hypothesisEntries(PLAN, null);
  assert.equal(h1.sharedWith, "Objective 2");
  assert.equal(h1.testName, "Pearson correlation");
  assert.deepEqual(h1.status, { label: "Ready", tone: "complete" });
  assert.equal(h2.sharedWith, null);
  assert.deepEqual(h2.columns, ["Current CWA", "Gender"]);
  assert.equal(h2.status.label, "Ready");
  assert.equal(h3.status.label, "Needs review");
  assert.equal(h3.reviewReason, "Could not tell which variables.");
});

test("hypothesisEntries attaches results after a run (linked from the objective, own from hypothesis_results)", () => {
  const analysis = {
    objective_results: [
      { id: 2, analyses: [{ id: "2-corr-1", status: "complete", result: { test: "correlation", r: 0.4, p_value: 0.001 } }] },
    ],
    hypothesis_results: [
      { id: "H2", analyses: [{ id: "H2-t-1", status: "complete", result: { test: "t_test", p_value: 0.4 } }] },
    ],
  };
  const [h1, h2] = hypothesisEntries(PLAN, analysis);
  assert.equal(h1.result.r, 0.4);
  assert.equal(h1.status.label, "Complete");
  assert.equal(h2.result.test, "t_test");
  assert.equal(hypothesisDecision(h1.result), "Reject the null hypothesis");
  assert.equal(hypothesisDecision(h2.result), "Fail to reject the null hypothesis");
});

test("a link to an analysis that was overridden away is flagged, not trusted", () => {
  const plan = {
    ...PLAN,
    items: [{ id: 2, analyses: [{ id: "2-override-1", test_name: "Pearson correlation", status: "ready" }] }],
  };
  const [h1] = hypothesisEntries(plan, null);
  assert.equal(h1.sharedWith, null);
  assert.equal(h1.status.label, "Needs review");
  assert.match(h1.reviewReason, /Run analysis again/);
});

test("hypothesisEntries is empty when the plan has no hypotheses", () => {
  assert.deepEqual(hypothesisEntries({ items: [] }, null), []);
  assert.deepEqual(hypothesisEntries(null, null), []);
});

test("hypothesisDecision needs a p-value", () => {
  assert.equal(hypothesisDecision({ test: "frequency" }), null);
  assert.equal(hypothesisDecision(null), null);
});
