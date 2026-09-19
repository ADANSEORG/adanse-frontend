import { test } from "node:test";
import assert from "node:assert/strict";

import {
  formatNumber,
  toFixedHalfEven,
  respondentProfileNarrative,
  describeRemainingIssues,
  getTestName,
  collectQualitativeFindings,
  columnsTaggedToObjective,
  objectivesTaggedToColumn,
  themeNamesFromColumns,
  qualitativeSynthesisClause,
  qualitativeObjectiveParagraph,
  evidenceGroundedThemeRelationships,
  guardPrevalenceLanguage,
  objectiveInterpretationSentence,
  objectiveRecapSentence,
} from "./resultsTransform.js";

/*
 * =========================================================
 * ROUND-HALF-TO-EVEN
 *
 * Every expected value below was verified against Python's
 * f"{x:.Nf}" (the format the docx is generated with), not
 * guessed -- these are the two languages' actual outputs
 * for the same double, run side by side:
 *
 *   python -c "print(f'{71.25:.1f}')"        -> 71.2
 *   node -e "console.log((71.25).toFixed(1))" -> 71.3
 * =========================================================
 */

test("toFixedHalfEven rounds an exact .5 tie to the even digit, matching Python", () => {
  // The bug this file exists to prevent: JS's native toFixed(1) on 71.25
  // gives "71.3" (rounds the tie away from zero); Python gives "71.2"
  // (rounds the tie to the nearest even digit). This is exactly the
  // Gender=71.25% case from the Profile of Respondents narrative that
  // first exposed the divergence between the docx and the preview.
  assert.equal(toFixedHalfEven(71.25, 1), "71.2");

  // Odd kept digit (7 -> 8): ties round the other direction when that's
  // the even outcome, so this is not just "always round down".
  assert.equal(toFixedHalfEven(28.75, 1), "28.8");

  // Tie at zero decimal places, both directions.
  assert.equal(toFixedHalfEven(2.5, 0), "2");
  assert.equal(toFixedHalfEven(1.5, 0), "2");
  assert.equal(toFixedHalfEven(100.5, 0), "100");

  // Tie at two decimal places.
  assert.equal(toFixedHalfEven(0.125, 2), "0.12");

  // Sign is preserved through the tie-break.
  assert.equal(toFixedHalfEven(-71.25, 1), "-71.2");
});

test("toFixedHalfEven does not misfire on values that only look like a tie in decimal", () => {
  // 0.95 is not exactly representable in binary; its nearest double is a
  // hair BELOW 0.95, so this is not actually a tie in either language --
  // both round down. A naive "round the shortest decimal string" approach
  // gets this wrong (rounds up to "1.0"); reading the true expansion via
  // toFixed(decimals + 25) gets it right.
  assert.equal(toFixedHalfEven(0.95, 1), "0.9");

  // Same phenomenon in the other direction: 0.005's nearest double is
  // fractionally ABOVE 0.005, so it is genuinely not a tie and rounds up.
  assert.equal(toFixedHalfEven(0.005, 2), "0.01");
  assert.equal(toFixedHalfEven(1.005, 2), "1.00");
});

test("toFixedHalfEven leaves ordinary (non-tie) rounding unchanged", () => {
  assert.equal(toFixedHalfEven(36.16, 2), "36.16");
  assert.equal(toFixedHalfEven(10.484, 2), "10.48");
});

test("formatNumber routes through the same half-even rounding as toFixedHalfEven", () => {
  assert.equal(formatNumber(71.25, 1), "71.2");
  assert.equal(formatNumber(null, 1), "—");
  assert.equal(formatNumber(undefined, 1), "—");
  assert.equal(formatNumber("", 1), "—");
});

/*
 * =========================================================
 * PROFILE OF RESPONDENTS NARRATIVE
 *
 * Regression test using the SAME fixture as the backend's
 * test_generate_chapter_renders_new_synthesis_sections_without_ai_calls,
 * so the frontend and the docx are checked against the same
 * numbers. Gender is 57/80 = 71.25% exactly -- a genuine tie --
 * so this is the scenario that must never silently regress.
 * =========================================================
 */

test("respondentProfileNarrative renders the Gender tie the same way the docx does (71.2%, not 71.3%)", () => {
  const categorical = [
    {
      name: "Gender",
      n: 80,
      unique_count: 2,
      frequencies: {
        Female: { count: 57, percent: 71.25 },
        Male: { count: 23, percent: 28.75 },
      },
    },
  ];

  const numeric = [
    { name: "Age", n: 80, mean: 36.16, std: 10.48, median: 35.5, min: 19, max: 55 },
  ];

  const narrative = respondentProfileNarrative(categorical, numeric, 80);

  assert.match(narrative, /average age of 36\.2 years/);
  assert.match(narrative, /Female \(71\.2%\)/);
  assert.doesNotMatch(narrative, /71\.3%/);
});

