import { test } from "node:test";
import assert from "node:assert/strict";

import {
  actionAvailable,
  actionConfirmation,
  actionRequest,
  canLeaveOut,
  flagAction,
  leaveOutConfirmation,
  leaveOutRequest,
  canInclude,
  declaredTypeForInclude,
  excludedFlags,
  includeConfirmation,
  includeRequest,
  personalDataFlags,
  personalDataHeadline,
  resetSentence,
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

// ---------------------------------------------------------------------------
// The reset sentence (active version only)
// ---------------------------------------------------------------------------

test("the reset sentence says the plan and results are reset and what re-running costs", () => {
  assert.equal(
    resetSentence(25),
    "Your current analysis plan and results will be reset, and running the analysis again costs 25 credits."
  );
  assert.match(resetSentence(1), /costs 1 credit\./);
  assert.match(resetSentence(0), /again is free\./);
});

test("the cost comes from the value passed in, never a fixed number", () => {
  assert.match(resetSentence(40), /costs 40 credits/);
  assert.doesNotMatch(resetSentence(40), /25/);
});

test("without a loaded cost the sentence still says what is reset, and names no number", () => {
  for (const missing of [null, undefined, NaN, -1, "25"]) {
    assert.equal(resetSentence(missing), "Your current analysis plan and results will be reset.");
  }
});

test("both confirmations carry the cost on an active version and mention neither when inactive", () => {
  const [email, , included] = personalDataFlags(PROFILE);
  for (const [flag, confirm] of [
    [email, includeConfirmation],
    [included, leaveOutConfirmation],
  ]) {
    assert.match(confirm(flag, true, 25), /plan and results will be reset, and running the analysis again costs 25 credits\.$/);
    assert.doesNotMatch(confirm(flag, false, 25), /reset|credit/);
    assert.match(confirm(flag, true), /plan and results will be reset\.$/); // cost not loaded
  }
  // actionConfirmation passes the cost through to whichever one applies.
  assert.match(actionConfirmation(email, true, 25), /costs 25 credits/);
  assert.match(actionConfirmation(included, true, 25), /costs 25 credits/);
});

// ---------------------------------------------------------------------------
// Leave out again
// ---------------------------------------------------------------------------

test("leaving out declares the column an identifier", () => {
  const [, , included] = personalDataFlags(PROFILE);
  assert.deepEqual(leaveOutRequest(included), { Age: "identifier" });
});

test("only an included column of a changeable version can be left out again", () => {
  const [email, , included] = personalDataFlags(PROFILE);
  assert.equal(canLeaveOut(included, { status: "cleaned" }), true);
  assert.equal(canLeaveOut(included, { status: "validated" }), true);
  assert.equal(canLeaveOut(included, { status: "failed" }), false);
  assert.equal(canLeaveOut(included, { status: "superseded" }), false);
  assert.equal(canLeaveOut(included, { kind: "original", status: "profiled" }), false);
  assert.equal(canLeaveOut(included, { status: "cleaned" }, true), false); // busy
  assert.equal(canLeaveOut(included, null), false);
  assert.equal(canLeaveOut(email, { status: "cleaned" }), false); // already left out
});

test("the leave-out confirmation names the column, the new version, and the reset on an active version", () => {
  const [, , included] = personalDataFlags(PROFILE);
  const text = leaveOutConfirmation(included, false);
  assert.match(text, /“Age”/);
  assert.match(text, /out of your analysis and reports again/);
  assert.match(text, /validate and activate/);
  assert.doesNotMatch(text, /reset/);
  assert.match(leaveOutConfirmation(included, true), /plan and results will be reset/);
});

test("each row offers exactly one action, and its request and wording follow from it", () => {
  const [email, , included] = personalDataFlags(PROFILE);
  assert.equal(flagAction(email), "include");
  assert.equal(flagAction(included), "leave");

  assert.deepEqual(actionRequest(email), { "Email address": "categorical" });
  assert.deepEqual(actionRequest(included), { Age: "identifier" });

  assert.match(actionConfirmation(email), /^Include /);
  assert.match(actionConfirmation(included), /^Leave /);

  const cleaned = { status: "cleaned" };
  assert.equal(actionAvailable(email, cleaned), true);
  assert.equal(actionAvailable(included, cleaned), true);
  assert.equal(actionAvailable(email, { status: "failed" }), false);
  assert.equal(actionAvailable(included, { status: "failed" }), false);
});

test("a column the researcher left out again is listed as left out, and can be included again", () => {
  const profile = [
    {
      name: "Full name",
      semantic_type: "categorical",
      is_identifier: true,
      personal_data: {
        kind: "person_name",
        label: "people's names",
        by_researcher: true,
        reason: "You chose to leave this column out. The column heading suggests people's names.",
      },
    },
  ];
  const [flag] = personalDataFlags(profile);
  assert.equal(flag.excluded, true);
  assert.equal(flag.byResearcher, true);
  assert.match(flag.reason, /^You chose to leave this column out\./);
  assert.equal(flagAction(flag), "include");
  assert.deepEqual(actionRequest(flag), { "Full name": "categorical" });
});

test("an automatically excluded column is not marked as the researcher's choice", () => {
  const [email] = personalDataFlags(PROFILE);
  assert.equal(email.byResearcher, false);
});
