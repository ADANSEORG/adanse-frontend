import test from "node:test";
import assert from "node:assert/strict";

import { isDocxFile, normalizeForMatch } from "./docxFile.js";

test("only .docx files are accepted", () => {
  assert.equal(isDocxFile({ name: "Chapters 1-3.DOCX" }), true);
  for (const name of ["ch.pdf", "ch.doc", "ch.docx.pdf", ""]) {
    assert.equal(isDocxFile({ name }), false);
  }
});

test("curly quotes, en/em dashes and whitespace are normalized, nothing else", () => {
  assert.equal(
    normalizeForMatch("  To assess students’ “AI” use – and its\t\neffect — on GPA.  "),
    "To assess students' \"AI\" use - and its effect - on GPA."
  );
  assert.equal(normalizeForMatch("To Assess"), "To Assess");
});

test("different wording still differs after normalization", () => {
  const document = normalizeForMatch("To examine lecturers’ “feedback” — timing and quality.");
  assert.equal(document, normalizeForMatch("To examine lecturers' \"feedback\" - timing and quality."));
  for (const typed of [
    "To examine lecturers' \"feedback\" - timing and quantity.", // one word differs
    "to examine lecturers' \"feedback\" - timing and quality.",  // case differs
    "To examine lecturers' feedback - timing and quality.",       // quotes removed
  ]) {
    assert.notEqual(normalizeForMatch(typed), document, typed);
  }
});
