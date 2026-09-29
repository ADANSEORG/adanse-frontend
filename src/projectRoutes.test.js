// U-tests (spec tag): pure functions, no network, no Supabase, no DOM.
import test from "node:test";
import assert from "node:assert/strict";

import {
  PROJECT_STEPS,
  defaultProjectStep,
  isProjectStep,
  isValidProjectId,
  redirectNotice,
  resolveProjectStep,
} from "./projectRoutes.js";

const UUID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

// ---------------------------------------------------------------------------
// isValidProjectId (R1)
// ---------------------------------------------------------------------------
test("a well-formed UUID, in either case, is a valid project id", () => {
  assert.equal(isValidProjectId(UUID), true);
  assert.equal(isValidProjectId(UUID.toUpperCase()), true);
});

test("anything that is not exactly an RFC 4122 layout is rejected", () => {
  for (const bad of [
    "not-a-uuid",
    "",
    "3fa85f64-5717-4562-b3fc-2c963f66afa", // one hex digit short
    "3fa85f64-5717-4562-b3fc-2c963f66afa6x", // trailing junk
    "../../credits", // path traversal via a crafted link
    "3fa85f64-5717-4562-b3fc-2c963f66afa6/../../credits",
    "%2e%2e%2fcredits",
    null,
    undefined,
    42,
    { toString: () => UUID }, // must be a real string, not stringifiable
  ]) {
    assert.equal(isValidProjectId(bad), false, JSON.stringify(bad));
  }
});

// ---------------------------------------------------------------------------
// isProjectStep
// ---------------------------------------------------------------------------
test("every PROJECT_STEPS entry is recognised, and PROJECT_STEPS matches the five named steps", () => {
  assert.deepEqual(PROJECT_STEPS, ["setup", "dataset", "review", "analysis", "chapter4"]);
  for (const step of PROJECT_STEPS) assert.equal(isProjectStep(step), true);
});

test("unrecognised strings, including the old internal names, are not steps", () => {
  for (const bad of ["upload", "workspace", "", "Setup", " setup", null, undefined, 1]) {
    assert.equal(isProjectStep(bad), false, JSON.stringify(bad));
  }
});

// ---------------------------------------------------------------------------
// defaultProjectStep -- mirrors today's select() routing (spec section 5's
// "steps the data doesn't allow" table describes the SAME priority order)
// ---------------------------------------------------------------------------
test("no project at all defaults to setup", () => {
  assert.equal(defaultProjectStep(null), "setup");
  assert.equal(defaultProjectStep(undefined), "setup");
});

test("a brand new project (nothing set) defaults to setup", () => {
  assert.equal(defaultProjectStep({}), "setup");
});

test("an activated dataset with no plan yet defaults to dataset", () => {
  assert.equal(
    defaultProjectStep({ dataset_path: "x.csv", active_dataset_version_id: "v1" }),
    "dataset"
  );
});

test("an uploaded but not-yet-active dataset defaults to review only when a pending version exists", () => {
  assert.equal(
    defaultProjectStep({ dataset_path: "x.csv" }, { hasPendingReviewVersion: true }),
    "review"
  );
  assert.equal(
    defaultProjectStep({ dataset_path: "x.csv" }, { hasPendingReviewVersion: false }),
    "dataset"
  );
  assert.equal(defaultProjectStep({ dataset_path: "x.csv" }), "dataset"); // omitted facts, same as false
});

test("a built plan defaults to analysis even without results yet", () => {
  assert.equal(defaultProjectStep({ analysis_plan: {} }), "analysis");
});

test("results present defaults to analysis regardless of anything else", () => {
  assert.equal(
    defaultProjectStep({ analysis_results: {}, dataset_path: null, active_dataset_version_id: null }),
    "analysis"
  );
});

test("results outrank a merely-built plan, which outranks an activated dataset", () => {
  assert.equal(defaultProjectStep({ analysis_results: {}, analysis_plan: {} }), "analysis");
  assert.equal(
    defaultProjectStep({ analysis_plan: {}, dataset_path: "x", active_dataset_version_id: "v" }),
    "analysis"
  );
});

// ---------------------------------------------------------------------------
// resolveProjectStep -- single-hop correction (G3), spec section 5 + 6
// ---------------------------------------------------------------------------
test("setup and dataset are always allowed once the project has loaded", () => {
  for (const step of ["setup", "dataset"]) {
    const result = resolveProjectStep(step, {});
    assert.deepEqual(result, { step, redirected: false, reason: null });
  }
});

test("review is allowed with a pending version, corrected to dataset without one", () => {
  const ok = resolveProjectStep("review", {}, { hasPendingReviewVersion: true });
  assert.deepEqual(ok, { step: "review", redirected: false, reason: null });

  const blocked = resolveProjectStep("review", {}, { hasPendingReviewVersion: false });
  assert.deepEqual(blocked, { step: "dataset", redirected: true, reason: "pending-review" });
});

