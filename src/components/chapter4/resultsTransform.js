/*
 * =========================================================
 * CHAPTER 4 — RESULT FORMATTING & NORMALISATION
 * =========================================================
 *
 * Pure data-shaping functions used by Chapter4.jsx. Nothing
 * here touches React, component state, or the DOM, so it's
 * kept separate from the rendering code that consumes it.
 */

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

export function formatVariableName(name) {
  if (!name) return "";

  return String(name)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bCgpa\b/g, "CGPA")
    .replace(/\bGpa\b/g, "GPA");
}

/*
 * Formats a number to `decimals` places using round-half-to-even (banker's
 * rounding), matching Python's f"{x:.Nf}" -- which is how every number in
 * the downloaded docx is formatted. This function is the frontend's only
 * numeric-string formatter for a reason: JS's native Number.toFixed() rounds
 * an exact .5 tie away from zero, e.g. (71.25).toFixed(1) -> "71.3", where
 * Python gives "71.2". That divergence is real and reproducible for any
 * percentage computed as count/total*100 that lands on an exact tie (a
 * common case, not a rare edge case) -- so every call site that renders a
 * percentage or a computed statistic in Chapter4.jsx must go through this,
 * not call .toFixed() directly.
 *
 * We can't just multiply by 10**decimals and round, because that
 * reintroduces the same binary floating-point error we're trying to avoid.
 * Instead we read the TRUE decimal expansion of the double via
 * `toFixed(decimals + 25)` -- correctly rounded per the ECMA-262 spec, deep
 * enough to distinguish a genuine exact tie (71.25) from a value that only
 * looks like one as a decimal literal but isn't exactly representable in
 * binary (0.95's nearest double is a hair below the halfway point, so both
 * Python and this function round it down to "0.9", not up to "1.0") -- then
 * round that string ourselves with an explicit half-to-even tie-break.
 */
export function toFixedHalfEven(value, decimals) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value);
  }

  const negative = number < 0;
  const absValue = Math.abs(number);

  const precise = absValue.toFixed(
    Math.min(decimals + 25, 100)
  );

  const [intPart, fracPartRaw] = precise.split(".");
  const fracPart = fracPartRaw || "";

  const keptDigits = (
    intPart + fracPart.slice(0, decimals)
  )
    .split("")
    .map(Number);

  const firstDropped = Number(fracPart[decimals] || "0");
  const restDropped = fracPart.slice(decimals + 1);
  const isExactHalf =
    firstDropped === 5 && /^0*$/.test(restDropped);

  let roundUp;

  if (firstDropped > 5 || (firstDropped === 5 && !isExactHalf)) {
    roundUp = true;
  } else if (firstDropped < 5) {
    roundUp = false;
  } else {
    // Exact tie: round to the nearest even kept digit.
    roundUp = keptDigits[keptDigits.length - 1] % 2 !== 0;
  }

  if (roundUp) {
    let i = keptDigits.length - 1;

    while (i >= 0) {
      keptDigits[i] += 1;

      if (keptDigits[i] === 10) {
        keptDigits[i] = 0;
        i -= 1;
      } else {
        break;
      }
    }

    if (i < 0) {
      keptDigits.unshift(1);
    }
  }

  const digitsStr = keptDigits.join("");
  const intLen = digitsStr.length - decimals;
  const newIntPart = digitsStr.slice(0, intLen) || "0";
  const newFracPart = digitsStr.slice(intLen);

  const result =
    decimals > 0
      ? `${newIntPart}.${newFracPart}`
      : newIntPart;

  const isZero = Number(result) === 0;

  return negative && !isZero ? `-${result}` : result;
}

export function formatNumber(value, decimals = 3) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value);
  }

  return toFixedHalfEven(number, decimals);
}

export function getTestName(result, item) {
  const names = {
    correlation: "Pearson correlation",
    cross_tab: "Chi-square test of association",
    t_test: "Welch independent-samples t-test",
    anova: "One-way ANOVA",
  };

  // Test types with no entry above (distribution, thematic_analysis) have
  // no result.test_name either -- the backend only ever sets test_name on
  // the outer analysis item (see thesis.py's item.get("test_name")), so
  // that must be checked before falling back to the raw "test" enum value.
  return (
    names[result?.test] ||
    item?.test_name ||
    result?.test_name ||
    result?.test ||
    "Statistical test"
  );
}

