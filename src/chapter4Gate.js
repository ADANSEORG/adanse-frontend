// Whether the researcher may continue from the analysis screen to Chapter 4.
//
// There are two ways to continue -- the action bar under the findings and the
// link in the page header -- and both must follow the same rule. It used to be
// worked out inline in the action bar only, so the header link stayed live
// while a qualitative finalize was still running (or results were out of date)
// and took the researcher to Chapter 4 anyway. The server refuses to generate
// or download the chapter in those cases (HTTP 400/409 from
// GET /thesis/projects/{id}/chapter4); this is the same rule up front, so the
// researcher is told why instead of finding out on download.
import { hasStaleResults } from "./analysisOverride.js";

export const CHAPTER4_READY = {
  heading: "Analysis complete.",
  message: "Review the findings above, then generate Chapter 4.",
};

export const CHAPTER4_PENDING_REVIEW = {
  heading: "Finish reviewing themes above.",
  message:
    "Chapter 4 can't be generated until every qualitative data source's themes are finalized.",
};

export const CHAPTER4_STALE = {
  heading: "Results out of date.",
  message:
    "Run analysis again to update the variables you changed before generating Chapter 4.",
};

// True while any analysis, or any qualitative data source, still needs the
// researcher's review -- which includes a qualitative column that is being
// finalized right now (its entry stays "needs_review" until it completes).
export function hasPendingReview(analysis) {
  const objectives = analysis?.objective_results || [];
  const qualitative = analysis?.qualitative_results || [];

  return (
    objectives.some((objective) =>
      (objective.analyses || []).some(
        (item) => item.status === "needs_review"
      )
    ) || qualitative.some((entry) => entry.status === "needs_review")
  );
}

// { blocked, reason, heading, message }
//   reason: "no-results" | "pending-review" | "stale" | "ready"
// Pending review wins over stale, as it always has in the action bar.
export function chapter4Gate(analysis) {
  if (!analysis) {
    return { blocked: true, reason: "no-results", heading: "", message: "" };
  }

  if (hasPendingReview(analysis)) {
    return { blocked: true, reason: "pending-review", ...CHAPTER4_PENDING_REVIEW };
  }

  if (hasStaleResults(analysis)) {
    return { blocked: true, reason: "stale", ...CHAPTER4_STALE };
  }

  return { blocked: false, reason: "ready", ...CHAPTER4_READY };
}