/*
 * =========================================================
 * 4.9 DATA CLEANING & LIMITATIONS
 *
 * Expected string below is the ACTUAL output of the backend's
 * _describe_remaining_issues() for this exact input, captured via:
 *   python -c "from app.services.thesis import _describe_remaining_issues; ..."
 * so this is a direct cross-language comparison, not a guess.
 * =========================================================
 */

test("describeRemainingIssues matches the backend's grouped-by-column prose exactly", () => {
  const issues = [
    { column: "Income", rule: "missing_values_require_review", detected_count: 4 },
    { column: "Income", rule: "numeric_invalid_values_coerced", detected_count: 2 },
    { column: "Notes", rule: "free_text_preserved", detected_count: 1 },
  ];

  assert.equal(
    describeRemainingIssues(issues),
    '3 data-quality issues remained unresolved after automated cleaning because ' +
      'they require researcher judgement rather than automatic correction. In ' +
      '"Income", 6 values required review: 4 values are missing and were not ' +
      'imputed; and 2 values were not valid numbers and were treated as missing. ' +
      'In "Notes", 1 value required review: free-text responses were preserved ' +
      "and not modified."
  );
});

test("describeRemainingIssues reports a clean pass when there are no issues", () => {
  assert.equal(
    describeRemainingIssues([]),
    "No unresolved data-quality issues were identified during automated cleaning."
  );
});

/*
 * =========================================================
 * getTestName
 *
 * Regression: distribution and thematic_analysis have no entry in the
 * hardcoded names map, and the backend never sets result.test_name (only
 * item.test_name, one level up) -- getTestName used to fall straight to
 * the raw "test" enum for these two types, rendering "distribution" /
 * "thematic_analysis" instead of the item's actual human-readable name.
 * =========================================================
 */

test("getTestName falls back to item.test_name for types with no hardcoded name", () => {
  assert.equal(
    getTestName({ test: "distribution" }, { test_name: "Descriptive statistics" }),
    "Descriptive statistics"
  );
  assert.equal(
    getTestName({ test: "thematic_analysis" }, { test_name: "Thematic analysis" }),
    "Thematic analysis"
  );
});

test("getTestName still prefers the hardcoded name over item.test_name when both exist", () => {
  assert.equal(
    getTestName({ test: "anova" }, { test_name: "Some other label" }),
    "One-way ANOVA"
  );
});

test("getTestName falls back to the raw test enum when neither a hardcoded name nor item.test_name exists", () => {
  assert.equal(getTestName({ test: "distribution" }), "distribution");
});

/*
 * =========================================================
 * QUALITATIVE FINDINGS <-> OBJECTIVE RELEVANCE
 *
 * JS mirror of thesis.py's word-overlap objective/theme matching. These
 * cover the preview's version of the fix for the "Objective N ...
 * identified X themes" misleading language.
 * =========================================================
 */

test("collectQualitativeFindings reads the flat qualitative_results list, not objective_results", () => {
  const analysis = {
    qualitative_results: [
      { column: "ChallengesFaced", status: "complete", result: { themes: [{ theme: "Financial Constraints" }] } },
      { column: "Recommendations", status: "needs_review", result: null },
    ],
  };
  const findings = collectQualitativeFindings(analysis);
  assert.deepEqual(Object.keys(findings), ["ChallengesFaced"]);
});

test("columnsTaggedToObjective is a plain lookup against the researcher's own tags, not a computed score", () => {
  const qualitativeFindings = {
    ChallengesFaced: { themes: [{ theme: "Financial Constraints" }] },
    CopingStrategies: { themes: [{ theme: "Borrowing From Family" }] },
  };
  const columnObjectives = { ChallengesFaced: [1], CopingStrategies: [2] };

  assert.deepEqual(columnsTaggedToObjective(columnObjectives, 1, qualitativeFindings), ["ChallengesFaced"]);
  assert.deepEqual(columnsTaggedToObjective(columnObjectives, 2, qualitativeFindings), ["CopingStrategies"]);
  // An objective's own wording is irrelevant here -- only the tag matters.
  assert.deepEqual(columnsTaggedToObjective({}, 1, qualitativeFindings), []);
});

test("objectivesTaggedToColumn is the inverse lookup, restricted to objectives that still exist", () => {
  const objectiveGroups = [
    { id: 1, objective: "Identify challenges faced by student entrepreneurs." },
    { id: 2, objective: "Explore coping strategies." },
  ];
  const columnObjectives = { ChallengesFaced: [1, 2, 99] };
  const tagged = objectivesTaggedToColumn(columnObjectives, "ChallengesFaced", objectiveGroups);
  assert.deepEqual(tagged.map((t) => t.objectiveId).sort(), [1, 2]);
});

test("themeNamesFromColumns is restricted to exactly the given columns -- no scoring", () => {
  const findings = {
    ChallengesFaced: { themes: [{ theme: "Financial Constraints" }, { theme: "Balancing Coursework and Business" }] },
    CopingStrategies: { themes: [{ theme: "Borrowing From Family" }] },
  };
  assert.deepEqual(
    themeNamesFromColumns(findings, ["ChallengesFaced"]),
    ["Financial Constraints", "Balancing Coursework and Business"]
  );
  assert.ok(!themeNamesFromColumns(findings, ["ChallengesFaced"]).includes("Borrowing From Family"));
});