test("analysis is allowed by an active version, a plan, or results -- any one of the three", () => {
  for (const project of [
    { active_dataset_version_id: "v1" },
    { analysis_plan: {} },
    { analysis_results: {} },
  ]) {
    assert.deepEqual(resolveProjectStep("analysis", project), {
      step: "analysis",
      redirected: false,
      reason: null,
    });
  }
});

test("analysis with none of the three falls back to dataset", () => {
  assert.deepEqual(resolveProjectStep("analysis", {}), {
    step: "dataset",
    redirected: true,
    reason: "no-active-dataset",
  });
});

test("chapter4 requires BOTH results and the gate open -- either missing falls back to analysis", () => {
  assert.deepEqual(
    resolveProjectStep("chapter4", { analysis_results: {} }, { chapter4Blocked: false }),
    { step: "chapter4", redirected: false, reason: null }
  );
  assert.deepEqual(
    resolveProjectStep("chapter4", { analysis_results: {} }, { chapter4Blocked: true }),
    { step: "analysis", redirected: true, reason: "chapter4-blocked" }
  );
  // No results AND nothing else either (no active dataset, no plan): falls
  // all the way to dataset, not nominally to analysis -- see the dedicated
  // "falls all the way to dataset" test below for why.
  assert.deepEqual(
    resolveProjectStep("chapter4", {}, { chapter4Blocked: false }),
    { step: "dataset", redirected: true, reason: "chapter4-blocked" }
  );
});

test("chapter4 defaults to blocked when the caller does not say (fail closed, per G5)", () => {
  assert.deepEqual(resolveProjectStep("chapter4", { analysis_results: {} }, {}), {
    step: "analysis",
    redirected: true,
    reason: "chapter4-blocked",
  });
  assert.deepEqual(resolveProjectStep("chapter4", { analysis_results: {} }), {
    step: "analysis",
    redirected: true,
    reason: "chapter4-blocked",
  });
});

test("chapter4 on a project with NOTHING yet (no active dataset, no plan, no results) falls all the way to dataset, not nominally to analysis", () => {
  // A typed-in link, not reachable through the UI today (goToChapter4 already
  // requires an analysis) -- but the resolver must still land somewhere
  // itself allowed in one hop (G3, G5), not on "analysis" by name when
  // analysis has nothing to show either.
  const result = resolveProjectStep("chapter4", {}, { chapter4Blocked: true });
  assert.deepEqual(result, { step: "dataset", redirected: true, reason: "chapter4-blocked" });
});

test("an unrecognised step degrades to the project's default step, in one hop -- old/misspelled links", () => {
  const r1 = resolveProjectStep("workspace", { analysis_results: {} }); // old internal name
  assert.equal(r1.step, "analysis");
  assert.equal(r1.redirected, true);
  assert.equal(r1.reason, "unknown-step");

  const r2 = resolveProjectStep("nonsense", {});
  assert.equal(r2.step, "setup");
  assert.equal(r2.reason, "unknown-step");

  for (const bad of [undefined, null, "", 42]) {
    assert.equal(resolveProjectStep(bad, {}).reason, "unknown-step");
  }
});

test("resolving never returns a step that isn't one of the five, even for a garbage request", () => {
  for (const requested of ["chapter4", "review", "analysis", "workspace", "setup", "dataset", null]) {
    for (const project of [{}, { analysis_results: {} }, { dataset_path: "x" }]) {
      assert.equal(isProjectStep(resolveProjectStep(requested, project).step), true);
    }
  }
});

test("resolving is idempotent -- re-resolving the output step changes nothing further (no redirect chains)", () => {
  const facts = { hasPendingReviewVersion: false, chapter4Blocked: true };
  for (const requested of ["setup", "dataset", "review", "analysis", "chapter4", "workspace"]) {
    for (const project of [{}, { dataset_path: "x" }, { analysis_plan: {} }, { analysis_results: {} }]) {
      const once = resolveProjectStep(requested, project, facts);
      const twice = resolveProjectStep(once.step, project, facts);
      assert.equal(twice.step, once.step, `${requested} on ${JSON.stringify(project)}`);
      assert.equal(twice.redirected, false);
    }
  }
});

// ---------------------------------------------------------------------------
// redirectNotice
// ---------------------------------------------------------------------------
test("the two data-gap reasons have a notice; chapter4's own message and unknown-step are silent here", () => {
  assert.equal(typeof redirectNotice("pending-review"), "string");
  assert.equal(typeof redirectNotice("no-active-dataset"), "string");
  assert.equal(redirectNotice("chapter4-blocked"), null); // chapter4Gate(analysis).message is shown instead
  assert.equal(redirectNotice("unknown-step"), null); // tolerated silently, per R22
  assert.equal(redirectNotice(null), null);
  assert.equal(redirectNotice("made-up-reason"), null);
});
