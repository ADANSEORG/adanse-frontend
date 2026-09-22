import { useMemo, useState } from "react";
import { toFixedHalfEven } from "./chapter4/resultsTransform.js";
import CreditActionButton from "./CreditActionButton.jsx";
import QualitativeReview from "./QualitativeReview.jsx";
import {
  isRegressionAnalysis,
  buildPairwiseOverridePayload,
  buildRegressionOverridePayload,
  hasStaleResults,
} from "../analysisOverride.js";
import { chapter4AffordabilityWarning } from "../qualitativeFinalizePolling.js";

const TEST_NAMES = {
  distribution: "Descriptive distribution",
  correlation: "Pearson correlation",
  cross_tab: "Chi-square test of association",
  t_test: "Welch independent-samples t-test",
  anova: "One-way ANOVA",
  thematic_analysis: "Thematic analysis",
};

function pretty(name) {
  if (!name) return "";
  return String(name).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function number(value, digits = 3) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? toFixedHalfEven(n, digits) : String(value);
}

function PValue({ value, formatted }) {
  return <>{formatted || (value == null ? "—" : number(value, 4))}</>;
}

function QuantitativeResult({ result }) {
  const test = result?.test;
  if (test === "distribution") {
    return (
      <div className="analysis-detail-grid">
        <div><span>N</span><strong>{result.n ?? "—"}</strong></div>
        <div><span>Mean</span><strong>{number(result.mean)}</strong></div>
        <div><span>SD</span><strong>{number(result.std)}</strong></div>
        <div><span>Median</span><strong>{number(result.median)}</strong></div>
      </div>
    );
  }
  return (
    <div className="analysis-detail-grid">
      <div><span>Statistic</span><strong>
        {test === "correlation" ? `r = ${number(result.r)}` :
         test === "cross_tab" ? `χ² = ${number(result.chi2)}` :
         test === "t_test" ? `t(${number(result.df, 1)}) = ${number(result.t_statistic)}` :
         test === "anova" ? `F = ${number(result.f_statistic)}` :
         test === "regression" ? `F(${result.df_model}, ${result.df_resid}) = ${number(result.f_statistic)}` : "—"}
      </strong></div>
      <div><span>p-value</span><strong><PValue value={result.p_value} formatted={result.p_value_formatted} /></strong></div>
      {result.n != null && <div><span>Observations</span><strong>{result.n}</strong></div>}
      {test === "regression" && result.r_squared != null && (
        <div><span>R²</span><strong>{number(result.r_squared)}</strong></div>
      )}
      {test === "regression" && result.adj_r_squared != null && (
        <div><span>Adjusted R²</span><strong>{number(result.adj_r_squared)}</strong></div>
      )}
      {result.effect_size != null && (
        <div>
          <span>Effect size</span>
          <strong>
            {typeof result.effect_size === "object"
              ? `${pretty(result.effect_size.metric || "")} = ${number(result.effect_size.value)}${
                  result.effect_size.label ? ` (${result.effect_size.label})` : ""
                }`
              : number(result.effect_size)}
          </strong>
        </div>
      )}
    </div>
  );
}

function QualitativeResult({ result }) {
  return (
    <div className="qualitative-results">
      <div className="analysis-detail-grid">
        <div><span>Usable responses</span><strong>{result.n_responses ?? "—"}</strong></div>
        <div><span>Method</span><strong>Thematic analysis</strong></div>
      </div>
      {(result.themes || []).map((theme, index) => (
        <article className="theme-card" key={`${theme.theme}-${index}`}>
          <div className="theme-header">
            <div><h5>{theme.theme}</h5><p>{theme.description}</p></div>
            <span>{theme.response_count ?? 0} · {number(theme.percentage, 1)}%</span>
          </div>
          {theme.excerpts?.length > 0 && (
            <div className="theme-excerpts">
              <small>Representative responses</small>
              {theme.excerpts.slice(0, 3).map((quote, i) => <blockquote key={i}>“{quote}”</blockquote>)}
            </div>
          )}
        </article>
      ))}
      <p className="analysis-verification">{result.verification}</p>
    </div>
  );
}

