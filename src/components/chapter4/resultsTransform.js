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

  return number.toFixed(decimals);
}

export function getTestName(result) {
  const names = {
    correlation: "Pearson correlation",
    cross_tab: "Chi-square test of association",
    t_test: "Independent-samples t-test",
    anova: "One-way ANOVA",
  };

  return (
    names[result?.test] ||
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
    return `t = ${formatNumber(
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

      return `p = ${p.toFixed(4)}`;
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
