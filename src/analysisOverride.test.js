import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isRegressionAnalysis,
  canSubmitOverride,
  buildPairwiseOverridePayload,
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