function QualitativeDataSelector({ detectedColumns, selectedColumns, columnObjectives, objectives, onConfirm, loading }) {
  const [checked, setChecked] = useState(() =>
    new Set(selectedColumns && selectedColumns.length ? selectedColumns : detectedColumns)
  );
  const [tags, setTags] = useState(() => {
    const initial = {};
    detectedColumns.forEach((column) => {
      initial[column] = new Set((columnObjectives?.[column] || []).map(Number));
    });
    return initial;
  });
  const confirmed = Array.isArray(selectedColumns);

  const toggleColumn = (column) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(column)) next.delete(column);
      else next.add(column);
      return next;
    });
  };

  const toggleTag = (column, objectiveId) => {
    setTags((prev) => {
      const current = new Set(prev[column] || []);
      if (current.has(objectiveId)) current.delete(objectiveId);
      else current.add(objectiveId);
      return { ...prev, [column]: current };
    });
  };

  const handleConfirm = () => {
    const columns = Array.from(checked);
    const payloadTags = {};
    columns.forEach((column) => {
      const ids = Array.from(tags[column] || []);
      if (ids.length > 0) payloadTags[column] = ids;
    });
    onConfirm(columns, payloadTags);
  };

  return (
    <section className="objective-analysis-section qualitative-data-selector">
      <div className="objective-heading">
        <span>QUALITATIVE DATA</span>
        <h2>Which open-ended responses should Adanse analyse?</h2>
      </div>
      <p className="analysis-reasoning">
        Adanse detected {detectedColumns.length} open-ended column{detectedColumns.length === 1 ? "" : "s"} in your
        dataset. Select the ones you want analysed through reflexive thematic analysis — this is a choice about
        which qualitative data to analyse, not about assigning a column to a specific objective. Your research
        objectives stay available as background context once analysis runs.
      </p>
      <div className="dataset-variable-list">
        {detectedColumns.map((column) => (
          <div className="dataset-variable-row qualitative-column-row" key={column}>
            <label className="dataset-grouping-checkbox">
              <input
                type="checkbox"
                checked={checked.has(column)}
                onChange={() => toggleColumn(column)}
                disabled={loading}
              />
              {pretty(column)}
            </label>
            {checked.has(column) && objectives.length > 0 && (
              <div className="qualitative-column-objective-tags">
                <span className="qualitative-tag-label">Informs (optional):</span>
                {objectives.map((objective) => (
                  <label className="qualitative-tag-checkbox" key={objective.id}>
                    <input
                      type="checkbox"
                      checked={(tags[column] || new Set()).has(objective.id)}
                      onChange={() => toggleTag(column, objective.id)}
                      disabled={loading}
                    />
                    Objective {objective.id}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="analysis-reasoning">
        Tagging a column to an objective is optional. It tells Adanse which objective(s) that open-ended data was
        designed to inform — Chapter 4 uses this to relate specific themes to specific objectives. Untagged columns
        are still analysed in full; their themes appear as general qualitative findings without objective
        attribution.
      </p>
      <div className="analysis-action-bar">
        <div>
          <strong>{checked.size} of {detectedColumns.length} columns selected</strong>
          <span>
            {confirmed
              ? "Selection confirmed. Re-confirm below if you change it before running analysis."
              : "Confirm your selection to continue to Run analysis."}
          </span>
        </div>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? "Saving…" : confirmed ? "Update selection" : "Confirm qualitative data →"}
        </button>
      </div>
    </section>
  );
}

function QualitativeAnalysisSection({ qualitativeResults, conversationId, onQualitativeFinalized, credits, onBuyCredits }) {
  if (!qualitativeResults || qualitativeResults.length === 0) return null;

  return (
    <section className="objective-analysis-section">
      <div className="objective-heading">
        <span>QUALITATIVE ANALYSIS</span>
        <h2>Thematic analysis of your selected open-ended responses</h2>
      </div>
      <div className="analysis-list">
        {qualitativeResults.map((entry) => (
          <article className="analysis-result-card" key={entry.column}>
            <div className="analysis-result-top">
              <div>
                <div className="analysis-result-kicker">{entry.status === "complete" ? "ANALYSIS RESULT" : "PLANNED ANALYSIS"}</div>
                <h4>Thematic analysis — {pretty(entry.column)}</h4>
              </div>
              <span className={`analysis-status ${entry.status === "complete" ? "complete" : "review"}`}>
                {entry.status === "complete" ? "Complete" : "Needs review"}
              </span>
            </div>
            {entry.status === "complete" && entry.result ? (
              <QualitativeResult result={entry.result} />
            ) : (
              <QualitativeReview
                conversationId={conversationId}
                column={entry.column}
                onFinalized={(outcome) => onQualitativeFinalized?.(outcome)}
                credits={credits}
                onBuyCredits={onBuyCredits}
              />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function AnalysisCard({ item, objectiveId, numericColumns, categoricalColumns, onOverride, conversationId, onQualitativeFinalized, credits, onBuyCredits }) {
  const result = item?.result;
  const method = result?.test || item?.test;
  const name = TEST_NAMES[method] || item?.method || item?.test_name || "Analysis";
  const columns = result?.columns || item?.columns || (item?.column ? [item.column] : []);
  const complete = item?.status === "complete" && result;
  const needsQualitativeReview = item?.status === "needs_review" && !result && columns.length > 0;
  const lowConfidence = item?.confidence === "low";
  const stale = item?.stale === true;
  // Overriding variables is a quantitative-pair/regression concept --
  // there's nothing to swap for open-ended thematic analysis, which the
  // separate qualitative data-source selector already governs.
  const canChangeVariables = Boolean(objectiveId) && method !== "thematic_analysis" && !needsQualitativeReview;

  return (
    <article className={`analysis-result-card ${complete ? "" : "planned"}`}>
      <div className="analysis-result-top">
        <div>
          <div className="analysis-result-kicker">{complete ? "ANALYSIS RESULT" : "PLANNED ANALYSIS"}</div>
          <h4>{name}</h4>
        </div>
        <span className={`analysis-status ${complete ? "complete" : "review"}`}>{complete ? "Complete" : "Needs review"}</span>
      </div>
      {columns.length > 0 && <div className="analysis-variable-pair">{columns.map(pretty).join(" × ")}</div>}
      {!needsQualitativeReview && (
        <p className="analysis-reasoning">{item?.reasoning || item?.error || "Selected from the structure of the uploaded dataset."}</p>
      )}
      {lowConfidence && (
        <div className="analysis-warning">
          <strong>Low confidence</strong>
          <span>{item.review_reason || "Adanse could not confidently match this objective to dataset variables."}</span>
        </div>
      )}
      {stale && (
        <div className="analysis-warning analysis-warning-stale">
          <strong>Results out of date</strong>
          <span>These variables were changed after this result was computed. Run analysis again to update it.</span>
        </div>
      )}
      {complete && (result.test === "thematic_analysis" ? <QualitativeResult result={result} /> : <QuantitativeResult result={result} />)}
      {needsQualitativeReview && (
        <QualitativeReview
          conversationId={conversationId}
          column={columns[0]}
          onFinalized={(updatedItem) => onQualitativeFinalized?.(updatedItem)}
          credits={credits}
          onBuyCredits={onBuyCredits}
        />
      )}
      {result?.interpretation && <div className="analysis-result-section"><h5>Interpretation</h5><p>{result.interpretation}</p></div>}
      {item?.error && <div className="analysis-warning"><strong>Review</strong><span>{item.error}</span></div>}
      {canChangeVariables && (
        <ChangeVariablesControl
          objectiveId={objectiveId}
          isRegression={isRegressionAnalysis([item])}
          numericColumns={numericColumns}
          categoricalColumns={categoricalColumns}
          onOverride={onOverride}
        />
      )}
    </article>
  );
}

// A toggle -- "Change variables" -- available on every objective's
// analysis card, whether it's a fresh plan-time pick, a low-confidence
// one flagged for review, or an already-computed (possibly now stale)
// result. Expanding it shows the two-variable dropdown form, or, for a
// regression, the predictor multi-select + outcome dropdown; submitting
// calls the server-side override (validated against the dataset and
// select_test()'s own type rules) and collapses back.
function ChangeVariablesControl({ objectiveId, isRegression, numericColumns, categoricalColumns, onOverride }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleOverride = async (targetObjectiveId, payload) => {
    setSaving(true);
    try {
      await onOverride?.(targetObjectiveId, payload);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-tertiary analysis-change-variables-toggle"
        onClick={() => setOpen(true)}
      >
        Change variables
      </button>
    );
  }

  return (
    <div className="analysis-override-wrapper">
      {isRegression ? (
        <RegressionOverrideForm
          objectiveId={objectiveId}
          numericColumns={numericColumns}
          onOverride={handleOverride}
          loading={saving}
        />
      ) : (
        <AnalysisOverrideForm
          objectiveId={objectiveId}
          numericColumns={numericColumns}
          categoricalColumns={categoricalColumns}
          onOverride={handleOverride}
          loading={saving}
        />
      )}
      <button
        type="button"
        className="btn btn-tertiary"
        onClick={() => setOpen(false)}
        disabled={saving}
      >
        Cancel
      </button>
    </div>
  );
}

function AnalysisOverrideForm({ objectiveId, numericColumns, categoricalColumns, onOverride, loading }) {
  const allColumns = useMemo(
    () => [...numericColumns, ...categoricalColumns],
    [numericColumns, categoricalColumns]
  );
  const [columnA, setColumnA] = useState("");
  const [columnB, setColumnB] = useState("");

  const payload = buildPairwiseOverridePayload(columnA, columnB);

  const handleSubmit = () => {
    if (!payload) return;
    onOverride?.(objectiveId, payload);
  };

  return (
    <div className="analysis-override-form">
      <p className="analysis-reasoning">Choose the two variables this objective should be analysed with:</p>
      <div className="analysis-override-fields">
        <label className="analysis-override-field">
          <span>Variable A</span>
          <select value={columnA} onChange={(e) => setColumnA(e.target.value)} disabled={loading}>
            <option value="">Select a variable…</option>
            {allColumns.map((c) => (
              <option key={c} value={c}>{pretty(c)}</option>
            ))}
          </select>
        </label>
        <label className="analysis-override-field">
          <span>Variable B</span>
          <select value={columnB} onChange={(e) => setColumnB(e.target.value)} disabled={loading}>
            <option value="">Select a variable…</option>
            {allColumns.map((c) => (
              <option key={c} value={c}>{pretty(c)}</option>
            ))}
          </select>
        </label>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={handleSubmit}
          disabled={loading || !payload}
        >
          {loading ? "Saving…" : "Use these variables →"}
        </button>
      </div>
    </div>
  );
}

// Multiple regression needs a predictor LIST (2+) plus a single outcome
// -- a different shape from the two-dropdown pairwise form. Only numeric
// columns are offered: regression requires numeric variables on both
// sides, same as the server validates.
function RegressionOverrideForm({ objectiveId, numericColumns, onOverride, loading }) {
  const [dependentColumn, setDependentColumn] = useState("");
  const [predictors, setPredictors] = useState(() => new Set());

  const togglePredictor = (column) => {
    setPredictors((prev) => {
      const next = new Set(prev);
      if (next.has(column)) next.delete(column);
      else next.add(column);
      return next;
    });
  };

  const predictorList = Array.from(predictors);
  const payload = buildRegressionOverridePayload(dependentColumn, predictorList);

  const handleSubmit = () => {
    if (!payload) return;
    onOverride?.(objectiveId, payload);
  };

  return (
    <div className="analysis-override-form">
      <p className="analysis-reasoning">
        Choose the outcome variable and at least two predictor variables for this regression:
      </p>
      <div className="analysis-override-fields">
        <label className="analysis-override-field">
          <span>Outcome variable</span>
          <select value={dependentColumn} onChange={(e) => setDependentColumn(e.target.value)} disabled={loading}>
            <option value="">Select a variable…</option>
            {numericColumns.map((c) => (
              <option key={c} value={c} disabled={predictors.has(c)}>{pretty(c)}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="analysis-override-predictors">
        <span className="analysis-override-predictors-label">Predictor variables (choose 2 or more):</span>
        <div className="analysis-override-predictor-list">
          {numericColumns.map((c) => (
            <label key={c} className="analysis-override-predictor-checkbox">
              <input
                type="checkbox"
                checked={predictors.has(c)}
                disabled={loading || c === dependentColumn}
                onChange={() => togglePredictor(c)}
              />
              {pretty(c)}
            </label>
          ))}
        </div>
      </div>
      <button
        className="btn btn-secondary"
        type="button"
        onClick={handleSubmit}
        disabled={loading || !payload}
      >
        {loading ? "Saving…" : "Use these variables →"}
      </button>
    </div>
  );
}

export default function ThesisWorkspace({ project, upload, plan, analysis, onBuildPlan, onRun, onConfirmQualitativeColumns, onOverrideAnalysis, onContinueChapter4, onQualitativeFinalized, loading, credits, costs, onBuyCredits, conversationId }) {
  const objectives = useMemo(() => plan?.items || [], [plan]);
  const datasetType = analysis?.dataset_type || plan?.dataset_type;
  const summary = analysis?.dataset_summary || plan?.dataset_summary || {};
  const hasResults =
    (analysis?.objective_results || []).length > 0 ||
    (analysis?.results || []).length > 0 ||
    (analysis?.qualitative_results || []).length > 0;

  const detectedQualitativeColumns = plan?.qualitative?.detected_columns || [];
  const selectedQualitativeColumns = plan?.qualitative?.selected_columns ?? null;
  const qualitativeConfirmed = Array.isArray(selectedQualitativeColumns);
  const qualitativeSelectionPending = detectedQualitativeColumns.length > 0 && !qualitativeConfirmed;

  return (
    <section>
      <div className="workspace-intro">
        <div>
          <div className="section-kicker">03 · ANALYSIS</div>
          <h1>Let the dataset tell us how to analyse it.</h1>
          <p>Adanse first identifies numeric, categorical and open-text data. Your research objectives then determine which supported analyses are relevant.</p>
        </div>
      </div>

      {plan ? (
        <div className="dataset-analysis-summary">
          <div><span>Dataset type</span><strong>{pretty(datasetType || "quantitative")}</strong></div>
          <div><span>Rows</span><strong>{(upload?.rows || project?.dataset_rows || summary.rows || 0).toLocaleString()}</strong></div>
          <div><span>Numeric</span><strong>{summary.numeric_columns?.length ?? 0}</strong></div>
          <div><span>Categories</span><strong>{summary.categorical_columns?.length ?? 0}</strong></div>
          <div><span>Open text</span><strong>{summary.open_text_columns?.length ?? 0}</strong></div>
        </div>
      ) : null}

      {!plan && (
        <div className="analysis-empty-state">
          <h2>Ready to understand your dataset.</h2>
          <p>Build the analysis plan. No discipline or fixed research template is assumed; the uploaded columns are inspected first.</p>
          <button className="btn btn-primary" onClick={onBuildPlan} disabled={loading}>{loading ? "Understanding dataset…" : "Understand dataset →"}</button>
        </div>
      )}

      {plan && !hasResults && objectives.map((objective) => {
        const needsReview = objective.status === "review";
        return (
          <section className="objective-analysis-section" key={objective.id}>
            <div className="objective-heading">
              <span>OBJECTIVE {objective.id}</span>
              <h2>{objective.objective}</h2>
              {objective.status && (
                <span className={`analysis-status ${needsReview ? "review" : "complete"}`}>
                  {needsReview ? "Needs review" : "Ready"}
                </span>
              )}
            </div>
            <p className="analysis-reasoning">{objective.reasoning}</p>
            <div className="analysis-list">
              {(objective.analyses || []).map((item) => (
                <AnalysisCard
                  key={item.id}
                  item={item}
                  objectiveId={objective.id}
                  numericColumns={summary.numeric_columns || []}
                  categoricalColumns={summary.categorical_columns || []}
                  onOverride={onOverrideAnalysis}
                />
              ))}
            </div>
            {objective.expresses_qualitative_intent && (objective.analyses || []).length === 0 && (
              <p className="analysis-reasoning">
                This objective has a qualitative dimension. It will be informed by whichever open-ended responses you
                select below, once analysed — no column is assigned to it in advance.
              </p>
            )}
          </section>
        );
      })}

      {plan && !hasResults && detectedQualitativeColumns.length > 0 && (
        <QualitativeDataSelector
          detectedColumns={detectedQualitativeColumns}
          selectedColumns={selectedQualitativeColumns}
          columnObjectives={plan?.qualitative?.column_objectives}
          objectives={objectives}
          onConfirm={onConfirmQualitativeColumns}
          loading={loading}
        />
      )}

      {plan && !hasResults && (
        <div className="analysis-action-bar">
          <div>
            <strong>{objectives.reduce((n, x) => n + (x.analyses?.length || 0), 0)} data-supported analyses planned</strong>
            <span>
              {qualitativeSelectionPending
                ? "Confirm your qualitative data sources above before running analysis."
                : "Quantitative and qualitative methods can coexist when the CSV supports both."}
            </span>
          </div>
          <CreditActionButton
            label="Run analysis →"
            confirmLabel="Confirm — run analysis →"
            loadingLabel="Analysing…"
            cost={costs?.analysis}
            balance={credits}
            loading={loading}
            onConfirm={onRun}
            onBuyCredits={onBuyCredits}
            disabled={qualitativeSelectionPending}
          />
        </div>
      )}

      {hasResults && hasStaleResults(analysis) && (
        <div className="analysis-warning analysis-warning-stale analysis-warning-page">
          <strong>Results out of date</strong>
          <span>
            One or more objectives' variables were changed since analysis last ran. Run analysis again to update
            every result before generating Chapter 4.
          </span>
        </div>
      )}

      {hasResults && (analysis?.objective_results || []).map((objective) => (
        <section className="objective-analysis-section" key={objective.id}>
          <div className="objective-heading"><span>OBJECTIVE {objective.id}</span><h2>{objective.objective}</h2></div>
          <div className="analysis-list">
            {(objective.analyses || []).map((item) => (
              <AnalysisCard
                key={item.id}
                item={item}
                objectiveId={objective.id}
                numericColumns={summary.numeric_columns || []}
                categoricalColumns={summary.categorical_columns || []}
                onOverride={onOverrideAnalysis}
                conversationId={conversationId}
                onQualitativeFinalized={onQualitativeFinalized}
                credits={credits}
                onBuyCredits={onBuyCredits}
              />
            ))}
          </div>
        </section>
      ))}

      {hasResults && (
        <QualitativeAnalysisSection
          qualitativeResults={analysis?.qualitative_results}
          conversationId={conversationId}
          onQualitativeFinalized={onQualitativeFinalized}
          credits={credits}
          onBuyCredits={onBuyCredits}
        />
      )}

      {hasResults && (() => {
        const pendingReview =
          (analysis?.objective_results || []).some((objective) =>
            (objective.analyses || []).some((item) => item.status === "needs_review")
          ) ||
          (analysis?.qualitative_results || []).some((entry) => entry.status === "needs_review");
        const stale = hasStaleResults(analysis);
        const blocked = pendingReview || stale;
        let message = "Review the findings above, then generate Chapter 4.";
        let heading = "Analysis complete.";
        if (pendingReview) {
          heading = "Finish reviewing themes above.";
          message = "Chapter 4 can't be generated until every qualitative data source's themes are finalized.";
        } else if (stale) {
          heading = "Results out of date.";
          message = "Run analysis again to update the variables you changed before generating Chapter 4.";
        }

        // Not a block -- Chapter4.jsx's own CreditActionButton is what
        // actually gates the download. This is an earlier, plainer heads
        // up shown right where the researcher just finished finalizing,
        // rather than only discovered as a confusing error after they've
        // already clicked through to Chapter 4.
        const affordabilityNotice = !blocked ? chapter4AffordabilityWarning(credits, costs) : null;

        return (
          <div className="analysis-action-bar">
            <div>
              <strong>{heading}</strong>
              <span>{message}</span>
              {affordabilityNotice && (
                <span className="credit-action-insufficient">{affordabilityNotice}</span>
              )}
            </div>
            <button className="btn btn-primary" onClick={onContinueChapter4} disabled={blocked}>
              Continue to Chapter 4 →
            </button>
          </div>
        );
      })()}
    </section>
  );
}
