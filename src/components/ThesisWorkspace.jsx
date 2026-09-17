import { useMemo } from "react";
import { toFixedHalfEven } from "./chapter4/resultsTransform.js";
import CreditActionButton from "./CreditActionButton.jsx";

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

function AnalysisCard({ item }) {
  const result = item?.result;
  const method = result?.test || item?.test;
  const name = TEST_NAMES[method] || item?.method || item?.test_name || "Analysis";
  const columns = result?.columns || item?.columns || (item?.column ? [item.column] : []);
  const complete = item?.status === "complete" && result;

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
      <p className="analysis-reasoning">{item?.reasoning || item?.error || "Selected from the structure of the uploaded dataset."}</p>
      {complete && (result.test === "thematic_analysis" ? <QualitativeResult result={result} /> : <QuantitativeResult result={result} />)}
      {result?.interpretation && <div className="analysis-result-section"><h5>Interpretation</h5><p>{result.interpretation}</p></div>}
      {item?.error && <div className="analysis-warning"><strong>Review</strong><span>{item.error}</span></div>}
    </article>
  );
}

export default function ThesisWorkspace({ project, upload, plan, analysis, onBuildPlan, onRun, onContinueChapter4, loading, credits, costs, onBuyCredits }) {
  const objectives = useMemo(() => plan?.items || [], [plan]);
  const datasetType = analysis?.dataset_type || plan?.dataset_type;
  const summary = analysis?.dataset_summary || plan?.dataset_summary || {};
  const hasResults = (analysis?.objective_results || []).length > 0 || (analysis?.results || []).length > 0;

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

      {plan && !hasResults && objectives.map((objective) => (
        <section className="objective-analysis-section" key={objective.id}>
          <div className="objective-heading"><span>OBJECTIVE {objective.id}</span><h2>{objective.objective}</h2></div>
          <p className="analysis-reasoning">{objective.reasoning}</p>
          <div className="analysis-list">{(objective.analyses || []).map((item) => <AnalysisCard key={item.id} item={item} />)}</div>
        </section>
      ))}

      {plan && !hasResults && (
        <div className="analysis-action-bar">
          <div><strong>{objectives.reduce((n, x) => n + (x.analyses?.length || 0), 0)} data-supported analyses planned</strong><span>Quantitative and qualitative methods can coexist when the CSV supports both.</span></div>
          <CreditActionButton
            label="Run analysis →"
            confirmLabel="Confirm — run analysis →"
            loadingLabel="Analysing…"
            cost={costs?.analysis}
            balance={credits}
            loading={loading}
            onConfirm={onRun}
            onBuyCredits={onBuyCredits}
          />
        </div>
      )}

      {hasResults && (analysis?.objective_results || []).map((objective) => (
        <section className="objective-analysis-section" key={objective.id}>
          <div className="objective-heading"><span>OBJECTIVE {objective.id}</span><h2>{objective.objective}</h2></div>
          <div className="analysis-list">{(objective.analyses || []).map((item) => <AnalysisCard key={item.id} item={item} />)}</div>
        </section>
      ))}

      {hasResults && (
        <div className="analysis-action-bar"><div><strong>Analysis complete.</strong><span>Review the findings above, then generate Chapter 4.</span></div><button className="btn btn-primary" onClick={onContinueChapter4}>Continue to Chapter 4 →</button></div>
      )}
    </section>
  );
}
