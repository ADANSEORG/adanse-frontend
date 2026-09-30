import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { actionButton } from "./actionBusy.js";

// One action's loading label must never appear on another action's button.
// The panels keep a `pending` object with one key per running action and
// derive each button's state with actionButton().

const source = (file) => readFileSync(new URL(`./components/${file}`, import.meta.url), "utf8");

test("Chapter 1 panel: Remove shows 'Removing…' and leaves the upload button's label alone", () => {
  const pending = { remove: true };
  assert.equal(actionButton(pending, "upload").loading, false);   // no "Reading…"
  assert.equal(actionButton(pending, "remove").loading, true);    // "Removing…"
  assert.equal(actionButton(pending, "upload").disabled, true);   // but can't overlap
});

test("Chapter 1 panel: 'Use this wording' shows only on the line clicked", () => {
  const pending = { "wording:2": true };
  assert.equal(actionButton(pending, "wording:2").loading, true);
  assert.equal(actionButton(pending, "wording:1").loading, false);
  assert.equal(actionButton(pending, "wording:3").loading, false);
  assert.equal(actionButton(pending, "upload").loading, false);
  assert.equal(actionButton(pending, "remove").loading, false);
});

test("Chapter 1 panel: uploading shows 'Reading…' on the upload button only", () => {
  const pending = { upload: true };
  assert.equal(actionButton(pending, "upload").loading, true);
  assert.equal(actionButton(pending, "remove").loading, false);
  assert.equal(actionButton(pending, "wording:1").loading, false);
});

test("Chapter 1 panel: each button reads its own action's state", () => {
  const panel = source("Chapter1Compare.jsx");
  assert.match(panel, /\{uploadButton\.loading\s*\?\s*"Reading…"/);
  assert.match(panel, /\{removeButton\.loading \? "Removing…" : "Remove"\}/);
  assert.match(panel, /\{wordingButton\(row\.document\.number\)\.loading \? "Saving…" : "Use this wording →"\}/);
  assert.match(panel, /run\("upload",/);
  assert.match(panel, /run\("remove",/);
  assert.match(panel, /run\(`wording:\$\{position\}`,/);
  assert.doesNotMatch(panel, /\{busy\s*\?/);
});

test("Category order: 'Reset to automatic' no longer shows 'Saving…' on Save", () => {
  const pending = { reset: true };
  assert.equal(actionButton(pending, "save").loading, false);
  assert.equal(actionButton(pending, "reset").loading, true);
  assert.equal(actionButton(pending, "save").disabled, true);

  const review = source("DatasetReview.jsx");
  assert.match(review, /\{saveButton\.loading \? "Saving…" : "Save"\}/);
  assert.match(review, /\{resetButton\.loading \? "Resetting…" : "Reset to automatic"\}/);
  assert.match(review, /setPending\(\{ save: true \}\)/);
  assert.match(review, /setPending\(\{ reset: true \}\)/);
  assert.doesNotMatch(review, /\{busy \? "Saving…" : "Save"\}/);
});
