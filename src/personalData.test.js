import { test } from "node:test";
import assert from "node:assert/strict";

import {
  canInclude,
  declaredTypeForInclude,
  excludedFlags,
  includeConfirmation,
  includeRequest,
  personalDataFlags,
  personalDataHeadline,
} from "./personalData.js";

const PROFILE = [
  { name: "Timestamp", semantic_type: "datetime" },
  {
    name: "Email address",
    semantic_type: "categorical",
    is_identifier: true,
    personal_data: { kind: "email", label: "email addresses", basis: "values", reason: "Most values look like email addresses." },
  },
  { name: "What is your gender?", semantic_type: "categorical" },
  {
    name: "Full name",
    semantic_type: "categorical",
    is_identifier: true,
    personal_data: { kind: "person_name", label: "people's names", basis: "header", reason: "The column heading suggests people's names." },
  },
  { name: "Age", semantic_type: "numeric", personal_data_overridden: "date_of_birth" },
];

test("personalDataFlags lists excluded and included-by-you columns in profile order", () => {
  const flags = personalDataFlags(PROFILE);
  assert.deepEqual(flags.map((f) => [f.column, f.excluded]), [
    ["Email address", true],
    ["Full name", true],
    ["Age", false],
  ]);
  assert.equal(flags[0].label, "email addresses");
  assert.equal(flags[0].reason, "Most values look like email addresses.");
  assert.match(flags[2].reason, /you chose to include it/);
});

test("columns that were never flagged are not listed", () => {
  assert.deepEqual(personalDataFlags([{ name: "Age", semantic_type: "numeric" }]), []);
});

test("a missing or malformed profile gives no flags rather than an error", () => {
  assert.deepEqual(personalDataFlags(undefined), []);
  assert.deepEqual(personalDataFlags(null), []);
  assert.deepEqual(personalDataFlags("nope"), []);
  assert.deepEqual(personalDataFlags([null, undefined, {}]), []);
});

test("column names are kept verbatim, not title-cased", () => {
  const [flag] = personalDataFlags([
    { name: "Student index number", personal_data: { kind: "person_id", label: "personal ID numbers", reason: "x" } },
  ]);
  assert.equal(flag.column, "Student index number");
});

test("excludedFlags keeps only the columns still left out", () => {
  assert.deepEqual(excludedFlags(personalDataFlags(PROFILE)).map((f) => f.column), ["Email address", "Full name"]);
  assert.deepEqual(excludedFlags(undefined), []);
});

test("the headline counts excluded and included columns with correct grammar", () => {
  const flags = personalDataFlags(PROFILE);
  assert.equal(personalDataHeadline(flags), "2 columns were left out as personal data · 1 included by you");
  assert.equal(personalDataHeadline(flags.slice(0, 1)), "1 column was left out as personal data");
  assert.equal(personalDataHeadline(flags.slice(2)), "1 included by you");
  assert.equal(personalDataHeadline([]), "");
});

test("including declares the type the values looked like, else categorical", () => {
  assert.equal(declaredTypeForInclude({ semanticType: "numeric" }), "numeric");
  assert.equal(declaredTypeForInclude({ semanticType: "open_text" }), "open_text");
  assert.equal(declaredTypeForInclude({ semanticType: "datetime" }), "datetime");
  assert.equal(declaredTypeForInclude({ semanticType: "categorical" }), "categorical");
  assert.equal(declaredTypeForInclude({ semanticType: "empty" }), "categorical");
  assert.equal(declaredTypeForInclude({}), "categorical");
  assert.equal(declaredTypeForInclude(undefined), "categorical");
});

test("includeRequest is the column-types body for exactly that one column", () => {
  const flag = personalDataFlags(PROFILE)[1];
  assert.deepEqual(includeRequest(flag), { "Full name": "categorical" });
});

test("only a still-excluded column of a changeable version can be included", () => {
  const [email, , included] = personalDataFlags(PROFILE);
  assert.equal(canInclude(email, { status: "cleaned" }), true);
  assert.equal(canInclude(email, { status: "validated" }), true);
  assert.equal(canInclude(email, { status: "failed" }), false);
  assert.equal(canInclude(email, { status: "superseded" }), false);
  assert.equal(canInclude(email, { kind: "original", status: "profiled" }), false);
  assert.equal(canInclude(email, { status: "cleaned" }, true), false); // busy
  assert.equal(canInclude(email, null), false);
  assert.equal(canInclude(included, { status: "cleaned" }), false); // already included
});

test("the confirmation names the column and says what will happen", () => {
  const flag = personalDataFlags(PROFILE)[0];
  const text = includeConfirmation(flag, false);
  assert.match(text, /“Email address”/);
  assert.match(text, /email addresses/);
  assert.match(text, /Chapter 4 tables/);
  assert.match(text, /validate and activate/);
  assert.doesNotMatch(text, /reset/);
  assert.match(includeConfirmation(flag, true), /plan and results will be reset/);
});
