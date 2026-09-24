import { useEffect, useMemo, useState } from "react";
import CreditActionButton from "./CreditActionButton.jsx";
import { hasStaleResults } from "../analysisOverride.js";
import {
  formatVariableName,
  formatNumber,
  getTestName,
  getFrequencyRows,
  getStatistic,
  getPValue,
  getDecision,
  getResultSummary,
  getNumericColumn,
  getGroupColumn,
  getGroups,
  normaliseResults,
  describeCleaningActions,
  describeRemainingIssues,
  respondentProfileNarrative,
  objectiveInterpretationSentence,
  objectiveRecapSentence,
  collectQualitativeFindings,
  columnsTaggedToObjective,
  objectivesTaggedToColumn,
  themeSummariesFromColumns,
  themeSummarySentence,
  qualitativeObjectiveParagraph,
  evidenceGroundedThemeRelationships,
  guardPrevalenceLanguage,
  joinAnd,
  objectiveHasQualitativeRelevance,
  isQualitativeOnlyProject,
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
                    ? `${formatNumber(theme.percentage, 1)}%`
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
          <strong>&ldquo;{column}&rdquo;</strong>.
        </p>
      )}

      {themes.map((theme, index) => {
        // Guarded with this theme's own stored response_count/percentage
        // -- e.g. a theme with response_count=1 can't read "repeatedly
        // described" or "the majority of respondents" here, mirroring
        // generate_chapter()'s docx rendering exactly.
        const narrative = guardPrevalenceLanguage(
          String(theme?.narrative || "").trim(),
          Number(theme?.response_count) || 0,
          Number(theme?.percentage) || 0
        );

        return (
          <div
            key={`theme-detail-${theme?.theme || "theme"}-${index}`}
            className="chapter-qualitative-theme"
          >
            <h6>{theme?.theme || "Theme"}</h6>

            {theme?.description && (
              <p>{theme.description}</p>
            )}

            {narrative &&
              narrative.split(/\n\s*\n/).map((paragraph, paraIndex) => {
                const trimmed = paragraph.trim();
                return trimmed ? (
                  <p key={`narrative-${index}-${paraIndex}`}>{trimmed}</p>
                ) : null;
              })}

            {Array.isArray(theme?.excerpts) &&
              theme.excerpts.length > 0 && (
                <div>
                  <strong>Representative responses</strong>
                  {theme.excerpts.slice(0, 3).map((quote, quoteIndex) => (
                    <blockquote
                      key={`quote-${index}-${quoteIndex}`}
                    >
                      “{quote}”
                    </blockquote>
                  ))}
                </div>
              )}
          </div>
        );
      })}

      {result.warning && (
        <div className="chapter-warning">
          <strong>Interpretation caution</strong>
          <p>{result.warning}</p>
        </div>
      )}
    </div>
  );
}

