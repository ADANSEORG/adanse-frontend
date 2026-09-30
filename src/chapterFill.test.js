import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FILL_CONSENT_NOTICE,
  applyFill,
  defaultTicks,
  fillReview,
  tickedCount,
  titleWouldReplace,
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
    ["title", false, 0],
    ["objectives", true, 2],
    ["research_questions", true, 1],
    ["hypotheses", false, 0],
    ["planned_sample_size", true, 1],
  ]);
  assert.equal(review[3].message, "Adanse didn't find this in the section it read.");
  assert.equal(review[4].value, 200);
  assert.equal(review[4].items[0].text, "A sample of 200 respondents was used.");
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
  assert.match(form, /<ChapterFill current=\{\{title,objectives,research_questions:questions,hypotheses\}\} onApply=\{applyChapterFill\}/);
  assert.match(form, /if\(c\.plannedSample!==undefined\)setPlannedSample\(c\.plannedSample\)/);
  const panel = readFileSync(new URL("./components/ChapterFill.jsx", import.meta.url), "utf8");
  assert.match(panel, /FILL_CONSENT_NOTICE/);
  assert.match(panel, /e\?\.status === 429/);
  assert.doesNotMatch(panel, /updateThesisProject|createThesisProject/);   // never saves by itself
  assert.match(FILL_CONSENT_NOTICE, /doesn't store your file/);
});

// ---------------------------------------------------------------------------
// The thesis title (from the title page)
// ---------------------------------------------------------------------------
const WITH_TITLE = {
  fields: {
    ...RESULT.fields,
    title: { status: "found", items: ["The Effect of Safety Climate on Safety Behaviour"], source: "title_page" },
  },
};

test("a found title comes first, as one tickable item", () => {
  const review = fillReview(WITH_TITLE);
  assert.equal(review[0].field, "title");
  assert.deepEqual(review[0].items, [{ key: "title", text: "The Effect of Safety Climate on Safety Behaviour" }]);
  assert.equal(defaultTicks(review).has("title"), true);
});

test("a ticked title replaces the title field; the same title changes nothing", () => {
  const review = fillReview(WITH_TITLE);
  const ticked = defaultTicks(review);
  const typed = { title: "My working title", objectives: [], research_questions: [], hypotheses: [] };
  assert.equal(applyFill(typed, review, ticked).changes.title, "The Effect of Safety Climate on Safety Behaviour");

  const same = { ...typed, title: "The  Effect of Safety Climate on Safety Behaviour " };
  assert.equal("title" in applyFill(same, review, ticked).changes, false);

  ticked.delete("title");
  assert.equal("title" in applyFill(typed, review, ticked).changes, false);
});

test("the student is warned before a typed title would be replaced", () => {
  const review = fillReview(WITH_TITLE);
  assert.equal(titleWouldReplace({ title: "My working title" }, review), true);
  assert.equal(titleWouldReplace({ title: "" }, review), false);
  assert.equal(titleWouldReplace({ title: "The Effect of Safety Climate on Safety Behaviour" }, review), false);
  assert.equal(titleWouldReplace({ title: "Anything" }, fillReview(RESULT)), false);  // no title found
});

test("a malformed title is treated as not found", () => {
  for (const title of [{ status: "found", items: [] }, { status: "found", items: [7] }, { status: "found" }, "x"]) {
    const review = fillReview({ fields: { ...RESULT.fields, title } });
    assert.equal(review[0].found, false);
    assert.deepEqual(review[0].items, []);
  }
});

test("the form puts a ticked title into the title field", () => {
  const form = readFileSync(new URL("./components/ThesisSetup.jsx", import.meta.url), "utf8");
  assert.match(form, /if\(c\.title\)setTitle\(c\.title\)/);
});

// ---------------------------------------------------------------------------
// Reuse on the Dataset step: the file isn't asked for twice
// ---------------------------------------------------------------------------
const workflowSource = () => readFileSync(new URL("./hooks/useThesisWorkflow.js", import.meta.url), "utf8");
const bodyOf = (source, name) => {
  const start = source.indexOf(`const ${name} = async`);
  const end = source.slice(start).search(/\r?\n  };\r?\n/);
  assert.ok(start > 0 && end > 0, name);
  return source.slice(start, start + end);
};

test("the panel reports the file only after a successful reading", () => {
  const panel = readFileSync(new URL("./components/ChapterFill.jsx", import.meta.url), "utf8");
  const success = panel.indexOf("setTicked(defaultTicks(next));");
  const report = panel.indexOf("onFileRead?.(file);");
  const failure = panel.indexOf("} catch (e) {");
  assert.ok(success > 0 && report > success && report < failure);
});

test("saving Research Context attaches the file only for the project it was read for", () => {
  const save = bodyOf(workflowSource(), "saveSetup");
  assert.match(save, /pending\.conversationId === \(active\?\.id \?\? null\)/);
  assert.match(save, /await uploadChapter1Document\(c\.id, chapterFile\)/);
  assert.match(save, /chapter1_objectives: attached\.chapter1_objectives/);
  // Best effort: a failure leaves the comparison as it was and never blocks the save.
  assert.match(save, /try \{[\s\S]*uploadChapter1Document[\s\S]*\} catch \{/);
  assert.match(save, /pendingChapterFileRef\.current = null;/);
});

test("opening another project or starting a new one forgets the file", () => {
  const source = workflowSource();
  assert.match(bodyOf(source, "newChat"), /pendingChapterFileRef\.current = null;/);
  assert.match(
    bodyOf(source, "select"),
    /if \(c\?\.id !== pendingChapterFileRef\.current\?\.conversationId\) \{\s*pendingChapterFileRef\.current = null;/
  );
});

test("the file is handed from the form to the workflow", () => {
  const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  assert.equal((app.match(/onChapterFile=\{\s*rememberChapterFile\s*\}/g) || []).length, 2);
  const form = readFileSync(new URL("./components/ThesisSetup.jsx", import.meta.url), "utf8");
  assert.match(form, /onFileRead=\{onChapterFile\}/);
});