test("qualitativeObjectiveParagraph draws only from tagged columns when tagged, and labels the fallback honestly when not", () => {
  const group = { id: 1, objective: "Identify challenges faced by student entrepreneurs." };
  const findings = {
    ChallengesFaced: { themes: [{ theme: "Financial Constraints" }] },
    CopingStrategies: { themes: [{ theme: "Borrowing From Family" }] },
  };

  const tagged = qualitativeObjectiveParagraph(group, findings, { ChallengesFaced: [1] });
  assert.ok(tagged.includes("designated by the researcher as informed by"));
  assert.ok(tagged.includes("Financial Constraints"));
  assert.ok(!tagged.includes("Borrowing From Family"));

  const untagged = qualitativeObjectiveParagraph(group, findings, {});
  assert.ok(untagged.includes("No specific open-ended data source was designated"));
  assert.ok(untagged.includes("Financial Constraints"));
  assert.ok(untagged.includes("Borrowing From Family"));
});

test("objectiveInterpretationSentence never claims the objective produced a theme count", () => {
  const group = { id: 1, objective: "Identify challenges faced by student entrepreneurs.", results: [] };
  const qualitativeFindings = {
    ChallengesFaced: { themes: [{ theme: "Financial Constraints", central_organizing_concept: "Challenges accessing capital." }] },
  };
  const columnObjectives = { ChallengesFaced: [1] };

  const sentence = objectiveInterpretationSentence(group, qualitativeFindings, columnObjectives);

  assert.ok(!sentence.includes("identified"));
  assert.ok(!sentence.includes("based on overlap"));
  assert.ok(sentence.includes("Financial Constraints"));
  assert.ok(sentence.includes("designated by the researcher"));
});

test("objectiveRecapSentence never names a specific theme (4.8 has no per-objective theme list)", () => {
  const group = { id: 1, objective: "Identify challenges faced by student entrepreneurs.", results: [] };
  assert.equal(
    objectiveRecapSentence(group, {}, {}),
    "Objective 1: could not be answered with the available data."
  );

  const qualitativeFindings = {
    ChallengesFaced: { themes: [{ theme: "Financial Constraints", central_organizing_concept: "Challenges accessing capital." }] },
  };
  const recap = objectiveRecapSentence(group, qualitativeFindings, { ChallengesFaced: [1] });
  assert.ok(recap.includes("addressed qualitatively"));
  assert.ok(!recap.includes("Financial Constraints"));
  assert.ok(!recap.includes("informed by"));
});

test("evidenceGroundedThemeRelationships requires a shared respondent, never just similar names", () => {
  const withSharedRespondent = {
    ChallengesFaced: { themes: [{ theme: "Financial Constraints", subthemes: [{ quotes: [{ respondent_id: "R1" }] }] }] },
    CopingStrategies: { themes: [{ theme: "Borrowing From Family", subthemes: [{ quotes: [{ respondent_id: "R1" }] }] }] },
  };
  const relationships = evidenceGroundedThemeRelationships(withSharedRespondent);
  assert.equal(relationships.length, 1);
  assert.deepEqual(relationships[0].sharedRespondents, ["R1"]);

  const withoutSharedRespondent = {
    ChallengesFaced: { themes: [{ theme: "Financial Constraints", subthemes: [{ quotes: [{ respondent_id: "R1" }] }] }] },
    CopingStrategies: { themes: [{ theme: "Financial Coping", subthemes: [{ quotes: [{ respondent_id: "R2" }] }] }] },
  };
  assert.deepEqual(evidenceGroundedThemeRelationships(withoutSharedRespondent), []);
});

test("guardPrevalenceLanguage strips claims a low response count doesn't support", () => {
  const narrative = "The majority of respondents repeatedly described this theme.";
  const guarded = guardPrevalenceLanguage(narrative, 1, 5.0);
  assert.ok(!guarded.toLowerCase().includes("majority"));
  assert.ok(!guarded.toLowerCase().includes("repeatedly"));
  assert.ok(guarded.includes("1 respondent"));
});

test("guardPrevalenceLanguage leaves genuinely supported claims untouched", () => {
  const narrative = "The majority of respondents repeatedly described this theme.";
  assert.equal(guardPrevalenceLanguage(narrative, 6, 75.0), narrative);
});

test("qualitativeSynthesisClause reflects the real theme set, not a fixed template", () => {
  const clauseA = qualitativeSynthesisClause(["Financial Constraints", "Balancing Coursework and Business"]);
  const clauseB = qualitativeSynthesisClause(["Transportation Access", "Appointment Wait Times"]);
  assert.notEqual(clauseA, clauseB);
  assert.ok(clauseA.includes("Financial Constraints"));
  assert.ok(clauseB.includes("Transportation Access"));
});
