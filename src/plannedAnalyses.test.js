import test from "node:test";
import assert from "node:assert/strict";

import {
  plannedAnalysesDetail,
  plannedAnalysesLabel,
} from "./planPresentation.js";

const objectives = [
  { analyses: [{ id: "1-a" }, { id: "1-b" }] },
  { analyses: [] },
  { analyses: [{ id: "3-a" }] },
];

test("statistical analyses alone are counted as before", () => {
  assert.equal(plannedAnalysesLabel(objectives, null), "3 data-supported analyses planned");
  assert.equal(plannedAnalysesDetail(objectives, null), "3 statistical.");
});

test("a qualitative-only plan counts its confirmed open-ended columns", () => {
  const qualOnly = [{ analyses: [] }, { analyses: [] }];
  assert.equal(plannedAnalysesLabel(qualOnly, ["Challenges"]), "1 data-supported analysis planned");
  assert.equal(plannedAnalysesDetail(qualOnly, ["Challenges"]), "1 thematic (one open-ended column).");
});

test("mixed plans name both kinds", () => {
  assert.equal(plannedAnalysesLabel(objectives, ["A", "B"]), "5 data-supported analyses planned");
  assert.equal(
    plannedAnalysesDetail(objectives, ["A", "B"]),
    "3 statistical and 2 thematic (2 open-ended columns)."
  );
});

test("unconfirmed qualitative selection (null) adds nothing; nothing at all says so", () => {
  assert.equal(plannedAnalysesLabel([], null), "0 data-supported analyses planned");
  assert.match(plannedAnalysesDetail([], null), /No analysis is supported/);
  assert.match(plannedAnalysesDetail(undefined, undefined), /No analysis is supported/);
});
