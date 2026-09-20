import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isRegressionAnalysis,
  canSubmitOverride,
  buildPairwiseOverridePayload,
  canSubmitRegressionOverride,
  buildRegressionOverridePayload,
  hasStaleResults,
} from "./analysisOverride.js";

test("isRegressionAnalysis detects a regression pick among an objective's analyses", () => {
  assert.equal(
    isRegressionAnalysis([{ test: { test: "regression", dependent_column: "cgpa" } }]),
    true
  );
  assert.equal(
    isRegressionAnalysis([{ test: { test: "correlation" } }]),
    false
  );
});

test("isRegressionAnalysis handles missing/empty analyses without throwing", () => {
  assert.equal(isRegressionAnalysis(undefined), false);
  assert.equal(isRegressionAnalysis([]), false);
  assert.equal(isRegressionAnalysis([{}]), false);
});

test("isRegressionAnalysis also matches a flat (non-nested) test string, for older plan shapes", () => {
  assert.equal(isRegressionAnalysis([{ test: "regression" }]), true);
});

test("canSubmitOverride requires both variables, and requires them to differ", () => {
  assert.equal(canSubmitOverride("cgpa", "faculty"), true);
  assert.equal(canSubmitOverride("cgpa", "cgpa"), false);
  assert.equal(canSubmitOverride("", "faculty"), false);
  assert.equal(canSubmitOverride("cgpa", ""), false);
  assert.equal(canSubmitOverride("", ""), false);
});

test("buildPairwiseOverridePayload returns the API payload shape when submittable", () => {
  assert.deepEqual(
    buildPairwiseOverridePayload("cgpa", "faculty"),
    { column_a: "cgpa", column_b: "faculty" }
  );
});

test("buildPairwiseOverridePayload returns null when not yet submittable", () => {
  assert.equal(buildPairwiseOverridePayload("cgpa", "cgpa"), null);
  assert.equal(buildPairwiseOverridePayload("cgpa", ""), null);
  assert.equal(buildPairwiseOverridePayload("", ""), null);
});

test("canSubmitRegressionOverride requires an outcome and at least 2 distinct predictors", () => {
  assert.equal(canSubmitRegressionOverride("cgpa", ["sleep", "income"]), true);
  assert.equal(canSubmitRegressionOverride("cgpa", ["sleep"]), false);
  assert.equal(canSubmitRegressionOverride("cgpa", []), false);
  assert.equal(canSubmitRegressionOverride("", ["sleep", "income"]), false);
  // Duplicates collapse to one distinct predictor -- not enough.
  assert.equal(canSubmitRegressionOverride("cgpa", ["sleep", "sleep"]), false);
});

test("canSubmitRegressionOverride rejects the outcome also being a predictor", () => {
  assert.equal(canSubmitRegressionOverride("cgpa", ["cgpa", "sleep"]), false);
});

test("buildRegressionOverridePayload returns the API payload shape when submittable", () => {
  assert.deepEqual(
    buildRegressionOverridePayload("cgpa", ["sleep", "income", "hrs_wfh"]),
    { dependent_column: "cgpa", independent_columns: ["sleep", "income", "hrs_wfh"] }
  );
});

test("buildRegressionOverridePayload de-duplicates predictors", () => {
  assert.deepEqual(
    buildRegressionOverridePayload("cgpa", ["sleep", "income", "sleep"]),
    { dependent_column: "cgpa", independent_columns: ["sleep", "income"] }
  );
});

test("buildRegressionOverridePayload returns null when not yet submittable", () => {
  assert.equal(buildRegressionOverridePayload("cgpa", ["sleep"]), null);
  assert.equal(buildRegressionOverridePayload("", ["sleep", "income"]), null);
});

test("hasStaleResults reads the project-level flag", () => {
  assert.equal(hasStaleResults({ has_stale_results: true }), true);
  assert.equal(hasStaleResults({ has_stale_results: false, objective_results: [] }), false);
});

test("hasStaleResults falls back to scanning individual items", () => {
  const analysis = {
    objective_results: [
      { id: 1, analyses: [{ id: "1-a", stale: true }] },
      { id: 2, analyses: [{ id: "2-a" }] },
    ],
  };
  assert.equal(hasStaleResults(analysis), true);
});

test("hasStaleResults is false when nothing is stale", () => {
  const analysis = {
    objective_results: [{ id: 1, analyses: [{ id: "1-a" }] }],
  };
  assert.equal(hasStaleResults(analysis), false);
});

test("hasStaleResults handles missing/null analysis without throwing", () => {
  assert.equal(hasStaleResults(null), false);
  assert.equal(hasStaleResults(undefined), false);
  assert.equal(hasStaleResults({}), false);
});
