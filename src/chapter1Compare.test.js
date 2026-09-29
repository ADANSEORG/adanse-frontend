import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CONSENT_NOTICE,
  comparisonView,
  exactMatches,
  isDocxFile,
} from "./chapter1Compare.js";

const found = {
  status: "found",
  heading: "1.3.2 Specific Objectives",
  objectives: ["To identify factors.", "To assess impact."],
};

test("no uploaded document shows nothing to compare", () => {
  assert.deepEqual(comparisonView({ objectives: ["A"] }), { state: "none" });
  assert.deepEqual(comparisonView(null), { state: "none" });
});

test("a found list is shown next to what the researcher entered", () => {
  const view = comparisonView({ objectives: [" Typed one ", ""], chapter1_objectives: found });
  assert.equal(view.state, "found");
  assert.deepEqual(view.fromDocument, found.objectives);
  assert.deepEqual(view.entered, ["Typed one"]);
  assert.equal(view.heading, "1.3.2 Specific Objectives");
});

test("not found never shows any objectives from the document", () => {
  const view = comparisonView({
    objectives: ["Typed"],
    chapter1_objectives: { status: "not_found", message: "No heading.", objectives: [] },
  });
  assert.deepEqual(view, { state: "not_found", message: "No heading.", entered: ["Typed"] });
});

test("a malformed saved result is treated as not found, never partial", () => {
  for (const saved of [
    { status: "found", objectives: [] },
    { status: "weird", objectives: ["Something"] },
    { objectives: ["Something"] },
  ]) {
    const view = comparisonView({ chapter1_objectives: saved });
    assert.equal(view.state, "not_found");
    assert.equal("fromDocument" in view, false);
  }
});

test("only .docx files are accepted", () => {
  assert.equal(isDocxFile({ name: "Chapters 1-3.DOCX" }), true);
  for (const name of ["ch.pdf", "ch.doc", "ch.docx.pdf", ""]) {
    assert.equal(isDocxFile({ name }), false);
  }
});

test("the consent notice says the document isn't stored", () => {
  assert.match(CONSENT_NOTICE, /only to compare against your Research Context, and isn't stored/);
});

test("the panel never passes judgement on the student's work", () => {
  const source = readFileSync(new URL("./components/Chapter1Compare.jsx", import.meta.url), "utf8")
    + readFileSync(new URL("./chapter1Compare.js", import.meta.url), "utf8");
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(text, /inconsisten|mismatch|\bwrong\b|incorrect|doesn't match|do not match/i);
});

test("exact match is pure string equality after trimming, nothing fuzzier", () => {
  const other = ["  To assess impact.  ", "To identify factors."];
  assert.deepEqual(
    exactMatches(
      [
        "To assess impact.",        // same after trimming
        "to assess impact.",        // case differs
        "To assess  impact.",       // inner spacing differs
        "To assess impact",         // punctuation differs
        "To identify factors.",
      ],
      other
    ),
    [true, false, false, false, true]
  );
});

test("each side is flagged independently, text and order untouched", () => {
  const view = comparisonView({
    objectives: ["To assess impact.", "Something only typed."],
    chapter1_objectives: { ...found, objectives: ["To identify factors.", "To assess impact."] },
  });
  assert.deepEqual(view.fromDocument, ["To identify factors.", "To assess impact."]);
  assert.deepEqual(view.documentMatches, [false, true]);
  assert.deepEqual(view.entered, ["To assess impact.", "Something only typed."]);
  assert.deepEqual(view.enteredMatches, [true, false]);
});

test("nothing entered yet: every document line is unmatched", () => {
  const view = comparisonView({ objectives: [], chapter1_objectives: found });
  assert.deepEqual(view.documentMatches, [false, false]);
  assert.deepEqual(view.enteredMatches, []);
});
