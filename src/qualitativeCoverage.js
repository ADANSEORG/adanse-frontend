/*
 * Pure logic for the code-review coverage summary shown on the
 * qualitative-review code step (QualitativeReview.jsx) -- kept
 * decoupled from React state so it's directly testable under plain
 * node:test, the same pattern analysisOverride.js/categoryOrder.js use.
 *
 * Coverage transparency: how many of the proposed codes the researcher
 * kept, and how many distinct respondents those kept codes actually
 * represent -- shown live while reviewing, and again (identically
 * computed server-side) in Chapter 4.9's coverage note.
 */

export function countAcceptedCodes(codes, selections) {
  return (codes || []).filter((c) => selections?.[c.id]?.status === "accepted").length;
}

/*
 * Distinct respondents covered by the currently-accepted codes' own
 * extracts -- a respondent counted once even if more than one accepted
 * code cites them.
 */
export function countRepresentedResponses(codes, selections) {
  const ids = new Set();
  for (const code of codes || []) {
    if (selections?.[code.id]?.status !== "accepted") continue;
    for (const extract of code.extracts || []) {
      if (extract?.respondent_id) ids.add(extract.respondent_id);
    }
  }
  return ids.size;
}

export function codeCoverageSummary(codes, selections, totalResponses) {
  return {
    codesKept: countAcceptedCodes(codes, selections),
    codesProposed: (codes || []).length,
    responsesRepresented: countRepresentedResponses(codes, selections),
    totalResponses: totalResponses ?? null,
  };
}
