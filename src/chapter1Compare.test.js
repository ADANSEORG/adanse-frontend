import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CONSENT_NOTICE,
  comparisonView,
  exactMatches,
  isDocxFile,
  matchLabel,
  matchPositions,
  normalizeForMatch,
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
        "To assess  impact.",       // repeated inner whitespace collapses
        "To assess impact",         // punctuation differs
        "To identify factors.",
      ],
      other
    ),
    [true, false, true, false, true]
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

test("curly quotes, en/em dashes and whitespace are normalized, nothing else", () => {
  assert.equal(
    normalizeForMatch("  To assess students\u2019 \u201cAI\u201d use \u2013 and\u00a0its\t\neffect \u2014 on GPA.  "),
    "To assess students' \"AI\" use - and its effect - on GPA."
  );
  assert.equal(normalizeForMatch("To Assess"), "To Assess");
});

test("typographic differences match; different wording still does not", () => {
  const document = ["To examine lecturers’ “feedback” — timing and quality."];
  assert.deepEqual(
    exactMatches(document, ["To examine lecturers' \"feedback\" - timing and quality."]),
    [true]
  );
  for (const typed of [
    "To examine lecturers' \"feedback\" - timing and quantity.",  // one word differs
    "to examine lecturers' \"feedback\" - timing and quality.",   // case differs
    "To examine lecturers' feedback - timing and quality.",        // quotes removed
  ]) {
    assert.deepEqual(exactMatches(document, [typed]), [false], typed);
    assert.deepEqual(exactMatches([typed], document), [false], typed);
  }
});

test("normalization is for comparing only: the text shown is unchanged", () => {
  const curly = "To assess students’ use – of AI.";
  const view = comparisonView({
    objectives: ["To assess students' use - of AI."],
    chapter1_objectives: { ...found, objectives: [curly, "To identify factors."] },
  });
  assert.equal(view.fromDocument[0], curly);
  assert.deepEqual(view.documentMatches, [true, false]);
  assert.deepEqual(view.enteredMatches, [true]);
});

test("a matched line names the 1-based position of its match on the other side", () => {
  const documentList = ["To identify factors.", "To assess impact.", "To compare groups."];
  const entered = ["To compare groups.", "Something only typed.", "To identify factors."];
  assert.deepEqual(matchPositions(documentList, entered), [3, null, 1]);
  assert.deepEqual(matchPositions(entered, documentList), [3, null, 1]);
});

test("positions use the same normalized comparison as the highlighting", () => {
  const documentList = ["To examine lecturers\u2019 \u201cfeedback\u201d \u2014 timing."];
  const entered = ["Unrelated.", "To examine  lecturers' \"feedback\" - timing."];
  assert.deepEqual(matchPositions(documentList, entered), [2]);
  assert.deepEqual(matchPositions(entered, documentList), [null, 1]);
  assert.deepEqual(matchPositions(["to examine lecturers' \"feedback\" - timing."], documentList), [null]);
});

test("the same wording twice on the other side points to its first position", () => {
  assert.deepEqual(matchPositions(["To assess impact."], ["X.", "To assess impact.", "To assess impact."]), [2]);
});

test("positions follow each list's own numbering, skipping blank entries it doesn't show", () => {
  const view = comparisonView({
    objectives: ["", "To assess impact."],
    chapter1_objectives: found,
  });
  assert.deepEqual(view.entered, ["To assess impact."]);
  assert.deepEqual(view.documentMatchPositions, [null, 1]);
  assert.deepEqual(view.enteredMatchPositions, [2]);
});

test("labels: document lines point into what you entered, entered lines into your document", () => {
  assert.equal(matchLabel(2, "entered"), "Matches item 2 in what you entered");
  assert.equal(matchLabel(3, "document"), "Matches item 3 in your document");
  assert.equal(matchLabel(null, "entered"), "No exact match found");
  assert.equal(matchLabel(null, "document"), "No exact match found");
});

test("the panel labels each side against the other list", () => {
  const source = readFileSync(new URL("./components/Chapter1Compare.jsx", import.meta.url), "utf8");
  assert.match(source, /position=\{view\.documentMatchPositions\[i\]\} otherSide="entered"/);
  assert.match(source, /position=\{view\.enteredMatchPositions\[i\]\} otherSide="document"/);
  assert.doesNotMatch(source, /Same wording in both lists/);
});
