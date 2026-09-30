import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  parsePlannedSample,
  plannedSamplePayload,
  savedPlannedSample,
} from "./plannedSample.js";

test("a whole number is accepted, with spaces or thousands commas", () => {
  assert.deepEqual(parsePlannedSample("200"), { value: 200, error: "" });
  assert.deepEqual(parsePlannedSample(" 1,500 "), { value: 1500, error: "" });
  assert.deepEqual(parsePlannedSample("1 000 000"), { value: 1000000, error: "" });
});

test("blank means no planned sample size, and is not an error", () => {
  assert.deepEqual(parsePlannedSample(""), { value: null, error: "" });
  assert.deepEqual(parsePlannedSample("   "), { value: null, error: "" });
  assert.deepEqual(parsePlannedSample(undefined), { value: null, error: "" });
});

test("anything else gets a plain error and no value", () => {
  for (const text of ["abc", "200.5", "-5", "2e3", "200 respondents"]) {
    const parsed = parsePlannedSample(text);
    assert.equal(parsed.value, null, text);
    assert.match(parsed.error, /whole number/, text);
  }
  for (const text of ["0", "1000001"]) {
    assert.match(parsePlannedSample(text).error, /between 1 and 1,000,000/, text);
  }
});

test("the saved size is read from the project", () => {
  assert.equal(savedPlannedSample({ sample_plan: { size: 200, source: "typed" } }), 200);
  for (const project of [null, {}, { sample_plan: null }, { sample_plan: { size: "200" } }, { sample_plan: { size: 0 } }]) {
    assert.equal(savedPlannedSample(project), null);
  }
});

test("only a change is sent with the Research Context save", () => {
  const saved = { sample_plan: { size: 200, source: "typed" } };
  assert.deepEqual(plannedSamplePayload("200", saved), {});            // unchanged
  assert.deepEqual(plannedSamplePayload("", {}), {});                   // still none
  assert.deepEqual(plannedSamplePayload("250", saved), { planned_sample_size: 250 });
  assert.deepEqual(plannedSamplePayload("", saved), { planned_sample_size: null }); // clears
  assert.deepEqual(plannedSamplePayload("180", null), { planned_sample_size: 180 }); // new project
  assert.deepEqual(plannedSamplePayload("abc", saved), {});             // invalid: never sent
});

test("the Research Context form has the field and blocks saving an invalid value", () => {
  const form = readFileSync(new URL("./components/ThesisSetup.jsx", import.meta.url), "utf8");
  assert.match(form, /Planned sample size <span>optional<\/span>/);
  assert.match(form, /\.\.\.plannedSamplePayload\(plannedSample,initial\)/);
  assert.match(form, /savedPlannedSample\(initial\)/);
  assert.match(form, /disabled=\{loading\|\|!title\.trim\(\)\|\|Boolean\(plannedSampleError\)\}/);
  assert.match(form, /if\(!title\.trim\(\)\|\|plannedSampleError\)return;/);
});
