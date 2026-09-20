import { useMemo, useState } from "react";
import { toFixedHalfEven } from "./chapter4/resultsTransform.js";
import CreditActionButton from "./CreditActionButton.jsx";
import QualitativeReview from "./QualitativeReview.jsx";
import { isRegressionAnalysis, buildPairwiseOverridePayload } from "../analysisOverride.js";

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
         test === "t_test" ? `t = ${number(result.t_statistic)}` :
         test === "anova" ? `F = ${number(result.f_statistic)}` : "—"}
      </strong></div>
      <div><span>p-value</span><strong><PValue value={result.p_value} formatted={result.p_value_formatted} /></strong></div>
      {result.n != null && <div><span>Observations</span><strong>{result.n}</strong></div>}
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

function QualitativeAnalysisSection({ qualitativeResults, conversationId, onQualitativeFinalized }) {
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
              />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function AnalysisCard({ item, conversationId, onQualitativeFinalized }) {
  const result = item?.result;
  const method = result?.test || item?.test;
  const name = TEST_NAMES[method] || item?.method || item?.test_name || "Analysis";
  const columns = result?.columns || item?.columns || (item?.column ? [item.column] : []);
  const complete = item?.status === "complete" && result;
  const needsQualitativeReview = item?.status === "needs_review" && !result && columns.length > 0;
  const lowConfidence = item?.confidence === "low";

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
      {complete && (result.test === "thematic_analysis" ? <QualitativeResult result={result} /> : <QuantitativeResult result={result} />)}
      {needsQualitativeReview && (
        <QualitativeReview
          conversationId={conversationId}
          column={columns[0]}
          onFinalized={(updatedItem) => onQualitativeFinalized?.(updatedItem)}
        />
      )}
      {result?.interpretation && <div className="analysis-result-section"><h5>Interpretation</h5><p>{result.interpretation}</p></div>}
      {item?.error && <div className="analysis-warning"><strong>Review</strong><span>{item.error}</span></div>}
    </article>
  );
}

// An objective's plan-time analysis picked by low-confidence lexical
// matching or an inferred abbreviation (build_plan()'s "review" status)
// isn't a dead end: the researcher can pick the variables directly here,
// which calls the server-side override (validated against the dataset
// and select_test()'s own type rules) instead of guessing further.
//
// Regression's predictor list + outcome picker is a larger control than
// a two-variable dropdown pair and is deliberately left for a follow-up
// -- see the message shown in its place below.
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
        const isRegression = isRegressionAnalysis(objective.analyses);
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
            <div className="analysis-list">{(objective.analyses || []).map((item) => <AnalysisCard key={item.id} item={item} />)}</div>
            {objective.expresses_qualitative_intent && (objective.analyses || []).length === 0 && (
              <p className="analysis-reasoning">
                This objective has a qualitative dimension. It will be informed by whichever open-ended responses you
                select below, once analysed — no column is assigned to it in advance.
              </p>
            )}
            {needsReview && !isRegression && (
              <AnalysisOverrideForm
                objectiveId={objective.id}
                numericColumns={summary.numeric_columns || []}
                categoricalColumns={summary.categorical_columns || []}
                onOverride={onOverrideAnalysis}
                loading={loading}
              />
            )}
            {needsReview && isRegression && (
              <p className="analysis-reasoning">
                Choosing predictors for a regression isn't supported here yet — that needs its own multi-select
                picker. This is coming in a follow-up; for now, review the picked variables above and confirm they're
                correct before running analysis.
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

      {hasResults && (analysis?.objective_results || []).map((objective) => (
        <section className="objective-analysis-section" key={objective.id}>
          <div className="objective-heading"><span>OBJECTIVE {objective.id}</span><h2>{objective.objective}</h2></div>
          <div className="analysis-list">
            {(objective.analyses || []).map((item) => (
              <AnalysisCard
                key={item.id}
                item={item}
                conversationId={conversationId}
                onQualitativeFinalized={onQualitativeFinalized}
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
        />
      )}

      {hasResults && (() => {
        const pendingReview =
          (analysis?.objective_results || []).some((objective) =>
            (objective.analyses || []).some((item) => item.status === "needs_review")
          ) ||
          (analysis?.qualitative_results || []).some((entry) => entry.status === "needs_review");
        return (
          <div className="analysis-action-bar">
            <div>
              <strong>{pendingReview ? "Finish reviewing themes above." : "Analysis complete."}</strong>
              <span>
                {pendingReview
                  ? "Chapter 4 can't be generated until every qualitative data source's themes are finalized."
                  : "Review the findings above, then generate Chapter 4."}
              </span>
            </div>
            <button className="btn btn-primary" onClick={onContinueChapter4} disabled={pendingReview}>
              Continue to Chapter 4 →
            </button>
          </div>
        );
      })()}
    </section>
  );
}
