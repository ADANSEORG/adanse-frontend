import { useEffect, useMemo, useState } from "react";
import {
  formatVariableName,
  formatNumber,
  getTestName,
  getStatistic,
  getPValue,
  getDecision,
  getResultSummary,
  getNumericColumn,
  getGroupColumn,
  getGroups,
  normaliseResults,
} from "./chapter4/resultsTransform.js";

/*
 * =========================================================
 * RESULT TABLE
 * =========================================================
 */

function QualitativeResult({ result, item }) {
  if (!result) return null;

  const column =
    result.column ||
    item?.text_column ||
    result.columns?.[0] ||
    "Open-ended responses";

  const themes = Array.isArray(result.themes)
    ? result.themes
    : [];

  return (
    <div className="chapter-qualitative-result">
      <div className="chapter-result-table-wrap">
        <table className="chapter-result-table">
          <thead>
            <tr>
              <th>Theme</th>
              <th>Responses</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            {themes.map((theme, index) => (
              <tr key={`${theme?.theme || "theme"}-${index}`}>
                <td>{theme?.theme || "Theme"}</td>
                <td>{theme?.response_count ?? "—"}</td>
                <td>
                  {theme?.percentage !== undefined &&
                  theme?.percentage !== null
                    ? `${Number(theme.percentage).toFixed(1)}%`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.response_count !== undefined && (
        <p>
          Thematic analysis was conducted on{" "}
          <strong>{result.response_count}</strong> usable responses from{" "}
          <strong>{formatVariableName(column)}</strong>.
        </p>
      )}

      {themes.map((theme, index) => (
        <div
          key={`theme-detail-${theme?.theme || "theme"}-${index}`}
          className="chapter-qualitative-theme"
        >
          <h6>{theme?.theme || "Theme"}</h6>

          {theme?.description && (
            <p>{theme.description}</p>
          )}

          {Array.isArray(theme?.quotes) &&
            theme.quotes.length > 0 && (
              <div>
                <strong>Representative responses</strong>
                {theme.quotes.slice(0, 3).map((quote, quoteIndex) => (
                  <blockquote
                    key={`quote-${index}-${quoteIndex}`}
                  >
                    “{quote}”
                  </blockquote>
                ))}
              </div>
            )}
        </div>
      ))}

      {result.warning && (
        <div className="chapter-warning">
          <strong>Interpretation caution</strong>
          <p>{result.warning}</p>
        </div>
      )}
    </div>
  );
}

function ResultTable({ result }) {
  if (!result) return null;

  return (
    <div className="chapter-result-table-wrap">
      <table className="chapter-result-table">
        <thead>
          <tr>
            <th>Analysis</th>
            <th>Statistic</th>
            <th>p-value</th>
            <th>Decision</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>{getTestName(result)}</td>
            <td>{getStatistic(result)}</td>
            <td>{getPValue(result)}</td>
            <td>
              {getDecision(result)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function GroupTable({ result }) {
  const groups = getGroups(result);
  const entries = Object.entries(groups);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="chapter-result-table-wrap">
      <table className="chapter-result-table">
        <thead>
          <tr>
            <th>Group</th>
            <th>N</th>
            <th>Mean</th>
            <th>SD</th>
          </tr>
        </thead>

        <tbody>
          {entries.map(([group, values]) => (
            <tr key={group}>
              <td>{group}</td>
              <td>
                {values?.n ?? "—"}
              </td>
              <td>
                {formatNumber(
                  values?.mean,
                  2
                )}
              </td>
              <td>
                {formatNumber(
                  values?.std,
                  2
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/*
 * =========================================================
 * MAIN COMPONENT
 * =========================================================
 */

export default function Chapter4({
  project,
  upload,
  plan,
  analysis,
  onBack,
  onDownload,
  loading,
}) {
  const [activeSection, setActiveSection] =
    useState("introduction");

  /*
   * -------------------------------------------------------
   * OBJECTIVES
   * -------------------------------------------------------
   */

  const objectives = useMemo(() => {
    const projectObjectives =
      Array.isArray(project?.objectives)
        ? project.objectives
        : [];

    if (projectObjectives.length > 0) {
      return projectObjectives;
    }

    const planItems =
      Array.isArray(plan?.items)
        ? plan.items
        : [];

    if (planItems.length > 0) {
      return planItems.map(
        (item) =>
          item?.objective ||
          `Research Objective ${item?.id || ""}`
      );
    }

    return [];
  }, [project, plan]);

  /*
   * -------------------------------------------------------
   * NORMALISED RESULTS
   * -------------------------------------------------------
   */

  const normalisedResults = useMemo(() => {
    return normaliseResults(
      analysis,
      plan,
      project
    );
  }, [analysis, plan, project]);

  /*
   * -------------------------------------------------------
   * COMPLETED RESULTS
   * -------------------------------------------------------
   */

  const completedResults = useMemo(() => {
    return normalisedResults.filter(
      (item) =>
        (
          item?.status === "complete" ||
          item?.status === undefined
        ) &&
        item?.result
    );
  }, [normalisedResults]);

  /*
   * -------------------------------------------------------
   * GROUP RESULTS BY OBJECTIVE
   *
   * THIS IS THE FIX.
   *
   * We no longer use:
   *
   * completedResults.map((item, index) => Objective index)
   *
   * because one objective can contain multiple analyses.
   * -------------------------------------------------------
   */

  const objectiveGroups = useMemo(() => {
    const groups = new Map();

    /*
     * First create groups for every known research
     * objective, even if it has zero completed analyses.
     */

    objectives.forEach(
      (objective, index) => {
        const id = index + 1;

        groups.set(id, {
          id,
          objective,
          results: [],
        });
      }
    );

    /*
     * Add actual completed analyses.
     */

    completedResults.forEach((item) => {
      let id =
        Number(item?.objective_id);

      if (
        !Number.isFinite(id) ||
        id <= 0
      ) {
        id = null;
      }

      /*
       * If objective text exists, use it to locate
       * the correct objective.
       */

      if (id === null && item?.objective) {
        const match =
          objectives.findIndex(
            (objective) =>
              String(objective).trim() ===
              String(item.objective).trim()
          );

        if (match >= 0) {
          id = match + 1;
        }
      }

      /*
       * Final fallback.
       */

      if (id === null) {
        id = 1;
      }

      if (!groups.has(id)) {
        groups.set(id, {
          id,
          objective:
            item?.objective ||
            `Research Objective ${id}`,
          results: [],
        });
      }

      groups
        .get(id)
        .results.push(item);
    });

    /*
     * Sort by objective number.
     */

    return Array.from(groups.values())
      .sort((a, b) => a.id - b.id)
      .filter(
        (group) =>
          group.results.length > 0 ||
          objectives[group.id - 1]
      );
  }, [
    objectives,
    completedResults,
  ]);

  /*
   * -------------------------------------------------------
   * COMPLETED OBJECTIVE COUNT
   *
   * IMPORTANT:
   *
   * 16 analyses across 4 objectives =
   * 4 objectives analysed.
   * -------------------------------------------------------
   */

  const completedObjectiveCount =
    objectiveGroups.filter(
      (group) =>
        group.results.length > 0
    ).length;

  const completedAnalysisCount =
    completedResults.length;

  /*
   * -------------------------------------------------------
   * DESCRIPTIVES
   * -------------------------------------------------------
   */

  const descriptives =
    analysis?.descriptives || {};

  /*
   * -------------------------------------------------------
   * CHAPTER NAVIGATION
   * -------------------------------------------------------
   */

  const sectionIds = [
    "introduction",
    "results",
    "objectives",
    "hypothesis",
    "summary",
  ];

  const scrollToSection = (sectionId) => {
    const element =
      document.getElementById(
        `chapter-${sectionId}`
      );

    if (!element) return;

    setActiveSection(sectionId);

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  /*
   * -------------------------------------------------------
   * ACTIVE NAVIGATION ON SCROLL
   * -------------------------------------------------------
   */

  useEffect(() => {
    const elements = sectionIds
      .map((id) =>
        document.getElementById(
          `chapter-${id}`
        )
      )
      .filter(Boolean);

    if (elements.length === 0) {
      return undefined;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const visibleEntries =
            entries
              .filter(
                (entry) =>
                  entry.isIntersecting
              )
              .sort(
                (a, b) =>
                  a.boundingClientRect.top -
                  b.boundingClientRect.top
              );

          if (
            visibleEntries.length === 0
          ) {
            return;
          }

          const id =
            visibleEntries[0].target.id.replace(
              "chapter-",
              ""
            );

          setActiveSection(id);
        },
        {
          root: null,
          rootMargin:
            "-120px 0px -65% 0px",
          threshold: 0,
        }
      );

    elements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  /*
   * -------------------------------------------------------
   * RENDER
   * -------------------------------------------------------
   */

  return (
    <div className="chapter4-page">

      {/* =================================================
          HERO
          ================================================= */}

      <div className="chapter4-hero">
        <div>
          <div className="section-kicker">
            04 · CHAPTER 4
          </div>

          <h1>
            Your Results chapter.
          </h1>

          <p>
            Adanse has turned your completed
            quantitative and qualitative analyses into
            a structured Chapter 4 built around your
            research objectives and findings.
          </p>
        </div>

        {upload && (
          <div className="dataset-pill">
            <strong>
              {upload.dataset_filename ||
                upload.filename}
            </strong>

            <span>
              {(
                upload.dataset_rows ||
                upload.rows ||
                0
              ).toLocaleString()}{" "}
              observations ·{" "}
              {(
                upload.dataset_columns ||
                upload.columns ||
                []
              ).length}{" "}
              variables
            </span>
          </div>
        )}
      </div>

      {/* =================================================
          EXPORT ACTION
          ================================================= */}

      <div className="chapter4-action">
        <div>
          <div className="chapter4-action-label">
            READY TO EXPORT
          </div>

          <strong>
            {completedObjectiveCount} research
            objective
            {completedObjectiveCount === 1
              ? ""
              : "s"}{" "}
            analysed
          </strong>

          <p>
            {completedAnalysisCount} completed
            statistical{" "}
            {completedAnalysisCount === 1
              ? "analysis"
              : "analyses"}{" "}
            will be included in the editable
            Chapter 4 document.
          </p>
        </div>

        <button
          className="btn btn-primary btn-large"
          onClick={onDownload}
          disabled={loading}
          type="button"
        >
          {loading
            ? "Preparing document…"
            : "Download Chapter 4 .docx"}
        </button>
      </div>

      {/* =================================================
          CHAPTER LAYOUT
          ================================================= */}

      <div className="chapter4-layout">

        {/* =================================================
            LEFT NAVIGATION
            ================================================= */}

        <aside className="chapter4-nav">

          <div className="chapter4-nav-title">
            CHAPTER 4
          </div>

          <button
            type="button"
            className={`chapter4-nav-item ${
              activeSection ===
              "introduction"
                ? "active"
                : ""
            }`}
            onClick={() =>
              scrollToSection(
                "introduction"
              )
            }
          >
            4.1 Introduction
          </button>

          <button
            type="button"
            className={`chapter4-nav-item ${
              activeSection === "results"
                ? "active"
                : ""
            }`}
            onClick={() =>
              scrollToSection("results")
            }
          >
            4.2 Results
          </button>

          <button
            type="button"
            className={`chapter4-nav-item ${
              activeSection ===
              "objectives"
                ? "active"
                : ""
            }`}
            onClick={() =>
              scrollToSection(
                "objectives"
              )
            }
          >
            4.3 Research Objectives
          </button>

          <button
            type="button"
            className={`chapter4-nav-item ${
              activeSection ===
              "hypothesis"
                ? "active"
                : ""
            }`}
            onClick={() =>
              scrollToSection(
                "hypothesis"
              )
            }
          >
            4.4 Hypothesis Testing
          </button>

          <button
            type="button"
            className={`chapter4-nav-item ${
              activeSection === "summary"
                ? "active"
                : ""
            }`}
            onClick={() =>
              scrollToSection("summary")
            }
          >
            4.5 Summary of Findings
          </button>

        </aside>

        {/* =================================================
            DOCUMENT PREVIEW
            ================================================= */}

        <article className="chapter4-document">

          {/* =================================================
              4.1 INTRODUCTION
              ================================================= */}

          <section
            id="chapter-introduction"
            className="chapter-section"
          >
            <div className="chapter-document-header">
              <span>
                CHAPTER FOUR
              </span>

              <span>
                RESULTS AND FINDINGS
              </span>
            </div>

            <div className="chapter-title-page">
              <h2>
                CHAPTER FOUR
              </h2>

              <h3>
                RESULTS AND FINDINGS
              </h3>
            </div>

            <h4>
              4.1 Introduction
            </h4>

            <p>
              This chapter presents the results
              obtained from the analysis of the
              research data. The findings are
              organised according to the research
              objectives and the statistical
              procedures applied to the dataset.
            </p>

            <p>
              The analyses reported in this chapter
              are calculated directly from the
              uploaded dataset. Where applicable,
              descriptive statistics, inferential
              tests, effect sizes and assumption
              checks are presented to support
              interpretation of the findings.
            </p>
          </section>

          {/* =================================================
              4.2 RESULTS
              ================================================= */}

          <section
            id="chapter-results"
            className="chapter-section"
          >
            <h4>
              4.2 Results
            </h4>

            <p>
              The results below are organised by
              research objective. Each statistical
              analysis remains attached to the
              objective it was selected to address.
            </p>

            {objectiveGroups.length === 0 ? (
              <div className="empty-panel">
                <h2>
                  No completed results yet.
                </h2>

                <p>
                  Complete the analysis stage
                  before generating the Chapter 4
                  preview.
                </p>
              </div>
            ) : (
              objectiveGroups.map(
                (group) => (
                  <div
                    key={`objective-${group.id}`}
                    className="chapter-objective-result"
                  >

                    <div className="chapter-section-number">
                      4.2.{group.id}
                    </div>

                    <h5>
                      Research Objective{" "}
                      {group.id}
                    </h5>

                    <p className="chapter-objective">
                      {group.objective ||
                        `Research Objective ${group.id}`}
                    </p>

                    <div className="chapter-analysis-count">
                      {group.results.length}{" "}
                      {group.results.length === 1
                        ? "analysis"
                        : "analyses"}{" "}
                      completed for this objective.
                    </div>

                    {group.results.map(
                      (
                        item,
                        analysisIndex
                      ) => {
                        const result =
                          item.result;

                        const numericColumn =
                          getNumericColumn(
                            result,
                            item
                          );

                        const groupColumn =
                          getGroupColumn(
                            result,
                            item
                          );

                        return (
                          <div
                            key={
                              item.analysis_id ||
                              item.id ||
                              `${group.id}-${analysisIndex}`
                            }
                            className="chapter-analysis-block"
                          >

                            <div className="chapter-analysis-label">
                              Analysis{" "}
                              {group.id}.
                              {analysisIndex +
                                1}
                            </div>

                            <h5>
                              Statistical Analysis
                            </h5>

                            <p>
                              The analysis used{" "}
                              <strong>
                                {getTestName(
                                  result
                                )}
                              </strong>{" "}
                              to examine the
                              relationship,
                              association or
                              difference relevant
                              to this research
                              objective.
                            </p>

                            <div className="chapter-analysis-meta">
                              <div>
                                <span>
                                  VARIABLE
                                </span>

                                <strong>
                                  {formatVariableName(
                                    numericColumn ||
                                      item.column_a ||
                                      result
                                        ?.columns?.[0]
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  GROUP / VARIABLE
                                </span>

                                <strong>
                                  {formatVariableName(
                                    groupColumn ||
                                      item.column_b ||
                                      result
                                        ?.columns?.[1]
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  METHOD
                                </span>

                                <strong>
                                  {getTestName(
                                    result
                                  )}
                                </strong>
                              </div>
                            </div>

                            {result.test ===
                            "thematic_analysis" ? (
                              <QualitativeResult
                                result={result}
                                item={item}
                              />
                            ) : (
                              <>
                                <ResultTable
                                  result={result}
                                />

                                {(result.test ===
                                  "anova" ||
                                  result.test ===
                                    "t_test") && (
                                  <GroupTable
                                    result={result}
                                  />
                                )}
                              </>
                            )}

                            {result.test !==
                              "thematic_analysis" && (
                              <>
                                <h5>
                                  Finding
                                </h5>

                                <p>
                                  {getResultSummary(
                                    result
                                  )}
                                </p>
                              </>
                            )}

                            {result.effect_size && (
                              <p>
                                Effect size:{" "}
                                {typeof result.effect_size ===
                                "object"
                                  ? JSON.stringify(
                                      result.effect_size
                                    )
                                  : formatNumber(
                                      result.effect_size,
                                      3
                                    )}
                              </p>
                            )}

                            {result.warning && (
                              <div className="chapter-warning">
                                <strong>
                                  Interpretation
                                  caution
                                </strong>

                                <p>
                                  {
                                    result.warning
                                  }
                                </p>
                              </div>
                            )}

                            {result.assumptions && (
                              <div className="chapter-assumptions">
                                <h5>
                                  Assumption Checks
                                </h5>

                                <div className="chapter-result-table-wrap">
                                  <table className="chapter-result-table">
                                    <thead>
                                      <tr>
                                        <th>
                                          Assumption
                                        </th>

                                        <th>
                                          Result
                                        </th>

                                        <th>
                                          Status
                                        </th>
                                      </tr>
                                    </thead>

                                    <tbody>

                                      {result.assumptions
                                        ?.normality && (
                                        <tr>
                                          <td>
                                            Normality
                                          </td>

                                          <td>
                                            {typeof result
                                              .assumptions
                                              .normality ===
                                            "object"
                                              ? JSON.stringify(
                                                  result
                                                    .assumptions
                                                    .normality
                                                )
                                              : String(
                                                  result
                                                    .assumptions
                                                    .normality
                                                )}
                                          </td>

                                          <td>
                                            —
                                          </td>
                                        </tr>
                                      )}

                                      {result.assumptions
                                        ?.variance && (
                                        <tr>
                                          <td>
                                            Equal variance
                                          </td>

                                          <td>
                                            {typeof result
                                              .assumptions
                                              .variance ===
                                            "object"
                                              ? JSON.stringify(
                                                  result
                                                    .assumptions
                                                    .variance
                                                )
                                              : String(
                                                  result
                                                    .assumptions
                                                    .variance
                                                )}
                                          </td>

                                          <td>
                                            —
                                          </td>
                                        </tr>
                                      )}

                                      {result.assumptions
                                        ?.shapiro_min_p !==
                                        undefined && (
                                        <tr>
                                          <td>
                                            Normality
                                          </td>

                                          <td>
                                            p ={" "}
                                            {formatNumber(
                                              result
                                                .assumptions
                                                .shapiro_min_p,
                                              4
                                            )}
                                          </td>

                                          <td>
                                            {Number(
                                              result
                                                .assumptions
                                                .shapiro_min_p
                                            ) >
                                            0.05
                                              ? "Met"
                                              : "Not met"}
                                          </td>
                                        </tr>
                                      )}

                                      {result.assumptions
                                        ?.levene_p !==
                                        undefined && (
                                        <tr>
                                          <td>
                                            Equal variance
                                          </td>

                                          <td>
                                            p ={" "}
                                            {formatNumber(
                                              result
                                                .assumptions
                                                .levene_p,
                                              4
                                            )}
                                          </td>

                                          <td>
                                            {Number(
                                              result
                                                .assumptions
                                                .levene_p
                                            ) >
                                            0.05
                                              ? "Met"
                                              : "Not met"}
                                          </td>
                                        </tr>
                                      )}

                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            <h5>
                              Statistical Decision
                            </h5>

                            <p>
                              {getDecision(
                                result
                              ) ===
                              "Significant"
                                ? "The null hypothesis is rejected at the 5% significance level."
                                : getDecision(
                                    result
                                  ) ===
                                  "Not significant"
                                ? "The null hypothesis is not rejected at the 5% significance level."
                                : "No formal statistical decision was available for this analysis."}
                            </p>

                          </div>
                        );
                      }
                    )}

                  </div>
                )
              )
            )}
          </section>

          {/* =================================================
              4.3 RESEARCH OBJECTIVES
              ================================================= */}

          <section
            id="chapter-objectives"
            className="chapter-section"
          >
            <h4>
              4.3 Research Objectives
            </h4>

            <p>
              The study was guided by the
              following research objectives:
            </p>

            {objectives.length > 0 ? (
              <ol className="chapter-objectives-list">
                {objectives.map(
                  (objective, index) => {
                    const group =
                      objectiveGroups.find(
                        (item) =>
                          item.id ===
                          index + 1
                      );

                    return (
                      <li
                        key={index}
                      >
                        <strong>
                          Objective{" "}
                          {index + 1}
                        </strong>

                        <span>
                          {objective}
                        </span>

                        {group &&
                          group.results.length >
                            0 && (
                            <small>
                              {
                                group.results
                                  .length
                              }{" "}
                              completed{" "}
                              {group.results
                                .length ===
                              1
                                ? "analysis"
                                : "analyses"}
                            </small>
                          )}
                      </li>
                    );
                  }
                )}
              </ol>
            ) : (
              <p>
                No research objectives were
                recorded for this project.
              </p>
            )}
          </section>

          {/* =================================================
              4.4 HYPOTHESIS TESTING
              ================================================= */}

          <section
            id="chapter-hypothesis"
            className="chapter-section"
          >
            <h4>
              4.4 Hypothesis Testing
            </h4>

            <p>
              The inferential analyses were
              evaluated at the conventional 5%
              significance level. The decisions
              below are based on the p-values
              obtained from the completed
              statistical analyses.
            </p>

            {completedResults.length >
            0 ? (
              <div className="hypothesis-summary">

                {objectiveGroups.map(
                  (group) => (
                    <div
                      key={`hypothesis-group-${group.id}`}
                      className="hypothesis-group"
                    >
                      <div className="hypothesis-group-title">
                        Objective{" "}
                        {group.id}
                      </div>

                      {group.results.map(
                        (
                          item,
                          index
                        ) => {
                          const result =
                            item.result;

                          return (
                            <div
                              className="hypothesis-row"
                              key={
                                item.analysis_id ||
                                item.id ||
                                `hypothesis-${group.id}-${index}`
                              }
                            >
                              <div>
                                <strong>
                                  Analysis{" "}
                                  {group.id}.
                                  {index +
                                    1}
                                </strong>

                                <span>
                                  {getTestName(
                                    result
                                  )}
                                </span>
                              </div>

                              <div
                                className={
                                  getDecision(
                                    result
                                  ) ===
                                  "Significant"
                                    ? "decision significant"
                                    : "decision"
                                }
                              >
                                {getDecision(
                                  result
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )
                )}

              </div>
            ) : (
              <p>
                No completed inferential analyses
                were available for formal hypothesis
                decisions.
              </p>
            )}
          </section>

          {/* =================================================
              4.5 SUMMARY
              ================================================= */}

          <section
            id="chapter-summary"
            className="chapter-section"
          >
            <h4>
              4.5 Summary of Findings
            </h4>

            <p>
              The analysis produced{" "}
              <strong>
                {completedObjectiveCount}
              </strong>{" "}
              research objective
              {completedObjectiveCount === 1
                ? ""
                : "s"}{" "}
              with{" "}
              <strong>
                {completedAnalysisCount}
              </strong>{" "}
              completed statistical{" "}
              {completedAnalysisCount === 1
                ? "analysis"
                : "analyses"}.
            </p>

            {objectiveGroups
              .filter(
                (group) =>
                  group.results.length > 0
              )
              .map((group) => (
                <div
                  key={`summary-${group.id}`}
                  className="hypothesis-summary"
                >
                  <div className="hypothesis-row">
                    <div>
                      <strong>
                        Objective{" "}
                        {group.id}
                      </strong>

                      <span>
                        {group.objective}
                      </span>
                    </div>

                    <div className="decision">
                      {
                        group.results
                          .length
                      }{" "}
                      {group.results
                        .length === 1
                        ? "analysis"
                        : "analyses"}
                    </div>
                  </div>
                </div>
              ))}

            <p>
              The findings presented in this
              chapter form the basis for the
              discussion and conclusions of the
              study. Statistical significance
              should be considered alongside effect
              size, assumptions, sample size and the
              overall research design.
            </p>

            {descriptives?.numeric?.length >
              0 && (
              <>
                <h5>
                  Descriptive Statistics
                </h5>

                <div className="chapter-result-table-wrap">
                  <table className="chapter-result-table">
                    <thead>
                      <tr>
                        <th>
                          Variable
                        </th>

                        <th>
                          N
                        </th>

                        <th>
                          Mean
                        </th>

                        <th>
                          SD
                        </th>

                        <th>
                          Median
                        </th>

                        <th>
                          Min
                        </th>

                        <th>
                          Max
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {descriptives.numeric.map(
                        (item) => (
                          <tr
                            key={
                              item.name
                            }
                          >
                            <td>
                              {formatVariableName(
                                item.name
                              )}
                            </td>

                            <td>
                              {item.n ??
                                "—"}
                            </td>

                            <td>
                              {formatNumber(
                                item.mean,
                                2
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.std,
                                2
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.median,
                                2
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.min,
                                2
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.max,
                                2
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

          </section>

        </article>
      </div>

      {/* =================================================
          BOTTOM ACTIONS
          ================================================= */}

      <div className="chapter4-bottom">

        <button
          className="btn btn-secondary"
          onClick={onBack}
          type="button"
        >
          ← Back to Analysis
        </button>

        <button
          className="btn btn-primary btn-large"
          onClick={onDownload}
          disabled={loading}
          type="button"
        >
          {loading
            ? "Preparing document…"
            : "Download editable Chapter 4 .docx"}
        </button>

      </div>

    </div>
  );
}