// U-tests (spec tag): pure functions, no network, no Supabase, no DOM.
import test from "node:test";
import assert from "node:assert/strict";

import {
  PROJECT_STEPS,
  defaultProjectStep,
  historyBackTarget,
  historyIndex,
  pushedFrom,
  stepPushState,
  isProjectStep,
  isValidProjectId,
  parseProjectPath,
  projectPath,
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

// ---------------------------------------------------------------------------
// parseProjectPath / projectPath
// ---------------------------------------------------------------------------
test("a bare /project/:id parses with step null", () => {
  assert.deepEqual(parseProjectPath(`/project/${UUID}`), { id: UUID, step: null });
});

test("/project/:id/:step parses both parts, step lowercased", () => {
  assert.deepEqual(parseProjectPath(`/project/${UUID}/Dataset`), { id: UUID, step: "dataset" });
  assert.deepEqual(parseProjectPath(`/project/${UUID}/chapter4`), { id: UUID, step: "chapter4" });
});

test("case in the literal 'project' segment and a trailing slash do not matter, as with viewRoutes.js", () => {
  assert.deepEqual(parseProjectPath(`/Project/${UUID}/setup`), { id: UUID, step: "setup" });
  assert.deepEqual(parseProjectPath(`/project/${UUID}/`), { id: UUID, step: null });
  assert.deepEqual(parseProjectPath(`/project/${UUID}/setup/`), { id: UUID, step: "setup" });
  assert.deepEqual(parseProjectPath(`/PROJECT/${UUID}//`), { id: UUID, step: null });
});

test("the id segment is returned exactly as written -- id validity is isValidProjectId's job, not this function's", () => {
  assert.deepEqual(parseProjectPath("/project/not-a-uuid"), { id: "not-a-uuid", step: null });
  assert.deepEqual(parseProjectPath("/project/not-a-uuid/setup"), { id: "not-a-uuid", step: "setup" });
});

test("anything that is not a project path, or a third path segment, is not parsed", () => {
  for (const path of ["/", "", "/account", "/credits", "/payment/callback", "/projects", `/project`, `/x/project/${UUID}`, `/project/${UUID}/setup/extra`]) {
    assert.equal(parseProjectPath(path), null, path);
  }
});

test("a pathname that is not a string does not parse", () => {
  for (const value of [undefined, null, 42, {}]) {
    assert.equal(parseProjectPath(value), null);
  }
});

test("projectPath builds the two shapes parseProjectPath reads back, and percent-encodes the id (decision 5)", () => {
  assert.equal(projectPath(UUID, "dataset"), `/project/${UUID}/dataset`);
  assert.equal(projectPath(UUID), `/project/${UUID}`);
  assert.deepEqual(parseProjectPath(projectPath(UUID, "review")), { id: UUID, step: "review" });
  assert.deepEqual(parseProjectPath(projectPath(UUID)), { id: UUID, step: null });
});

test("projectPath percent-encodes an id that isn't already URL-safe", () => {
  assert.equal(projectPath("abc/def", "setup"), "/project/abc%2Fdef/setup");
});

// ---------------------------------------------------------------------------
// historyBackTarget
// ---------------------------------------------------------------------------
// `historyState` is window.history.state as React Router writes it:
// { usr, key, idx }, idx counting the router's own entries in this tab.
// An entry pushed by a step navigation: React Router keeps navigate()'s state
// under history.state.usr.
const pushed = (idx, from) => ({ key: "k" + idx, idx, usr: stepPushState(from) });

test("Back steps through history when the previous entry is the logical previous step", () => {
  assert.equal(historyBackTarget(pushed(1, "/fallback"), "/fallback"), -1);
  assert.equal(historyBackTarget(pushed(4, "/project/abc/analysis"), "/project/abc/analysis"), -1);
});

test("REGRESSION (bounce): an earlier entry that is NOT the logical previous step is pushed over, not stepped back to", () => {
  // Chapter 4 -> in-page Back pushed Analysis (recording it came from Chapter 4).
  // Back from that Analysis must go to Review/Dataset, not step back to Chapter 4.
  const analysisReachedByBack = pushed(2, "/project/abc/chapter4");
  assert.equal(historyBackTarget(analysisReachedByBack, "/project/abc/review"), "/project/abc/review");
});

test("an earlier entry with nothing recorded (reached some other way) pushes the logical previous step", () => {
  assert.equal(historyBackTarget({ key: "k8f2ab", idx: 1 }, "/fallback"), "/fallback");
  assert.equal(historyBackTarget({ key: "k8f2ab", idx: 1, usr: null }, "/fallback"), "/fallback");
  assert.equal(historyBackTarget({ key: "k8f2ab", idx: 1, usr: { prev: 5 } }, "/fallback"), "/fallback");
});

test("a recorded match on the tab's first entry still does not step out of the app", () => {
  assert.equal(historyBackTarget({ key: "x", idx: 0, usr: stepPushState("/fallback") }, "/fallback"), "/fallback");
});

test("pushedFrom reads what stepPushState recorded, and nothing else", () => {
  assert.equal(pushedFrom({ usr: stepPushState("/project/abc/analysis") }), "/project/abc/analysis");
  for (const state of [undefined, null, {}, { usr: {} }, { usr: { prev: "" } }, { usr: { prev: 1 } }]) {
    assert.equal(pushedFrom(state), null, JSON.stringify(state));
  }
});

test("after a reload or a link opened in a new tab (first entry) Back goes to the given fallback, not -1", () => {
  assert.equal(historyBackTarget({ idx: 0 }, "/fallback"), "/fallback");
});

test("REGRESSION: a first entry that was REPLACED has a new key but is still the first -- Back must not leave the app", () => {
  // Opening the app at "/" reopens the last project by replacing "/" with
  // /project/:id/<step>; /project/:id and the chapter4 gate correction replace
  // too. The key changes, the index stays 0. Keyed on location.key, this read
  // as "an earlier entry exists", so Back called navigate(-1) and left the app.
  assert.equal(historyBackTarget({ key: "e66o8tfp", idx: 0 }, "/project/abc/analysis"), "/project/abc/analysis");
});

test("with no usable history state Back goes to the fallback rather than leaving the app", () => {
  for (const state of [undefined, null, {}, { idx: null }, { idx: "3" }, { idx: -1 }, { idx: 1.5 }]) {
    assert.equal(historyBackTarget(state, "/fallback"), "/fallback", JSON.stringify(state));
  }
});

test("historyIndex reads React Router's idx, and anything unusable counts as the first entry", () => {
  assert.equal(historyIndex({ idx: 3 }), 3);
  assert.equal(historyIndex({ idx: 0, key: "x" }), 0);
  assert.equal(historyIndex(null), 0);
  assert.equal(historyIndex({ key: "only-a-key" }), 0);
});

test("the fallback is returned verbatim, whatever the caller passes (viewRoutes.js's settingsBackTarget always uses \"/\"; the project Back button passes a specific step path)", () => {
  assert.equal(historyBackTarget({ idx: 0 }, "/project/abc/setup"), "/project/abc/setup");
  assert.equal(historyBackTarget({ idx: 0 }, "/"), "/");
});

test("every in-page Back decides from the history index, never from location.key", async () => {
  const { readFileSync } = await import("node:fs");
  const hook = readFileSync(new URL("./hooks/useThesisWorkflow.js", import.meta.url), "utf8");
  const calls = hook.match(/(historyBackTarget|settingsBackTarget)\(([^,)]*)/g) || [];
  assert.equal(calls.length, 5, calls.join(" | "));
  for (const call of calls) assert.match(call, /\(window\.history\.state$/, call);
  assert.doesNotMatch(hook, /BackTarget\(location\.key/);
});

test("every push of a project step records where it came from (pushStep); only replaces call navigate with a project path", async () => {
  const { readFileSync } = await import("node:fs");
  const hook = readFileSync(new URL("./hooks/useThesisWorkflow.js", import.meta.url), "utf8");
  assert.match(hook, /const pushStep = \(path\) => \{\s*navigate\(path, \{ state: stepPushState\(location\.pathname\) \}\);/);
  // A bare navigate() to a project path, or to a Back fallback `target`, would push without recording.
  for (const call of hook.match(/navigate\((projectPath\([^)]*\)|target|targetPath)[^;]*;/g) || []) {
    assert.match(call, /replace: true/, call);
  }
  assert.ok((hook.match(/pushStep\(/g) || []).length >= 12);
});
