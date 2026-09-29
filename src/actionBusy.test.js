import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  actionButton,
  anyBusy,
  buildButtonLabel,
  selectionButtonLabel,
} from "./actionBusy.js";

// The Run analysis button is a CreditActionButton: it shows its loadingLabel
// ("Analysing…") exactly when its `loading` prop is true.

test("Run analysis stays in its normal state while Update selection is saving", () => {
  const busy = { qualitative: true };
  const run = actionButton(busy, "run");
  const selection = actionButton(busy, "qualitative");

  assert.equal(run.loading, false);                       // no "Analysing…"
  assert.equal(selectionButtonLabel(selection, true), "Saving…");
  assert.equal(run.disabled, true);                        // can't overlap the save
});

test("Update selection stays in its normal state while analysis is running", () => {
  const busy = { run: true };
  const selection = actionButton(busy, "qualitative");

  assert.equal(actionButton(busy, "run").loading, true);  // "Analysing…" on Run only
  assert.equal(selection.loading, false);
  assert.equal(selectionButtonLabel(selection, true), "Update selection");
  assert.equal(selectionButtonLabel(selection, false), "Confirm qualitative data →");
  assert.equal(selection.disabled, true);
});

test("saving a variable override shows on neither Run analysis nor Update selection", () => {
  const busy = { override: true };
  assert.equal(actionButton(busy, "run").loading, false);
  assert.equal(selectionButtonLabel(actionButton(busy, "qualitative"), true), "Update selection");
  assert.equal(anyBusy(busy), true);
});

test("a screen-wide load disables every action button without any loading label", () => {
  for (const action of ["build", "qualitative", "run"]) {
    assert.deepEqual(actionButton({}, action, true), { loading: false, disabled: true });
  }
  assert.equal(buildButtonLabel(actionButton({}, "build", true)), "Understand dataset →");
});

test("nothing running: every button is normal and enabled", () => {
  for (const action of ["build", "qualitative", "run"]) {
    assert.deepEqual(actionButton({}, action), { loading: false, disabled: false });
  }
  assert.deepEqual(actionButton({ run: false }, "run"), { loading: false, disabled: false });
  assert.equal(anyBusy(undefined), false);
});

test("the Analysis step's buttons read their own action's state", () => {
  const source = readFileSync(new URL("./components/ThesisWorkspace.jsx", import.meta.url), "utf8");
  assert.match(source, /actionButton\(busyActions, "run", loading\)/);
  assert.match(source, /actionButton\(busyActions, "qualitative", loading\)/);
  assert.match(source, /loading=\{runButton\.loading\}/);
  assert.match(source, /state=\{selectionButton\}/);
  // No action button takes its label from the screen-wide flag any more.
  // (The "Use these variables" form's `loading` is its own local save.)
  assert.doesNotMatch(source, /loading=\{loading\}/);
  assert.doesNotMatch(source, /\{loading \? "Understanding dataset…"/);
  assert.doesNotMatch(source, /"Update selection"/);
  assert.match(source, /loading=\{saving\}\s+locked=\{locked\}/);
});

test("each Analysis-step action sets only its own busy flag", () => {
  const workflow = readFileSync(new URL("./hooks/useThesisWorkflow.js", import.meta.url), "utf8");
  for (const [fn, action] of [
    ["build", "build"],
    ["confirmQualitativeColumns", "qualitative"],
    ["overrideAnalysis", "override"],
    ["run", "run"],
  ]) {
    const start = workflow.indexOf(`const ${fn} = async`);
    const end = workflow.slice(start).search(/\r?\n  };\r?\n/);
    assert.ok(start > 0 && end > 0, fn);
    const body = workflow.slice(start, start + end);
    assert.match(body, new RegExp(`setBusy: busyFor\\("${action}"\\)`), fn);
    assert.doesNotMatch(body, /setBusy: setLoading/, fn);
  }
});
