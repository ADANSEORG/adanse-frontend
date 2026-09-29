/*
 * ---------------------------------------------------------
 * WHERE THE DATASET STEP'S "CONTINUE" GOES
 * ---------------------------------------------------------
 *
 * Uploading a dataset no longer leaves the Dataset step on its own: the
 * researcher may still want to attach their Chapter 1-3 document there
 * (either upload, both, in any order). They move on with an explicit
 * Continue, which must never skip Dataset Review for a version that
 * still needs validating and activating.
 *
 *   "review"       -- a cleaned version that is not the active one is
 *                     waiting to be reviewed.
 *   "analysis"     -- the project already has an active dataset (or a
 *                     plan/results), and nothing newer is waiting.
 *   "find-pending" -- neither is known from what's loaded (e.g. after a
 *                     reload); ask the server for a pending version and
 *                     review it, or go to analysis if there is none
 *                     (legacy projects without dataset versions).
 */

const PENDING_STATUSES = new Set(["cleaned", "validated"]);

export function isPendingReviewVersion(version, project) {
  return Boolean(
    version &&
      version.kind === "cleaned" &&
      PENDING_STATUSES.has(version.status) &&
      version.id !== project?.active_dataset_version_id
  );
}

export function datasetContinueTarget(project, datasetVersion) {
  if (isPendingReviewVersion(datasetVersion, project)) return "review";

  if (
    project?.active_dataset_version_id ||
    project?.analysis_plan ||
    project?.analysis_results
  ) {
    return "analysis";
  }

  return "find-pending";
}
