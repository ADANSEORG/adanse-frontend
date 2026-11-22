import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The backend marks placeholder codes and sets session.coding_warning when AI
// coding failed or fell back (qualitative_engine.coding_warning). The review
// must show both instead of presenting placeholders as AI coding.
const review = readFileSync(new URL("./components/QualitativeReview.jsx", import.meta.url), "utf8");

test("the coding review shows the backend's coding warning", () => {
  assert.match(review, /session\.coding_warning && \(step === "familiarize" \|\| step === "code"\)/);
  assert.match(review, /\{session\.coding_warning\}/);
});

test("placeholder codes are labelled as such", () => {
  assert.match(review, /code\.placeholder && \(/);
  assert.match(review, />\s*Placeholder\s*</);
});

test("the familiarize step no longer claims every response was coded when it wasn't", () => {
  assert.match(review, /session\.coding_warning\s*\?\s*"Some codes below are placeholders/);
});
