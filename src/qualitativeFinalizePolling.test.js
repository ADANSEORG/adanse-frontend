import { test } from "node:test";
import assert from "node:assert/strict";

import {
  FINALIZE_POLL_INTERVAL_MS,
  FINALIZE_HEADLINE,
  isFinalizing,
  isFinalizeFailed,
  isFinalizeComplete,
  finalizeStepText,
  finalizeErrorMessage,
  buildFinalizedOutcome,
} from "./qualitativeFinalizePolling.js";

test("isFinalizing is true only while phase is 'finalizing'", () => {
  assert.equal(isFinalizing({ phase: "finalizing" }), true);
  assert.equal(isFinalizing({ phase: "complete" }), false);
  assert.equal(isFinalizing({ phase: "failed" }), false);
  assert.equal(isFinalizing({ phase: "defining" }), false);
  assert.equal(isFinalizing(null), false);
  assert.equal(isFinalizing(undefined), false);
});

test("isFinalizeFailed is true only while phase is 'failed'", () => {
  assert.equal(isFinalizeFailed({ phase: "failed" }), true);
  assert.equal(isFinalizeFailed({ phase: "finalizing" }), false);
  assert.equal(isFinalizeFailed({ phase: "complete" }), false);
  assert.equal(isFinalizeFailed(null), false);
});

test("isFinalizeComplete is true only while phase is 'complete'", () => {
  assert.equal(isFinalizeComplete({ phase: "complete" }), true);
  assert.equal(isFinalizeComplete({ phase: "finalizing" }), false);
  assert.equal(isFinalizeComplete(null), false);
});

test("finalizeStepText surfaces the session's current step", () => {
  assert.equal(
    finalizeStepText({ phase: "finalizing", finalize_step: "Writing narrative for theme 2 of 5..." }),
    "Writing narrative for theme 2 of 5..."
  );
});

test("finalizeStepText falls back when there is no step message yet", () => {
  assert.equal(finalizeStepText({ phase: "finalizing", finalize_step: null }), "Working…");
  assert.equal(finalizeStepText({ phase: "finalizing" }), "Working…");
  assert.equal(finalizeStepText(null), "Working…");
});

test("finalizeErrorMessage surfaces the session's recorded failure", () => {
  assert.equal(
    finalizeErrorMessage({ phase: "failed", finalize_error: "The analysis could not be finalized." }),
    "The analysis could not be finalized."
  );
});

test("finalizeErrorMessage falls back when no message was recorded", () => {
  assert.equal(finalizeErrorMessage({ phase: "failed", finalize_error: null }), "Could not finalize themes.");
  assert.equal(finalizeErrorMessage(null), "Could not finalize themes.");
});

test("buildFinalizedOutcome assembles the {column, status, result} shape onQualitativeFinalized expects", () => {
  const session = { phase: "complete", result: { test: "thematic_analysis", themes: [{ theme: "Financial Constraints" }] } };
  assert.deepEqual(buildFinalizedOutcome("ChallengesFaced", session), {
    column: "ChallengesFaced",
    status: "complete",
    result: session.result,
  });
});

test("buildFinalizedOutcome tolerates a missing result", () => {
  assert.deepEqual(buildFinalizedOutcome("ChallengesFaced", { phase: "complete" }), {
    column: "ChallengesFaced",
    status: "complete",
    result: null,
  });
});

test("polling constants are sane", () => {
  assert.equal(FINALIZE_POLL_INTERVAL_MS, 4000);
  assert.equal(typeof FINALIZE_HEADLINE, "string");
  assert.ok(FINALIZE_HEADLINE.length > 0);
});
