import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FILL_CONSENT_NOTICE,
  applyFill,
  defaultTicks,
  fillReview,
  tickedCount,
} from "./chapterFill.js";

const RESULT = {
  fields: {
    objectives: { status: "found", items: ["To assess impact.", "To identify factors."], source: "rules" },
    research_questions: { status: "found", items: ["What is the impact?"], source: "ai" },
    hypotheses: { status: "not_found", items: [], reason: "not_in_document", message: "Adanse didn't find this in the section it read." },
    planned_sample_size: { status: "found", value: 200, quote: "A sample of 200 respondents was used." },
  },
};

test("found items become a review list; not-found fields keep their plain reason", () => {
  const review = fillReview(RESULT);
  assert.deepEqual(review.map((e) => [e.field, e.found, e.items.length]), [
    ["objectives", true, 2],
    ["research_questions", true, 1],
    ["hypotheses", false, 0],
    ["planned_sample_size", true, 1],
  ]);
  assert.equal(review[2].message, "Adanse didn't find this in the section it read.");
  assert.equal(review[3].value, 200);
  assert.equal(review[3].items[0].text, "A sample of 200 respondents was used.");
});

test("anything malformed is treated as not found, never shown", () => {
  const review = fillReview({
    fields: {
      objectives: { status: "found", items: "not a list" },
      research_questions: { status: "maybe", items: ["What?"] },
      hypotheses: { status: "found", items: [42, null, "  "] },
      planned_sample_size: { status: "found", value: "200", quote: "x" },
    },
  });
  for (const entry of review) {
    assert.equal(entry.found, false, entry.field);
    assert.deepEqual(entry.items, [], entry.field);
    assert.ok(entry.message, entry.field);
  }
  assert.equal(fillReview(null).every((e) => !e.found), true);
});

test("everything found starts ticked", () => {
  const review = fillReview(RESULT);
  const ticked = defaultTicks(review);
  assert.equal(tickedCount(review, ticked), 4);
});

test("adding keeps what the student already has and adds only new ticked items", () => {
  const review = fillReview(RESULT);
  const ticked = defaultTicks(review);
  const current = {
    objectives: ["To assess impact.", "Typed by the student."],
    research_questions: [],
    hypotheses: ["H1: typed."],
  };
  const { changes, added } = applyFill(current, review, ticked);
  assert.deepEqual(changes.objectives, ["To assess impact.", "Typed by the student.", "To identify factors."]);
  assert.deepEqual(changes.research_questions, ["What is the impact?"]);
  assert.equal("hypotheses" in changes, false);           // nothing found, untouched
  assert.equal(changes.plannedSample, "200");
  assert.deepEqual(added, { objectives: 1, research_questions: 1, planned_sample_size: 1 });
});

test("unticked items are not added, and typographic twins aren't duplicated", () => {
  const review = fillReview(RESULT);
  const ticked = defaultTicks(review);
  ticked.delete("objectives:1");
  ticked.delete("planned_sample_size");
  const { changes } = applyFill(
    { objectives: ["To assess  impact."], research_questions: [], hypotheses: [] },
    review,
    ticked
  );
  assert.equal("objectives" in changes, false);     // only ticked one is a twin of an existing one
  assert.equal("plannedSample" in changes, false);
});

test("the Research Context form offers it above the fields and applies only what changes", () => {
  const form = readFileSync(new URL("./components/ThesisSetup.jsx", import.meta.url), "utf8");
  assert.match(form, /<ChapterFill current=\{\{objectives,research_questions:questions,hypotheses\}\} onApply=\{applyChapterFill\}/);
  assert.match(form, /if\(c\.plannedSample!==undefined\)setPlannedSample\(c\.plannedSample\)/);
  const panel = readFileSync(new URL("./components/ChapterFill.jsx", import.meta.url), "utf8");
  assert.match(panel, /FILL_CONSENT_NOTICE/);
  assert.match(panel, /e\?\.status === 429/);
  assert.doesNotMatch(panel, /updateThesisProject|createThesisProject/);   // never saves by itself
  assert.match(FILL_CONSENT_NOTICE, /doesn't store your file/);
});
