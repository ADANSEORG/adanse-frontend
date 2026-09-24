import { test } from "node:test";
import assert from "node:assert/strict";

import {
  countAcceptedCodes,
  countRepresentedResponses,
  codeCoverageSummary,
} from "./qualitativeCoverage.js";

const codes = [
  { id: "c1", extracts: [{ respondent_id: "R1" }] },
  { id: "c2", extracts: [{ respondent_id: "R2" }, { respondent_id: "R3" }] },
  { id: "c3", extracts: [{ respondent_id: "R4" }] },
];

test("countAcceptedCodes counts only codes marked accepted", () => {
  const selections = {
    c1: { status: "accepted" },
    c2: { status: "declined" },
    c3: { status: "accepted" },
  };
  assert.equal(countAcceptedCodes(codes, selections), 2);
});

test("countAcceptedCodes handles missing/empty input without throwing", () => {
  assert.equal(countAcceptedCodes(undefined, {}), 0);
  assert.equal(countAcceptedCodes([], {}), 0);
  assert.equal(countAcceptedCodes(codes, {}), 0);
});

test("countRepresentedResponses counts distinct respondents from accepted codes only", () => {
  const selections = {
    c1: { status: "accepted" },
    c2: { status: "accepted" },
    c3: { status: "declined" },
  };
  assert.equal(countRepresentedResponses(codes, selections), 3); // R1, R2, R3
});

test("countRepresentedResponses de-duplicates a respondent cited by more than one accepted code", () => {
  const overlapping = [
    { id: "c1", extracts: [{ respondent_id: "R1" }] },
    { id: "c2", extracts: [{ respondent_id: "R1" }, { respondent_id: "R2" }] },
  ];
  const selections = { c1: { status: "accepted" }, c2: { status: "accepted" } };
  assert.equal(countRepresentedResponses(overlapping, selections), 2); // R1, R2
});

test("countRepresentedResponses ignores declined codes even if extracts overlap", () => {
  const selections = { c1: { status: "declined" }, c2: { status: "declined" }, c3: { status: "declined" } };
  assert.equal(countRepresentedResponses(codes, selections), 0);
});

test("codeCoverageSummary reports the full shape", () => {
  const selections = { c1: { status: "accepted" }, c2: { status: "accepted" }, c3: { status: "declined" } };
  assert.deepEqual(codeCoverageSummary(codes, selections, 60), {
    codesKept: 2,
    codesProposed: 3,
    responsesRepresented: 3,
    totalResponses: 60,
  });
});

test("codeCoverageSummary reports null totalResponses when not supplied", () => {
  assert.equal(codeCoverageSummary([], {}, undefined).totalResponses, null);
});
