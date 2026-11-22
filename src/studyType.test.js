import test from "node:test";
import assert from "node:assert/strict";

import {
  filledSections,
  normalizeStudyType,
  reviewForStudyType,
  setupFieldsFor,
} from "./studyType.js";

test("only the three known study types are accepted", () => {
  for (const value of ["quantitative", "qualitative", "mixed"]) {
    assert.equal(normalizeStudyType(value), value);
  }
  for (const value of [null, undefined, "", "Qualitative", "both"]) {
    assert.equal(normalizeStudyType(value), null);
  }
});

test("not choosing a type keeps today's form, hypotheses and sample size included", () => {
  const fields = setupFieldsFor(null);
  assert.equal(fields.showHypotheses, true);
  assert.equal(fields.sampleLabel, "Planned sample size");
  assert.deepEqual(fields, setupFieldsFor("quantitative"));
});

test("a qualitative study hides hypotheses and asks for participants", () => {
  const fields = setupFieldsFor("qualitative");
  assert.equal(fields.showHypotheses, false);
  assert.equal(fields.sampleLabel, "Number of participants");
  assert.doesNotMatch(fields.sampleHelp, /response rate in Chapter 4\./);
});

test("mixed methods keeps hypotheses, labelled for the quantitative strand", () => {
  const fields = setupFieldsFor("mixed");
  assert.equal(fields.showHypotheses, true);
  assert.match(fields.hypothesesLabel, /quantitative strand/);
});

test("sections filled: qualitative can reach N of N without hypotheses", () => {
  const base = {
    title: "Study",
    objectives: ["o"],
    questions: ["q"],
    hypotheses: [],
    plannedSample: "12",
  };
  assert.deepEqual(filledSections({ ...base, studyType: "qualitative" }), { filled: 5, total: 5 });
  assert.deepEqual(filledSections({ ...base, studyType: "quantitative" }), { filled: 5, total: 6 });
  assert.deepEqual(filledSections({ ...base, studyType: null }), { filled: 4, total: 6 });
});

test("hidden hypotheses saved on a qualitative project don't count, but aren't lost", () => {
  const counts = filledSections({
    studyType: "qualitative",
    title: "",
    objectives: [],
    questions: [],
    hypotheses: ["H1: saved earlier"],
    plannedSample: "",
  });
  assert.deepEqual(counts, { filled: 1, total: 5 });
});

test("Chapters 1-3 import drops hypotheses and relabels sample size for qualitative only", () => {
  const review = [
    { field: "title", label: "Thesis title", items: [] },
    { field: "hypotheses", label: "Hypotheses", items: [{ key: "h:0", text: "x" }] },
    { field: "planned_sample_size", label: "Planned sample size", items: [] },
  ];
  const qual = reviewForStudyType(review, "qualitative");
  assert.deepEqual(qual.map((e) => e.field), ["title", "planned_sample_size"]);
  assert.equal(qual[1].label, "Number of participants");
  assert.equal(qual[1].found, false);

  assert.equal(reviewForStudyType(review, "mixed"), review);
  assert.equal(reviewForStudyType(review, null), review);
  assert.equal(reviewForStudyType(null, "qualitative"), null);
});

test("a sample size read before switching to qualitative is not offered as participants", () => {
  const review = [
    {
      field: "planned_sample_size",
      label: "Planned sample size",
      found: true,
      value: 12,
      items: [{ key: "planned_sample_size", text: "12 participants were purposively selected." }],
      message: "",
    },
  ];
  const [entry] = reviewForStudyType(review, "qualitative");
  assert.equal(entry.found, false);
  assert.deepEqual(entry.items, []);
  assert.equal(entry.value, null);
  assert.match(entry.message, /number of participants yourself/);
  // A ticked key left over from the earlier read can't be applied.
  assert.equal(reviewForStudyType(review, "mixed")[0].found, true);
});