export function getStatistic(result) {
  if (!result) return "—";

  if (result.test === "correlation") {
    return `r = ${formatNumber(result.r, 3)}`;
  }

  if (result.test === "cross_tab") {
    return `χ² = ${formatNumber(result.chi2, 3)}`;
  }

  if (result.test === "t_test") {
    return `t(${formatNumber(result.df, 1)}) = ${formatNumber(
      result.t_statistic,
      3
    )}`;
  }

  if (result.test === "anova") {
    return `F = ${formatNumber(
      result.f_statistic,
      3
    )}`;
  }

  if (result.test === "regression") {
    return `F(${result.df_model}, ${result.df_resid}) = ${formatNumber(
      result.f_statistic,
      3
    )}`;
  }

  return "—";
}

export function getPValue(result) {
  if (!result) return "—";

  if (result.p_value_formatted) {
    return `p ${result.p_value_formatted}`;
  }

  if (
    result.p_value !== null &&
    result.p_value !== undefined
  ) {
    const p = Number(result.p_value);

    if (Number.isFinite(p)) {
      if (p < 0.001) {
        return "p < .001";
      }

      return `p = ${toFixedHalfEven(p, 4)}`;
    }
  }

  return "—";
}

export function getDecision(result) {
  if (!result) return "—";

  if (
    result.significant === true ||
    (
      result.p_value !== null &&
      result.p_value !== undefined &&
      Number(result.p_value) < 0.05
    )
  ) {
    return "Significant";
  }

  if (
    result.significant === false ||
    (
      result.p_value !== null &&
      result.p_value !== undefined &&
      Number(result.p_value) >= 0.05
    )
  ) {
    return "Not significant";
  }

  return "—";
}

export function getResultSummary(result) {
  if (!result) return "";

  if (result.interpretation) {
    return result.interpretation;
  }

  if (result.test === "correlation") {
    return (
      `The Pearson correlation between ` +
      `${formatVariableName(result.columns?.[0])} ` +
      `and ${formatVariableName(result.columns?.[1])} ` +
      `was ${formatNumber(result.r, 3)}, ` +
      `with ${getPValue(result)}.`
    );
  }

  if (result.test === "cross_tab") {
    return (
      `The chi-square test examined the association between ` +
      `${formatVariableName(result.columns?.[0])} ` +
      `and ${formatVariableName(result.columns?.[1])}. ` +
      `The test produced χ² = ${formatNumber(
        result.chi2,
        3
      )}, with ${getPValue(result)}.`
    );
  }

  if (result.test === "t_test") {
    return (
      `The independent-samples t-test compared ` +
      `${formatVariableName(
        result.numeric_column ||
          result.columns?.[0]
      )} across the relevant groups, producing ` +
      `t = ${formatNumber(
        result.t_statistic,
        3
      )}, with ${getPValue(result)}.`
    );
  }

  if (result.test === "anova") {
    return (
      `The one-way ANOVA examined differences in ` +
      `${formatVariableName(
        result.numeric_column ||
          result.columns?.[0]
      )} across ` +
      `${formatVariableName(
        result.group_column ||
          result.columns?.[1]
      )}. The test produced ` +
      `F = ${formatNumber(
        result.f_statistic,
        3
      )}, with ${getPValue(result)}.`
    );
  }

  return "";
}

export function getNumericColumn(result, item) {
  return (
    result?.numeric_column ||
    item?.numeric_column ||
    (
      result?.test === "t_test" ||
      result?.test === "anova"
        ? result?.columns?.find(
            (column) =>
              column !==
              (
                result?.group_column ||
                item?.group_column
              )
          )
        : null
    ) ||
    item?.column_a
  );
}

export function getGroupColumn(result, item) {
  return (
    result?.group_column ||
    item?.group_column ||
    (
      result?.test === "t_test" ||
      result?.test === "anova"
        ? result?.columns?.find(
            (column) =>
              column !==
              (
                result?.numeric_column ||
                item?.numeric_column
              )
          )
        : null
    ) ||
    item?.column_b
  );
}

/*
 * =========================================================
 * GROUP SUMMARY
 * =========================================================
 */

export function getGroups(result) {
  if (!result) return {};

  if (
    result.groups &&
    typeof result.groups === "object" &&
    !Array.isArray(result.groups)
  ) {
    return result.groups;
  }

  if (
    result.group_summary &&
    typeof result.group_summary === "object" &&
    !Array.isArray(result.group_summary)
  ) {
    return result.group_summary;
  }

  return {};
}

/*
 * =========================================================
 * NORMALISE RESULT OBJECTS
 *
 * This is the important part.
 *
 * The application has had more than one result shape:
 *
 * 1. Flat:
 *    results = [
 *      {
 *        id: "1.1",
 *        objective_id: 1,
 *        objective: "...",
 *        result: {...}
 *      }
 *    ]
 *
 * 2. Older:
 *    results = [
 *      {
 *        id: 1,
 *        objective: "...",
 *        result: {...}
 *      }
 *    ]
 *
 * 3. Nested:
 *    objective_results = [
 *      {
 *        objective_id: 1,
 *        objective: "...",
 *        analyses: [...]
 *      }
 *    ]
 *
 * We convert all of them into ONE shape.
 * =========================================================
 */

