import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { datasetContinueTarget, isPendingReviewVersion } from "./datasetContinue.js";

const pending = { id: "v2", kind: "cleaned", status: "cleaned" };

test("a freshly uploaded version goes to Dataset Review, never straight to analysis", () => {
  assert.equal(datasetContinueTarget({ dataset_path: "x" }, pending), "review");
  assert.equal(datasetContinueTarget({ dataset_path: "x" }, { ...pending, status: "validated" }), "review");
});

test("a new upload replacing an active dataset still goes to review", () => {
  assert.equal(datasetContinueTarget({ active_dataset_version_id: "v1" }, pending), "review");
});

test("the active version itself is not pending: continue to analysis", () => {
  const project = { active_dataset_version_id: "v2" };
  assert.equal(isPendingReviewVersion(pending, project), false);
  assert.equal(datasetContinueTarget(project, pending), "analysis");
  assert.equal(datasetContinueTarget(project, null), "analysis");
  assert.equal(datasetContinueTarget({ analysis_plan: {} }, null), "analysis");
});

test("failed or original versions are not reviewable", () => {
  assert.equal(isPendingReviewVersion({ ...pending, status: "failed" }, {}), false);
  assert.equal(isPendingReviewVersion({ ...pending, kind: "original" }, {}), false);
});

test("nothing known yet: ask the server", () => {
  assert.equal(datasetContinueTarget({ dataset_path: "x" }, null), "find-pending");
  assert.equal(datasetContinueTarget(null, null), "find-pending");
});

test("uploading a dataset stays on the Dataset step (no automatic jump)", () => {
  const source = readFileSync(new URL("./hooks/useThesisWorkflow.js", import.meta.url), "utf8");
  const start = source.indexOf("const file = async");
  const end = source.slice(start).search(/\r?\n  };\r?\n/);
  assert.ok(start > 0 && end > 0);
  const body = source.slice(start, start + end);
  assert.doesNotMatch(body, /setStep\("(review|workspace)"\)/);
  assert.doesNotMatch(body, /projectPath\([^)]*"(review|analysis)"\)/);
});

test("the Chapter 1 panel is not hidden while a dataset uploads", () => {
  const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /!loading && \(\s*<Chapter1Compare/);
});
