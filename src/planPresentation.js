/*
 * Pure presentation logic for the Analysis screen: what an analysis card's
 * status pill says, how a dataset column is labelled, and which planned test
 * (and result) each hypothesis has. Kept out of the component so it is
 * testable under plain node:test.
 */

// A dataset column is shown EXACTLY as it is written in the dataset. It used
// to be title-cased ("Current CWA" -> "Current Cwa", "PU1: AI tools ..." ->
// "Pu1: Ai Tools ..."), which no longer matched the file the researcher
// uploaded and mangled abbreviations.
export function columnLabel(name) {
  return name == null ? "" : String(name);
}

export function columnPairLabel(columns) {
  return (columns || []).filter((c) => c != null && c !== "").map(columnLabel).join(" × ");
}

// The status pill on an analysis card, from what the planner/run actually
// said about it -- not a hardcoded "Needs review" for everything that has no
// result yet. `tone` is the existing CSS modifier: "complete" (green) or
// "review" (amber).
export function analysisStatus(item) {
  const hasResult = Boolean(item?.result);

  if (item?.stale === true) {
    return { label: "Out of date", tone: "review" };
  }
  if (item?.error) {
    return { label: "Failed", tone: "review" };
  }
  if (item?.status === "complete" && hasResult) {
    return { label: "Complete", tone: "complete" };
  }
  if (item?.confidence === "low") {
    return { label: "Needs review", tone: "review" };
  }
  if (item?.status === "needs_review") {
    return { label: "Needs review", tone: "review" };
  }
  if (item?.status === "ready") {
    return { label: "Ready", tone: "complete" };
  }
  return { label: "Needs review", tone: "review" };
}

function findAnalysis(objectives, link) {
  if (!link) return null;
  const objective = (objectives || []).find((o) => String(o.id) === String(link.objective_id));
  const item = (objective?.analyses || []).find((a) => String(a.id) === String(link.analysis_id));
  return item ? { objective, item } : null;
}

// One entry per planned hypothesis: its wording, the test planned for it and
// the variables, whether that test is shared with an objective, and -- once
// analysis has run -- its result.
//
// `plan.hypotheses` comes from the planner; a hypothesis whose test is
// identical to an objective's links to that objective's analysis
// ({objective_id, analysis_id}), otherwise it carries its own analysis.
export function hypothesisEntries(plan, analysis) {
  const planned = Array.isArray(plan?.hypotheses) ? plan.hypotheses : [];
  const objectiveResults = analysis?.objective_results || [];
  const ownResults = new Map((analysis?.hypothesis_results || []).map((h) => [h.id, h]));

  return planned.map((hypothesis) => {
    const link = hypothesis.linked_analysis || null;
    const own = (hypothesis.analyses || [])[0] || null;

    const linkedPlanned = findAnalysis(plan?.items, link);
    const linkedRun = findAnalysis(objectiveResults, link);
    const ownRun = (ownResults.get(hypothesis.id)?.analyses || [])[0] || null;

    // A link whose analysis no longer exists in the plan (the objective's
    // variables were overridden since) is not trustworthy.
    const linkBroken = Boolean(link) && !linkedPlanned;

    const source = link ? (linkedRun?.item || linkedPlanned?.item) : (ownRun || own);
    const result = source?.result || null;

    let status;
    if (linkBroken) {
      status = { label: "Needs review", tone: "review" };
    } else if (!link && !own) {
      status = { label: "Needs review", tone: "review" };
    } else if (source) {
      status = analysisStatus(source);
    } else {
      status = { label: "Needs review", tone: "review" };
    }

    let sharedWith = null;
    if (link && !linkBroken) {
      sharedWith = `Objective ${linkedPlanned.objective.id}`;
    }

    return {
      id: hypothesis.id,
      number: hypothesis.number,
      text: hypothesis.hypothesis,
      testName: link && !linkBroken ? (linkedPlanned.item.test_name || hypothesis.test_name) : hypothesis.test_name,
      columns: hypothesis.columns || [],
      sharedWith,
      status,
      reviewReason: linkBroken
        ? "The objective analysis this hypothesis shared was changed. Run analysis again."
        : hypothesis.review_reason || source?.review_reason || null,
      result,
    };
  });
}

// H0 decision for a hypothesis result that carries a p-value.
export function hypothesisDecision(result, alpha = 0.05) {
  const p = result?.p_value;
  if (p === null || p === undefined || !Number.isFinite(Number(p))) return null;
  return Number(p) < alpha ? "Reject the null hypothesis" : "Fail to reject the null hypothesis";
}