export function normaliseResults(analysis, plan, project) {
  const output = [];

  const rawResults = Array.isArray(
    analysis?.results
  )
    ? analysis.results
    : [];

  /*
   * -------------------------------------------------------
   * FLAT RESULTS
   * -------------------------------------------------------
   */

  rawResults.forEach((item, index) => {
    const result =
      item?.result ||
      item?.analysis_result ||
      item?.analysis ||
      null;

    if (!result) {
      return;
    }

    /*
     * Determine objective ID.
     *
     * Priority:
     * 1. explicit objective_id
     * 2. parent_objective_id
     * 3. analysis id such as "2.3"
     * 4. numeric id if it represents an objective
     * 5. matching objective text
     * 6. plan position
     */

    let objectiveId =
      item?.objective_id ??
      item?.parent_objective_id ??
      result?.objective_id ??
      result?.parent_objective_id ??
      null;

    const rawId =
      item?.analysis_id ??
      item?.id ??
      result?.analysis_id ??
      result?.id ??
      null;

    /*
     * IDs like:
     *
     * 1.1
     * 1.2
     * 2.1
     * 3.4
     *
     * mean objective 1, objective 2, etc.
     */

    if (
      objectiveId === null &&
      typeof rawId === "string"
    ) {
      const match =
        rawId.match(/^(\d+)\.(\d+)$/);

      if (match) {
        objectiveId = Number(match[1]);
      }
    }

    /*
     * Sometimes the backend uses an analysis
     * identifier like:
     *
     * "objective-2-analysis-3"
     */

    if (
      objectiveId === null &&
      typeof rawId === "string"
    ) {
      const match =
        rawId.match(
          /objective[-_ ]?(\d+)/i
        );

      if (match) {
        objectiveId = Number(match[1]);
      }
    }

    /*
     * Match exact objective text.
     */

    const itemObjective =
      item?.objective ||
      result?.objective ||
      "";

    if (objectiveId === null && itemObjective) {
      const projectObjectives =
        Array.isArray(project?.objectives)
          ? project.objectives
          : [];

      const matchIndex =
        projectObjectives.findIndex(
          (objective) =>
            String(objective).trim() ===
            String(itemObjective).trim()
        );

      if (matchIndex >= 0) {
        objectiveId = matchIndex + 1;
      }
    }

    /*
     * Match against plan.
     */

    if (objectiveId === null) {
      const planItems =
        Array.isArray(plan?.items)
          ? plan.items
          : [];

      const matchingPlanIndex =
        planItems.findIndex((planItem) => {
          if (
            item?.objective &&
            planItem?.objective
          ) {
            return (
              String(item.objective).trim() ===
              String(planItem.objective).trim()
            );
          }

          return false;
        });

      if (matchingPlanIndex >= 0) {
        objectiveId =
          planItems[matchingPlanIndex].id ??
          matchingPlanIndex + 1;
      }
    }

    /*
     * Last resort:
     *
     * If this is an ID-less flat result array,
     * DO NOT pretend every result is an objective.
     *
     * We instead use the number of project objectives
     * and distribute results using explicit analysis IDs
     * when available.
     */

    if (objectiveId === null) {
      const objectiveCount =
        Array.isArray(project?.objectives)
          ? project.objectives.length
          : Array.isArray(plan?.items)
          ? plan.items.length
          : 0;

      if (
        objectiveCount > 0 &&
        rawResults.length > objectiveCount
      ) {
        /*
         * If there are more results than objectives,
         * try to infer equal-sized objective groups.
         *
         * Example:
         * 16 results / 4 objectives = 4 each.
         */

        const groupSize =
          rawResults.length %
            objectiveCount ===
          0
            ? rawResults.length /
              objectiveCount
            : null;

        if (groupSize) {
          objectiveId =
            Math.floor(
              index / groupSize
            ) + 1;
        }
      }
    }

    /*
     * Final fallback.
     */

    if (objectiveId === null) {
      objectiveId =
        item?.objective_id ??
        index + 1;
    }

    output.push({
      ...item,
      result,
      objective_id: Number(objectiveId),
      objective:
        itemObjective ||
        item?.objective_text ||
        "",
      analysis_id:
        rawId ||
        `${objectiveId}.${index + 1}`,
    });
  });

  /*
   * -------------------------------------------------------
   * NESTED OBJECTIVE RESULTS
   * -------------------------------------------------------
   */

  const nested =
    Array.isArray(
      analysis?.objective_results
    )
      ? analysis.objective_results
      : [];

  nested.forEach(
    (objectiveItem, objectiveIndex) => {
      const objectiveId =
        Number(
          objectiveItem?.objective_id ??
            objectiveItem?.id ??
            objectiveIndex + 1
        );

      const objective =
        objectiveItem?.objective ||
        objectiveItem?.objective_text ||
        "";

      const analyses =
        Array.isArray(
          objectiveItem?.analyses
        )
          ? objectiveItem.analyses
          : Array.isArray(
              objectiveItem?.results
            )
          ? objectiveItem.results
          : [];

      analyses.forEach(
        (analysisItem, analysisIndex) => {
          const result =
            analysisItem?.result ||
            analysisItem?.analysis_result ||
            analysisItem?.analysis ||
            analysisItem;

          if (!result) {
            return;
          }

          output.push({
            ...analysisItem,
            result,
            objective_id:
              objectiveId,
            objective:
              analysisItem?.objective ||
              objective,
            analysis_id:
              analysisItem?.analysis_id ||
              analysisItem?.id ||
              `${objectiveId}.${analysisIndex + 1}`,
            status:
              analysisItem?.status ||
              "complete",
          });
        }
      );
    }
  );

  /*
   * -------------------------------------------------------
   * REMOVE DUPLICATES
   * -------------------------------------------------------
   *
   * This prevents the same analysis appearing twice if
   * the backend currently exposes both `results` and
   * `objective_results`.
   * -------------------------------------------------------
   */

  const seen = new Set();

  return output.filter((item, index) => {
    const key =
      item?.analysis_id ||
      item?.id ||
      `${item.objective_id}-${index}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

/*
 * =========================================================
 * DATA PREPARATION / PROFILE / INTERPRETATION NARRATIVE
 *
 * JS mirrors of the deterministic (no-AI-call) prose
 * generators in backend/app/services/thesis.py. Keep these
 * in sync with their Python counterparts:
 * _describe_cleaning_actions, _respondent_profile_narrative,
 * _objective_interpretation_sentence, _objective_recap_sentence.
 * =========================================================
 */

export function describeCleaningActions(actionsApplied) {
  const actions = Array.isArray(actionsApplied) ? actionsApplied : [];

  const effective = actions.filter(
    (action) =>
      (action?.affected_values ?? action?.detected_count ?? 0) > 0
  );

  if (effective.length === 0) {
    return "No automatic cleaning actions were necessary for this dataset.";
  }

  const lowerFirst = (text) =>
    text ? text.charAt(0).toLowerCase() + text.slice(1) : text;

  const parts = effective.map((action) => {
    const column = action?.column;
    const reason = (action?.reason || "").replace(/\.+$/, "");
    const count = action?.affected_values ?? action?.detected_count ?? 0;
    const unit = count === 1 ? "value" : "values";

    if (column) {
      return `in "${column}", ${lowerFirst(reason)} (${count} ${unit} affected)`;
    }

    return `${lowerFirst(reason)} (${count} rows affected)`;
  });

  const body =
    parts.length === 1
      ? parts[0]
      : parts.slice(0, -1).join("; ") + "; and " + parts[parts.length - 1];

  const actionWord = effective.length === 1 ? "action" : "actions";

  return (
    `Automated cleaning applied ${effective.length} conservative ` +
    `${actionWord} before analysis: ${body}.`
  );
}

function compressReason(reason) {
  let text = String(reason || "").trim().replace(/\.+$/, "");

  const soIndex = text.indexOf(", so ");
  if (soIndex !== -1) {
    text = text.slice(0, soIndex);
  }

  if (!text) return "";

  return text.charAt(0).toLowerCase() + text.slice(1);
}

function issueClause(issue) {
  const rule = issue?.rule;
  const count = issue?.detected_count || 0;
  const unit = count === 1 ? "value" : "values";

  if (rule === "missing_values_require_review") {
    const verb = count === 1 ? "is" : "are";
    const aux = count === 1 ? "was" : "were";
    return `${count} ${unit} ${verb} missing and ${aux} not imputed`;
  }

  if (rule === "numeric_invalid_values_coerced") {
    const aux = count === 1 ? "was" : "were";
    return `${count} ${unit} ${aux} not valid numbers and ${aux} treated as missing`;
  }

  if (rule === "free_text_preserved") {
    return "free-text responses were preserved and not modified";
  }

  if (rule === "numeric_conversion_ambiguous") {
    return "numeric-looking values with leading zeroes may be identifiers and were kept as text";
  }

  return compressReason(issue?.reason) || "required manual review";
}

export function describeRemainingIssues(remainingIssues) {
  const issues = Array.isArray(remainingIssues) ? remainingIssues : [];

  if (issues.length === 0) {
    return "No unresolved data-quality issues were identified during automated cleaning.";
  }

  const byColumn = new Map();
  const order = [];

  issues.forEach((issue) => {
    const column = issue?.column || "the dataset";

    if (!byColumn.has(column)) {
      byColumn.set(column, []);
      order.push(column);
    }

    byColumn.get(column).push(issue);
  });

  const sentences = order.map((column) => {
    const columnIssues = byColumn.get(column);
    const total = columnIssues.reduce(
      (sum, issue) => sum + (issue?.detected_count || 0),
      0
    );
    const unit = total === 1 ? "value" : "values";
    const clauses = columnIssues.map(issueClause).filter(Boolean);

    const body =
      clauses.length === 1
        ? clauses[0]
        : clauses.slice(0, -1).join("; ") + "; and " + clauses[clauses.length - 1];

    const location =
      column !== "the dataset" ? `In "${column}"` : "Across the dataset";

    return `${location}, ${total} ${unit} required review: ${body}.`;
  });

  const issueWord = issues.length === 1 ? "issue" : "issues";

  const intro =
    `${issues.length} data-quality ${issueWord} remained unresolved after ` +
    "automated cleaning because they require researcher judgement rather " +
    "than automatic correction. ";

  return intro + sentences.join(" ");
}

function humanizeColumnName(name) {
  return String(name || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
}

export function respondentProfileNarrative(categorical, numeric, n) {
  const categoricalList = Array.isArray(categorical) ? categorical : [];
  const numericList = Array.isArray(numeric) ? numeric : [];

  if (categoricalList.length === 0 && numericList.length === 0) {
    return null;
  }

  const ageColumn =
    numericList.find(
      (column) =>
        String(column?.name || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "") === "age"
    ) || null;

  const otherNumeric = numericList.filter(
    (column) => column !== ageColumn
  );

  const respondentCount = Number(n) || 0;

  let opening = `The sample comprised ${respondentCount.toLocaleString()} respondent${
    respondentCount !== 1 ? "s" : ""
  }`;

  if (ageColumn && typeof ageColumn.mean === "number") {
    opening += `, with an average age of ${toFixedHalfEven(ageColumn.mean, 1)} years`;
  }

  opening += ".";

  const sentences = [opening];

  if (categoricalList.length > 0) {
    const clauses = categoricalList
      .map((column) => {
        const freqs = column?.frequencies || {};
        const entries = Object.entries(freqs);

        if (entries.length === 0) {
          return null;
        }

        const [topLabel, topStats] = entries.reduce((best, entry) =>
          entry[1]?.count > best[1]?.count ? entry : best
        );

        const pct = topStats?.percent ?? 0;

        return `${humanizeColumnName(column?.name)} — ${topLabel} (${toFixedHalfEven(
          pct,
          1
        )}%)`;
      })
      .filter(Boolean);

    if (clauses.length > 0) {
      sentences.push("The dominant categories were: " + clauses.join("; ") + ".");
    }
  }

  if (otherNumeric.length > 0) {
    const clauses = otherNumeric.map(
      (column) =>
        `the average ${humanizeColumnName(column?.name)} was ${toFixedHalfEven(
          Number(column?.mean),
          1
        )}`
    );

    const body =
      clauses.length === 1
        ? clauses[0]
        : clauses.slice(0, -1).join("; ") + "; and " + clauses[clauses.length - 1];

    sentences.push(body.charAt(0).toUpperCase() + body.slice(1) + ".");
  }

  return sentences.join(" ");
}

/*
 * =========================================================
 * QUALITATIVE FINDINGS <-> OBJECTIVE RELEVANCE
 * =========================================================
 *
 * JS mirror of thesis.py's column_objectives-based design: a researcher-
 * declared {column: [objectiveId, ...]} link (set via
 * select_qualitative_columns()), captured alongside qualitative column
 * selection -- never a computed relevance score of any kind. An untagged
 * objective gets an explicitly-unattributed shared synthesis instead of a
 * guessed match. Kept in sync with the Python version so the live preview
 * and the downloaded docx never disagree.
 */

// Objective wording that signals the researcher wants open-ended,
// experiential evidence rather than a numeric comparison. Mirrors
// thesis.py's _QUALITATIVE_INTENT_WORDS exactly.
const QUALITATIVE_INTENT_WORDS = [
  "experience", "experiences", "perception", "perceptions", "views",
  "challenge", "challenges", "attitude", "attitudes", "opinion",
  "opinions", "feel", "feeling", "describe", "explore", "barriers",
  "reasons", "why",
];

export function expressesQualitativeIntent(text) {
  const q = String(text || "").toLowerCase();
  return QUALITATIVE_INTENT_WORDS.some((word) => q.includes(word));
}

/*
 * Reads analysis.qualitative_results (the flat, column-keyed list --
 * see run_plan()/finalize_qualitative_column() on the backend) into a
 * {column: result} map of finalized findings only. Qualitative results
 * are never nested under an objective, so there is nothing to search by
 * objective slot here.
 */
export function collectQualitativeFindings(analysis) {
  const findings = {};
  const entries = Array.isArray(analysis?.qualitative_results) ? analysis.qualitative_results : [];
  entries.forEach((entry) => {
    if (entry?.column && entry?.result) {
      findings[entry.column] = entry.result;
    }
  });
  return findings;
}

// Columns the researcher explicitly declared as informing this objective
// (plan.qualitative.column_objectives), restricted to columns that
// actually have finalized findings -- a pure lookup, never a guess.
export function columnsTaggedToObjective(columnObjectives, objectiveId, qualitativeFindings) {
  return Object.entries(columnObjectives || {})
    .filter(([column, ids]) => (ids || []).includes(objectiveId) && qualitativeFindings?.[column])
    .map(([column]) => column);
}

// The inverse lookup: which objectives (restricted to ones that still
// exist in this report) the researcher declared this column as informing.
export function objectivesTaggedToColumn(columnObjectives, column, objectiveGroups) {
  const ids = new Set((columnObjectives || {})[column] || []);
  return (objectiveGroups || [])
    .filter((g) => ids.has(g?.id))
    .map((g) => ({ objectiveId: g.id, objectiveText: g.objective }));
}

// Every theme name drawn from exactly these columns' finalized findings.
// No scoring, no matching -- a plain lookup restricted to the given set.
export function themeNamesFromColumns(qualitativeFindings, columns) {
  const names = [];
  (columns || []).forEach((column) => {
    (qualitativeFindings?.[column]?.themes || []).forEach((theme) => {
      if (theme?.theme && !names.includes(theme.theme)) names.push(theme.theme);
    });
  });
  return names;
}

export function joinAnd(items) {
  const quoted = items.map((i) => `"${i}"`);
  if (quoted.length === 1) return quoted[0];
  if (quoted.length === 2) return quoted.join(" and ");
  return quoted.slice(0, -1).join("; ") + `; and ${quoted[quoted.length - 1]}`;
}

// Turns a real list of theme names into one prose clause -- built fresh
// from the study's own theme set every time, never a fixed template.
export function qualitativeSynthesisClause(themeNames) {
  return `the data reflects patterns of ${joinAnd(themeNames)}`;
}

// Each theme's name plus its own central organizing concept/description,
// drawn from exactly these columns -- real per-theme substance, not just
// a name list; still a plain lookup, no scoring involved.
export function themeSummariesFromColumns(qualitativeFindings, columns) {
  const summaries = [];
  const seen = new Set();
  (columns || []).forEach((column) => {
    (qualitativeFindings?.[column]?.themes || []).forEach((theme) => {
      const name = theme?.theme;
      if (!name || seen.has(name)) return;
      seen.add(name);
      const concept = String(theme?.central_organizing_concept || theme?.description || "").trim();
      summaries.push([name, concept]);
    });
  });
  return summaries;
}

// One sentence per theme naming it and stating its own concept -- nothing
// invented, just assembled from each theme's already-defined concept text.
export function themeSummarySentence(themeSummaries) {
  return themeSummaries
    .map(([name, concept]) => {
      if (!concept) return `"${name}"`;
      const stripped = concept.endsWith(".") ? concept.slice(0, -1) : concept;
      const lowered = stripped.charAt(0).toLowerCase() + stripped.slice(1);
      return `"${name}" (${lowered})`;
    })
    .join("; ");
}

/*
 * Text relating an objective to the study's qualitative findings.
 *
 * If the researcher explicitly tagged one or more columns as informing
 * this objective, the synthesis is built ONLY from those columns' themes,
 * naming each theme with its own concept. If nothing was tagged, this
 * falls back to a single synthesis drawn from the FULL theme set,
 * explicitly labelled as not objective-specific -- and only for an
 * objective whose own wording suggests a qualitative dimension at all, so
 * a purely quantitative objective doesn't get an unrelated qualitative
 * aside appended.
 */
export function qualitativeObjectiveParagraph(group, qualitativeFindings, columnObjectives) {
  if (!qualitativeFindings || Object.keys(qualitativeFindings).length === 0) return null;

  const taggedColumns = columnsTaggedToObjective(columnObjectives, group?.id, qualitativeFindings);
  if (taggedColumns.length > 0) {
    const themeSummaries = themeSummariesFromColumns(qualitativeFindings, taggedColumns);
    if (themeSummaries.length === 0) return null;
    const columnsText = joinAnd([...taggedColumns].sort());
    const plural = themeSummaries.length !== 1 ? "s" : "";
    return (
      `This objective was designated by the researcher as informed by ${columnsText}. ` +
      "Reflexive thematic analysis (Braun & Clarke, 2006) of that data identified the " +
      `following theme${plural} relevant to this objective: ${themeSummarySentence(themeSummaries)}. ` +
      "See the Thematic Analysis Findings section below for the full definitions, " +
      "subthemes and evidence."
    );
  }

  if (!expressesQualitativeIntent(group?.objective)) return null;

  const themeNames = themeNamesFromColumns(qualitativeFindings, Object.keys(qualitativeFindings));
  if (themeNames.length === 0) return null;

  return (
    "No specific open-ended data source was designated for this objective, so this " +
    "reflects the study's qualitative findings as a whole rather than evidence chosen " +
    `for this objective: ${qualitativeSynthesisClause(themeNames)}. See the ` +
    "Thematic Analysis Findings section below for the full definitions, subthemes " +
    "and evidence."
  );
}

// Whether this objective has ANY qualitative basis to draw on -- either
// explicit researcher tagging or (as a fallback) qualitative findings
// existing at all combined with the objective's own wording.
export function objectiveHasQualitativeRelevance(group, qualitativeFindings, columnObjectives) {
  if (!qualitativeFindings || Object.keys(qualitativeFindings).length === 0) return false;
  if (columnsTaggedToObjective(columnObjectives, group?.id, qualitativeFindings).length > 0) return true;
  return expressesQualitativeIntent(group?.objective);
}

// Every respondent id backing a theme, drawn from its subthemes'
// supporting quotes -- an objective fact already in the coded data.
function themeRespondentIds(theme) {
  const ids = new Set();
  (theme?.subthemes || []).forEach((subtheme) => {
    (subtheme?.quotes || []).forEach((quote) => {
      if (quote?.respondent_id) ids.add(quote.respondent_id);
    });
  });
  return ids;
}

/*
 * Pairs of themes whose supporting evidence traces back to at least one
 * of the same respondents -- the only basis on which this report states
 * a relationship between two themes. Never based on theme names/topics
 * sounding related: two themes with no shared respondent produce no
 * relationship here, however similar their names look.
 */
export function evidenceGroundedThemeRelationships(qualitativeFindings) {
  const entries = [];
  Object.entries(qualitativeFindings || {}).forEach(([column, result]) => {
    (result?.themes || []).forEach((theme) => {
      const ids = themeRespondentIds(theme);
      if (ids.size > 0) entries.push({ column, name: theme?.theme || "Theme", ids });
    });
  });

  const relationships = [];
  const seenPairs = new Set();
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i];
      const b = entries[j];
      if (a.column === b.column && a.name === b.name) continue;
      const shared = [...a.ids].filter((id) => b.ids.has(id)).sort();
      if (shared.length === 0) continue;
      const pairKey = [`${a.column}::${a.name}`, `${b.column}::${b.name}`].sort().join("|");
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      relationships.push({
        themeA: a.name, columnA: a.column,
        themeB: b.name, columnB: b.column,
        sharedRespondents: shared,
      });
    }
  }
  return relationships;
}

/*
 * Strips or replaces prevalence claims ("the majority of respondents",
 * "repeatedly", "consistently", "several participants"...) that a
 * theme's own stored response_count/percentage don't actually support --
 * e.g. a theme with responseCount=1 must never read "repeatedly
 * described". Mirrors thesis.py's _guard_prevalence_language() exactly;
 * does not touch the AI generation prompt, only the render-time text.
 */
const PREVALENCE_RULES = [
  {
    pattern: /\bthe majority of (respondents|participants|students)\b/gi,
    supported: (count, pct) => pct > 50,
  },
  {
    pattern: /\bmost (respondents|participants|students)\b/gi,
    supported: (count, pct) => pct > 50,
  },
  {
    pattern: /\b(several|many) (respondents|participants|students)\b/gi,
    supported: (count) => count >= 3,
  },
  {
    pattern: /\brepeatedly\b/gi,
    supported: (count) => count >= 2,
    replacement: () => "",
  },
  {
    pattern: /\bconsistently\b/gi,
    supported: (count) => count >= 2,
    replacement: () => "",
  },
];

export function guardPrevalenceLanguage(text, responseCount, percentage) {
  if (!text) return text;
  let guarded = text;
  PREVALENCE_RULES.forEach(({ pattern, supported, replacement }) => {
    if (supported(responseCount, percentage)) return;
    const replace = replacement || (() => `${responseCount} respondent${responseCount !== 1 ? "s" : ""}`);
    guarded = guarded.replace(pattern, replace);
  });
  guarded = guarded.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;])/g, "$1");
  return guarded.trim();
}

export function objectiveInterpretationSentence(group, qualitativeFindings = {}, columnObjectives = {}) {
  const number = group?.id;
  const objectiveText =
    group?.objective || `Research Objective ${number}`;
  const completed = Array.isArray(group?.results) ? group.results : [];

  if (completed.length === 0) {
    const qualParagraph = qualitativeObjectiveParagraph(group, qualitativeFindings, columnObjectives);
    if (qualParagraph) {
      return `Objective ${number} ("${objectiveText}"): ${qualParagraph}`;
    }
    return (
      `Objective ${number} ("${objectiveText}") could not be linked to a ` +
      "completed analysis; see the Results section for the reason."
    );
  }

  const clauses = completed.map((item) => {
    const result = item?.result || {};
    const test = result.test;
    const testName = getTestName(result, item);

    if (test === "thematic_analysis") {
      // Legacy only: a pre-refactor project could still have a
      // thematic_analysis result nested directly under an objective. New
      // data never takes this branch -- qualitative results live in
      // analysis.qualitative_results, handled via the mixed-methods
      // pointer appended below instead.
      const nThemes = Array.isArray(result.themes) ? result.themes.length : 0;

      return (
        `${testName} of the open-ended responses (see the Thematic Analysis Findings section) ` +
        `surfaced ${nThemes} theme${nThemes !== 1 ? "s" : ""} from that data; the themes most ` +
        "relevant to this objective are discussed there"
      );
    }

    if (test === "distribution") {
      const col = result.numeric_column || "the variable";
      const mean = result.mean;
      const meanStr =
        typeof mean === "number" ? toFixedHalfEven(mean, 2) : "an undetermined value";

      return `${testName} characterised ${col} (mean = ${meanStr}), directly addressing this objective`;
    }

    if (result.p_value !== null && result.p_value !== undefined) {
      const pValue = Number(result.p_value);
      const cols = (item?.columns || result.columns || [])
        .filter(Boolean)
        .join(" and ");
      const pText = result.p_value_formatted || "";

      if (pValue < 0.05) {
        return (
          `${testName} found a statistically significant result for ${cols} ` +
          `(p ${pText}), supporting this objective`
        );
      }

      return (
        `${testName} found no statistically significant result for ${cols} ` +
        `(p ${pText}), so this objective is not supported by the available evidence`
      );
    }

    return `${testName} was completed in relation to this objective`;
  });

  const body = clauses.join("; ");
  let sentence = `Objective ${number} ("${objectiveText}") was addressed as follows: ${body}.`;

  // Mixed-methods case: this objective already has a quantitative result
  // above, but also has a qualitative dimension -- append a pointer
  // rather than only covering the quantitative side.
  const qualParagraph = qualitativeObjectiveParagraph(group, qualitativeFindings, columnObjectives);
  if (qualParagraph) {
    sentence += ` ${qualParagraph}`;
  }

  return sentence;
}

export function objectiveRecapSentence(group, qualitativeFindings = {}, columnObjectives = {}) {
  const number = group?.id;
  const completed = Array.isArray(group?.results) ? group.results : [];

  if (completed.length === 0) {
    if (objectiveHasQualitativeRelevance(group, qualitativeFindings, columnObjectives)) {
      return `Objective ${number}: addressed qualitatively; see the qualitative findings summary below.`;
    }
    return `Objective ${number}: could not be answered with the available data.`;
  }

  const parts = completed.map((item) => {
    const result = item?.result || {};
    const test = result.test;
    const testName = getTestName(result, item);

    if (test === "thematic_analysis") {
      // Legacy only -- see objectiveInterpretationSentence().
      const nThemes = Array.isArray(result.themes) ? result.themes.length : 0;
      return `${testName} (open-ended responses) surfaced ${nThemes} theme${nThemes !== 1 ? "s" : ""}`;
    }

    if (test === "distribution") {
      const mean = result.mean;
      const meanStr = typeof mean === "number" ? toFixedHalfEven(mean, 2) : "N/A";
      return `${testName} (mean = ${meanStr}, n = ${result.n ?? 0})`;
    }

    if (result.p_value !== null && result.p_value !== undefined) {
      const pValue = Number(result.p_value);
      const decision = pValue < 0.05 ? "significant" : "not significant";
      return `${testName} (p ${result.p_value_formatted || ""}, ${decision})`;
    }

    return testName;
  });

  // Deliberately never names specific themes here, tagged or not: 4.8
  // gets one combined qualitative-findings summary (see Chapter4.jsx),
  // not a per-objective theme list.
  return `Objective ${number}: ${parts.join("; ")}.`;
}