function ResultTable({ result, item }) {
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
            <td>{getTestName(result, item)}</td>
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

function FrequencyTable({ result }) {
  const rows = getFrequencyRows(result);
  if (rows.length === 0) return null;

  return (
    <div className="chapter-result-table-wrap">
      <table className="chapter-result-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Frequency</th>
            <th>Percentage</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.category} className={row.isTotal ? "frequency-total" : undefined}>
              <td>{row.category}</td>
              <td>{row.count}</td>
              <td>{row.percent}</td>
            </tr>
          ))}
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
  datasetVersion,
  onBack,
  onDownload,
  loading,
  credits,
  costs,
  onBuyCredits,
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
   * HAS HYPOTHESIS-TESTABLE RESULTS
   *
   * A distribution or thematic_analysis result never carries a p-value,
   * so it's never a formal hypothesis decision -- matches generate_chapter()'s
   * own filter for section 4.7. completedResults.length > 0 alone isn't
   * enough to decide whether 4.7 has anything to show: a project can have
   * completed results that are all non-inferential.
   * -------------------------------------------------------
   */

  const hasHypothesisResults = useMemo(() => {
    return completedResults.some(
      (item) =>
        item?.result?.p_value !== null &&
        item?.result?.p_value !== undefined
    );
  }, [completedResults]);

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
   * QUALITATIVE FINDINGS
   *
   * Sourced from analysis.qualitative_results (the flat, column-keyed
   * list -- never nested under an objective; see run_plan()/
   * finalize_qualitative_column() on the backend). columnObjectives is
   * the researcher's own declared intent (plan.qualitative.column_
   * objectives, set via select_qualitative_columns()) -- the ONLY basis
   * 4.4/4.5/4.6/4.8 use to relate a theme back to an objective. There is
   * no computed relevance score of any kind: an untagged column/objective
   * gets a shared, explicitly-unattributed synthesis instead (see
   * qualitativeObjectiveParagraph()), never a guessed match -- the same
   * approach generate_chapter() uses for the downloaded docx.
   * -------------------------------------------------------
   */

  const qualitativeFindings = useMemo(
    () => collectQualitativeFindings(analysis),
    [analysis]
  );

  const columnObjectives = plan?.qualitative?.column_objectives || {};

  /*
   * -------------------------------------------------------
   * COMPLETED OBJECTIVE COUNT
   *
   * IMPORTANT:
   *
   * 16 analyses across 4 objectives =
   * 4 objectives analysed.
   *
   * An objective also counts as addressed when it has no quantitative
   * results but IS covered by the study's thematic analysis (tagged, or
   * a qualitative-only project) -- otherwise a purely qualitative project
   * always showed "0 research objectives analysed" here even though every
   * objective was genuinely addressed. See isQualitativeOnly below for the
   * matching change to this card's and 4.8's copy.
   * -------------------------------------------------------
   */

  const completedObjectiveCount =
    objectiveGroups.filter(
      (group) =>
        group.results.length > 0 ||
        objectiveHasQualitativeRelevance(group, qualitativeFindings, columnObjectives)
    ).length;

  const completedAnalysisCount =
    completedResults.length;

  const isQualitativeOnly = isQualitativeOnlyProject(completedResults, qualitativeFindings);

  // A researcher can change an objective's variables after analysis has
  // already run (see ThesisWorkspace.jsx's "Change variables"), which
  // flags that objective's stored result stale rather than silently
  // keeping the old numbers. The backend also refuses (409) to generate
  // Chapter 4 while anything is stale -- this is the matching frontend
  // gate, not the only enforcement.
  const resultsAreStale = hasStaleResults(analysis);

  /*
   * -------------------------------------------------------
   * DESCRIPTIVES
   * -------------------------------------------------------
   */

  const descriptives =
    analysis?.descriptives || {};

  const numericDescriptives = descriptives?.numeric || [];
  const categoricalDescriptives = descriptives?.categorical || [];

  const datasetRowCount =
    upload?.dataset_rows ||
    upload?.rows ||
    project?.dataset_rows ||
    0;

  /*
   * -------------------------------------------------------
   * DATA PREPARATION NOTE
   *
   * Mirrors the "Data Preparation" line the backend adds to
   * 4.2 Data Overview, built from the same cleaning report.
   * -------------------------------------------------------
   */

  const cleaningSummary = useMemo(() => {
    if (!datasetVersion) {
      return "A cleaning and validation report was not available for the dataset version used in this analysis.";
    }

    return describeCleaningActions(
      datasetVersion?.cleaning_report?.actions_applied
    );
  }, [datasetVersion]);

  /*
   * -------------------------------------------------------
   * PROFILE OF RESPONDENTS NARRATIVE
   * -------------------------------------------------------
   */

  const respondentNarrative = useMemo(() => {
    return respondentProfileNarrative(
      categoricalDescriptives,
      numericDescriptives,
      datasetRowCount
    );
  }, [categoricalDescriptives, numericDescriptives, datasetRowCount]);

  /*
   * -------------------------------------------------------
   * DATA CLEANING & LIMITATIONS
   * -------------------------------------------------------
   */

  const remainingIssuesSummary = useMemo(() => {
    return describeRemainingIssues(
      datasetVersion?.validation_report?.remaining_review_issues
    );
  }, [datasetVersion]);

  /*
   * -------------------------------------------------------
   * CHAPTER NAVIGATION
   * -------------------------------------------------------
   */

  const sectionIds = [
    "introduction",
    "overview",
    "profile",
    "results",
    "interpretation",
    "objectives",
    "hypothesis",
    "summary",
    "cleaning",
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
            {resultsAreStale ? "RESULTS OUT OF DATE" : "READY TO EXPORT"}
          </div>

          {resultsAreStale ? (
            <>
              <strong>Some variables changed since analysis last ran.</strong>
              <p>Go back and run analysis again — the download is disabled until every result is up to date.</p>
            </>
          ) : isQualitativeOnly ? (
            <>
              <strong>
                {completedObjectiveCount} research
                objective
                {completedObjectiveCount === 1
                  ? ""
                  : "s"}{" "}
                addressed through thematic analysis
              </strong>

              <p>
                The themes identified from the
                open-ended data will be included in
                the editable Chapter 4 document.
              </p>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        <CreditActionButton
          label="Download Chapter 4 .docx"
          confirmLabel="Confirm — download Chapter 4 .docx"
          loadingLabel="Preparing document…"
          cost={costs?.chapter4}
          balance={credits}
          loading={loading}
          onConfirm={onDownload}
          onBuyCredits={onBuyCredits}
          disabled={resultsAreStale}
          className="btn btn-primary btn-large"
        />
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
              activeSection === "overview"
                ? "active"
                : ""
            }`}
            onClick={() =>
              scrollToSection("overview")
            }
          >
            4.2 Data Overview
          </button>

          <button
            type="button"
            className={`chapter4-nav-item ${
              activeSection === "profile"
                ? "active"
                : ""
            }`}
            onClick={() =>
              scrollToSection("profile")
            }
          >
            4.3 Profile of Respondents
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
            4.4 Results
          </button>

          <button
            type="button"
            className={`chapter4-nav-item ${
              activeSection ===
              "interpretation"
                ? "active"
                : ""
            }`}
            onClick={() =>
              scrollToSection(
                "interpretation"
              )
            }
          >
            4.5 Analysis and Interpretation
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
            4.6 Research Objectives
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
            4.7 Hypothesis Testing
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
            4.8 Summary of Findings
          </button>

          <button
            type="button"
            className={`chapter4-nav-item ${
              activeSection === "cleaning"
                ? "active"
                : ""
            }`}
            onClick={() =>
              scrollToSection("cleaning")
            }
          >
            4.9 Data Cleaning &amp; Limitations
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
              objectives and the{" "}
              {isQualitativeOnly
                ? "thematic analysis"
                : "statistical procedures"}{" "}
              applied to the dataset.
            </p>

            {isQualitativeOnly ? (
              <p>
                The findings reported in this chapter
                are drawn directly from the study's
                open-ended responses using reflexive
                thematic analysis. Themes, their
                definitions and supporting verbatim
                quotations are presented to support
                interpretation of the findings.
              </p>
            ) : (
              <p>
                The analyses reported in this chapter
                are calculated directly from the
                uploaded dataset. Where applicable,
                descriptive statistics, inferential
                tests, effect sizes and assumption
                checks are presented to support
                interpretation of the findings.
              </p>
            )}
          </section>

          {/* =================================================
              4.2 DATA OVERVIEW
              ================================================= */}

          <section
            id="chapter-overview"
            className="chapter-section"
          >
            <h4>
              4.2 Data Overview
            </h4>

            <p>
              The dataset contained{" "}
              {datasetRowCount.toLocaleString()}{" "}
              observations and{" "}
              {(
                upload?.dataset_columns ||
                upload?.columns ||
                []
              ).length}{" "}
              variables. The data review identified
              missing values and potential unusual
              values before inferential analysis.
              Analyses use available complete
              observations for the variables
              involved.
            </p>

            <p>
              <strong>Data Preparation: </strong>
              {cleaningSummary} Analysis conducted
              using Adanse's automated statistical
              pipeline.
            </p>

            {numericDescriptives.length > 0 && (
              <>
                <h5>
                  Table 4.1: Descriptive statistics
                  for numeric variables
                </h5>

                <div className="chapter-result-table-wrap">
                  <table className="chapter-result-table">
                    <thead>
                      <tr>
                        <th>Variable</th>
                        <th>N</th>
                        <th>Mean</th>
                        <th>SD</th>
                        <th>Median</th>
                        <th>Min</th>
                        <th>Max</th>
                      </tr>
                    </thead>

                    <tbody>
                      {numericDescriptives.map(
                        (item) => (
                          <tr key={item.name}>
                            <td>
                              {formatVariableName(
                                item.name
                              )}
                            </td>
                            <td>{item.n ?? "—"}</td>
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

          {/* =================================================
              4.3 PROFILE OF RESPONDENTS
              ================================================= */}

          {(categoricalDescriptives.length > 0 ||
            numericDescriptives.length > 0) && (
            <section
              id="chapter-profile"
              className="chapter-section"
            >
              <h4>
                4.3 Profile of Respondents
              </h4>

              {respondentNarrative && (
                <p>{respondentNarrative}</p>
              )}

              {categoricalDescriptives.length >
                0 && (
                <>
                  <h5>Categorical Distributions</h5>

                  {categoricalDescriptives.map(
                    (column) => {
                      const freqs =
                        column?.frequencies || {};
                      const entries =
                        Object.entries(freqs);
                      const totalCategories = Number(
                        column?.unique_count
                      ) || entries.length;

                      return (
                        <div
                          key={column?.name}
                          className="chapter-analysis-block"
                        >
                          <h6>
                            {formatVariableName(
                              column?.name
                            )}
                          </h6>

                          <div className="chapter-result-table-wrap">
                            <table className="chapter-result-table">
                              <thead>
                                <tr>
                                  <th>Category</th>
                                  <th>Frequency</th>
                                  <th>Percentage</th>
                                </tr>
                              </thead>

                              <tbody>
                                {entries.map(
                                  ([
                                    key,
                                    value,
                                  ]) => (
                                    <tr key={key}>
                                      <td>{key}</td>
                                      <td>
                                        {value?.count ??
                                          "—"}
                                      </td>
                                      <td>
                                        {formatNumber(
                                          value?.percent,
                                          1
                                        )}
                                        %
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>

                          {totalCategories >
                            entries.length && (
                            <p>
                              {totalCategories -
                                entries.length}{" "}
                              additional categories
                              were omitted from this
                              table for readability.
                            </p>
                          )}
                        </div>
                      );
                    }
                  )}
                </>
              )}
            </section>
          )}

          {/* =================================================
              4.4 RESULTS
              ================================================= */}

          <section
            id="chapter-results"
            className="chapter-section"
          >
            <h4>
              4.4 Results
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
                      4.4.{group.id}
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
                                  result,
                                  item
                                )}
                              </strong>{" "}
                              {result.test ===
                              "frequency"
                                ? "to describe how responses were distributed across categories."
                                : "to examine the relationship, association or difference relevant to this research objective."}
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
                                    result,
                                    item
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
                                {result.test === "frequency" ? (
                                  <FrequencyTable
                                    result={result}
                                  />
                                ) : (
                                  <ResultTable
                                    result={result}
                                    item={item}
                                  />
                                )}

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
                                            {result
                                              .assumptions
                                              .shapiro_min_p ===
                                            null
                                              ? "Not computed"
                                              : Number(
                                                  result
                                                    .assumptions
                                                    .shapiro_min_p
                                                ) > 0.05
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
                                            {result
                                              .assumptions
                                              .levene_p ===
                                            null
                                              ? "Not computed"
                                              : Number(
                                                  result
                                                    .assumptions
                                                    .levene_p
                                                ) > 0.05
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
              THEMATIC ANALYSIS FINDINGS

              Braun & Clarke thematic analysis is organised strictly by
              theme, never forced into a one-theme-per-objective structure
              -- sourced from analysis.qualitative_results, never from an
              objective's own analyses list. Mirrors generate_chapter()'s
              docx section of the same name.
              ================================================= */}

          {Object.keys(qualitativeFindings).length > 0 && (
            <section id="chapter-thematic-findings" className="chapter-section">
              <h4>Thematic Analysis Findings</h4>
              <p>
                The following themes were developed through reflexive thematic analysis (Braun &amp; Clarke, 2006).
                Themes emerged from the open-ended responses themselves and are organised by theme, not by research
                objective. Where the researcher explicitly designated an open-ended data source as informing a
                specific objective, that is noted below; no relationship between a theme and an objective is
                inferred or scored — it is only ever the researcher&rsquo;s own stated intent.
              </p>

              {Object.entries(qualitativeFindings).map(([column, result]) => {
                const taggedObjectives = objectivesTaggedToColumn(columnObjectives, column, objectiveGroups);
                return (
                  <div key={column} className="chapter-qualitative-column">
                    <h5>Themes from &ldquo;{column}&rdquo;</h5>

                    {result.warning && (
                      <div className="chapter-warning">
                        <strong>Caution</strong>
                        <p>{result.warning}</p>
                      </div>
                    )}

                    <p className="chapter-theme-interpretation">
                      {taggedObjectives.length > 0 ? (
                        <>
                          Interpretation: the researcher designated &ldquo;{column}&rdquo; as informing{" "}
                          {joinAnd(taggedObjectives.map((o) => `Objective ${o.objectiveId} ("${o.objectiveText}")`))}.
                          The themes below, drawn from this column, may support it.
                        </>
                      ) : (
                        <>
                          Interpretation: this column was not linked by the researcher to a specific research
                          objective; the themes below contribute to the study&rsquo;s broader qualitative findings.
                        </>
                      )}
                    </p>

                    <QualitativeResult result={result} />
                  </div>
                );
              })}
            </section>
          )}

          {/* =================================================
              4.5 ANALYSIS AND INTERPRETATION
              ================================================= */}

          <section
            id="chapter-interpretation"
            className="chapter-section"
          >
            <h4>
              4.5 Analysis and Interpretation
            </h4>

            <p>
              Each research objective is linked
              below to the analyses completed
              against it.
            </p>

            {objectiveGroups.map((group) => (
              <p key={`interpretation-${group.id}`}>
                {objectiveInterpretationSentence(
                  group,
                  qualitativeFindings,
                  columnObjectives
                )}
              </p>
            ))}

            {evidenceGroundedThemeRelationships(qualitativeFindings).length > 0 && (
              <>
                <p>
                  The qualitative findings also show the following relationships between themes, grounded in
                  responses from the same participant(s) appearing in more than one theme:
                </p>
                <ul>
                  {evidenceGroundedThemeRelationships(qualitativeFindings).map((rel, index) => {
                    const n = rel.sharedRespondents.length;
                    return (
                      <li key={`relationship-${index}`}>
                        Responses from {n} shared respondent{n !== 1 ? "s" : ""} appear in both &ldquo;{rel.themeA}
                        &rdquo; ({rel.columnA}) and &ldquo;{rel.themeB}&rdquo; ({rel.columnB}), suggesting these
                        patterns co-occur for at least some participants.
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>

          {/* =================================================
              4.6 RESEARCH OBJECTIVES
              ================================================= */}

          <section
            id="chapter-objectives"
            className="chapter-section"
          >
            <h4>
              4.6 Research Objectives
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
              4.7 HYPOTHESIS TESTING
              ================================================= */}

          <section
            id="chapter-hypothesis"
            className="chapter-section"
          >
            <h4>
              4.7 Hypothesis Testing
            </h4>

            {isQualitativeOnly ? (
              <p>
                Hypothesis testing does not apply to
                this qualitative study design. This
                project used reflexive thematic
                analysis rather than inferential
                statistics, so no null hypotheses
                were tested. The corresponding
                findings are reported in the
                Thematic Analysis Findings sections
                above and summarised in section 4.8.
              </p>
            ) : (
              <>
            <p>
              The inferential analyses were
              evaluated at the conventional 5%
              significance level. The decisions
              below are based on the p-values
              obtained from the completed
              statistical analyses.
            </p>

            {hasHypothesisResults ? (
              <div className="hypothesis-summary">

                {objectiveGroups.map(
                  (group) => {
                    /*
                     * Only analyses with an actual p-value are a formal
                     * hypothesis decision -- matches generate_chapter()'s
                     * own filter (`if res.get("p_value") is None: continue`),
                     * so a distribution or thematic_analysis result (which
                     * never carries a p-value) doesn't show up here with a
                     * meaningless "—" decision the way it used to. Index is
                     * kept from the unfiltered list so "Analysis X.Y" still
                     * matches the numbering used in 4.4 Results.
                     */
                    const hypothesisItems = group.results
                      .map((item, index) => ({
                        item,
                        index,
                      }))
                      .filter(
                        ({ item }) =>
                          item.result?.p_value !==
                            null &&
                          item.result?.p_value !==
                            undefined
                      );

                    if (
                      hypothesisItems.length === 0
                    ) {
                      return null;
                    }

                    return (
                      <div
                        key={`hypothesis-group-${group.id}`}
                        className="hypothesis-group"
                      >
                        <div className="hypothesis-group-title">
                          Objective{" "}
                          {group.id}
                        </div>

                        {hypothesisItems.map(
                          ({ item, index }) => {
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
                                      result,
                                      item
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
                    );
                  }
                )}

              </div>
            ) : (
              <p>
                No completed inferential analyses
                were available for formal hypothesis
                decisions.
              </p>
            )}
              </>
            )}
          </section>

          {/* =================================================
              4.8 SUMMARY
              ================================================= */}

          <section
            id="chapter-summary"
            className="chapter-section"
          >
            <h4>
              4.8 Summary of Findings
            </h4>

            {isQualitativeOnly ? (
              <p>
                <strong>
                  {completedObjectiveCount}
                </strong>{" "}
                research objective
                {completedObjectiveCount === 1
                  ? ""
                  : "s"}{" "}
                were addressed through reflexive
                thematic analysis of the study's
                open-ended data. The themes identified
                for each objective are reported in
                full, with supporting verbatim
                quotations, in the Thematic Analysis
                Findings sections above.
              </p>
            ) : (
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
            )}

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

            {(() => {
              const allThemeSummaries = themeSummariesFromColumns(qualitativeFindings, Object.keys(qualitativeFindings));
              if (allThemeSummaries.length === 0) return null;
              return (
                <p>
                  Across the qualitative data sources analysed, the following themes were identified:{" "}
                  {themeSummarySentence(allThemeSummaries)}. Collectively, these findings inform the
                  study&rsquo;s qualitative objectives; see the Thematic Analysis Findings section for the
                  full definitions, subthemes and evidence behind each theme.
                </p>
              );
            })()}

            {objectiveGroups.map((group) => (
              <p key={`recap-${group.id}`}>
                {objectiveRecapSentence(group, qualitativeFindings, columnObjectives)}
              </p>
            ))}

            <p>
              These findings are discussed in
              relation to existing literature in
              Chapter 5.
            </p>

          </section>

          {/* =================================================
              4.9 DATA CLEANING & LIMITATIONS
              ================================================= */}

          <section
            id="chapter-cleaning"
            className="chapter-section"
          >
            <h4>
              4.9 Data Cleaning &amp; Limitations
            </h4>

            {!datasetVersion ? (
              <p>
                A cleaning and validation report
                was not available for the dataset
                version used in this analysis, so
                the automated cleaning outcome
                cannot be described here.
              </p>
            ) : (
              <>
                <p>{cleaningSummary}</p>
                <p>{remainingIssuesSummary}</p>
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

        <CreditActionButton
          label="Download editable Chapter 4 .docx"
          confirmLabel="Confirm — download Chapter 4 .docx"
          loadingLabel="Preparing document…"
          cost={costs?.chapter4}
          balance={credits}
          loading={loading}
          onConfirm={onDownload}
          onBuyCredits={onBuyCredits}
          disabled={resultsAreStale}
          className="btn btn-primary btn-large"
        />

      </div>

    </div>
  );
}