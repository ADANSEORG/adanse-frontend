function formatVariableName(name) {
  if (!name) return "";

  return String(name)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatRuleLabel(rule) {
  if (!rule) return "Review item";
  return formatVariableName(rule);
}

const STATUS_COPY = {
  profiled: {
    label: "Profiled",
    tone: "warning",
  },
  cleaned: {
    label: "Needs validation",
    tone: "warning",
  },
  validated: {
    label: "Validated",
    tone: "good",
  },
  superseded: {
    label: "Superseded",
    tone: "neutral",
  },
  failed: {
    label: "Failed",
    tone: "warning",
  },
};

/*
 * DatasetReview
 * -------------------------------------------------------------
 * Shown after a dataset is uploaded. The backend now persists an
 * immutable original artifact plus a separately-versioned cleaned
 * candidate (status: cleaned -> validated -> activated). Analysis
 * cannot proceed until the researcher has reviewed the cleaning
 * report and explicitly validated + activated a version.
 * -------------------------------------------------------------
 */

export default function DatasetReview({
  version,
  active,
  onValidate,
  onActivate,
  onReplace,
  loading,
  error,
}) {
  if (!version) {
    return null;
  }

  const status = version.status || "cleaned";
  const statusCopy =
    STATUS_COPY[status] || STATUS_COPY.cleaned;

  const cleaningReport =
    version.cleaning_report || {};

  const validationReport =
    version.validation_report || {};

  const actionsApplied = Array.isArray(
    cleaningReport.actions_applied
  )
    ? cleaningReport.actions_applied
    : [];

  const unresolvedIssues = Array.isArray(
    cleaningReport.unresolved_issues
  )
    ? cleaningReport.unresolved_issues
    : [];

  const readinessWarnings = Array.isArray(
    validationReport.analysis_readiness_warnings
  )
    ? validationReport.analysis_readiness_warnings
    : [];

  const summary = cleaningReport.summary || {};

  const canValidate =
    status === "cleaned" && !loading;

  const canActivate =
    status === "validated" && !active && !loading;

  return (
    <div className="dataset-profile-card">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="dataset-profile-header">
        <div>
          <div className="dataset-profile-kicker">
            DATASET REVIEW
          </div>

          <h2>Review the cleaned dataset before analysis.</h2>

          <p>
            Adanse applies only conservative, automatic
            cleaning steps and leaves anything judgment-based
            for you to review. Nothing is used for analysis
            until you validate and activate this version.
          </p>
        </div>

        <div className="dataset-profile-file">
          <strong>{version.filename || "Cleaned dataset"}</strong>

          <span>
            {Number(
              version.row_count || 0
            ).toLocaleString()}{" "}
            rows · {version.column_count ?? 0} columns
          </span>
        </div>
      </div>

      {/* =====================================================
          STATUS
          ===================================================== */}

      <div className="dataset-quality">
        <div className="dataset-quality-heading">
          <span>VERSION STATUS</span>
          <p>
            {active
              ? "This is the active dataset version. Analysis uses this data."
              : "This version is not active yet. Validate, then activate it to unlock analysis."}
          </p>
        </div>

        <div className="dataset-quality-grid">
          <div className="dataset-quality-item">
            <div
              className={`dataset-quality-icon ${statusCopy.tone}`}
            >
              {active ? "✓" : "•"}
            </div>

            <div>
              <strong>{statusCopy.label}</strong>
              <span>
                {active
                  ? "Active for this project"
                  : "Not yet the active version"}
              </span>
            </div>
          </div>

          <div className="dataset-quality-item">
            <div className="dataset-quality-icon neutral">
              {summary.affected_rows ?? 0}
            </div>

            <div>
              <strong>
                {summary.affected_rows ?? 0} rows adjusted
              </strong>
              <span>
                {summary.rows_before ?? version.row_count ?? 0}{" "}
                → {summary.rows_after ?? version.row_count ?? 0}{" "}
                rows
              </span>
            </div>
          </div>

          <div className="dataset-quality-item">
            <div className="dataset-quality-icon warning">
              {unresolvedIssues.length}
            </div>

            <div>
              <strong>
                {unresolvedIssues.length}{" "}
                {unresolvedIssues.length === 1
                  ? "issue needs your judgment"
                  : "issues need your judgment"}
              </strong>
              <span>not changed automatically</span>
            </div>
          </div>

          <div className="dataset-quality-item">
            <div className="dataset-quality-icon good">
              {actionsApplied.length}
            </div>

            <div>
              <strong>
                {actionsApplied.length}{" "}
                {actionsApplied.length === 1
                  ? "automatic fix applied"
                  : "automatic fixes applied"}
              </strong>
              <span>trimming, duplicates, type fixes</span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          ACTIONS APPLIED
          ===================================================== */}

      {actionsApplied.length > 0 && (
        <div className="dataset-variables">
          <div className="dataset-variables-heading">
            <div>
              <div className="dataset-profile-kicker">
                APPLIED AUTOMATICALLY
              </div>
              <h3>What Adanse already fixed</h3>
            </div>
            <span>{actionsApplied.length} total</span>
          </div>

          <div className="dataset-variable-list">
            {actionsApplied.map((action, index) => (
              <div
                className="dataset-variable-row clean"
                key={`${action.rule || "action"}-${index}`}
              >
                <div className="dataset-variable-main">
                  <strong>
                    {formatRuleLabel(action.rule)}
                  </strong>
                  {action.column && (
                    <span className="dataset-type-badge">
                      {formatVariableName(action.column)}
                    </span>
                  )}
                </div>

                <div className="dataset-variable-status">
                  <span className="dataset-status clean">
                    {action.affected_rows ?? 0} rows ·{" "}
                    {action.affected_values ?? 0} values
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================
          NEEDS YOUR REVIEW
          ===================================================== */}

      {unresolvedIssues.length > 0 && (
        <div className="dataset-variables">
          <div className="dataset-variables-heading">
            <div>
              <div className="dataset-profile-kicker">
                LEFT FOR YOU TO REVIEW
              </div>
              <h3>Adanse did not change these automatically</h3>
            </div>
            <span>{unresolvedIssues.length} total</span>
          </div>

          <div className="dataset-variable-list">
            {unresolvedIssues.map((issue, index) => (
              <div
                className="dataset-variable-row needs-attention"
                key={`${issue.rule || "issue"}-${index}`}
              >
                <div className="dataset-variable-main">
                  <strong>
                    {formatRuleLabel(issue.rule)}
                  </strong>
                  {issue.column && (
                    <span className="dataset-type-badge">
                      {formatVariableName(issue.column)}
                    </span>
                  )}
                </div>

                <div className="dataset-variable-status">
                  <span className="dataset-status warning">
                    {issue.reason ||
                      issue.detail ||
                      "Needs manual review"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================
          READINESS WARNINGS
          ===================================================== */}

      {readinessWarnings.length > 0 && (
        <div className="analysis-warning">
          <strong>Before you activate this version</strong>
          <span>
            {readinessWarnings
              .map(
                (warning) =>
                  formatRuleLabel(warning.rule) +
                  (warning.count != null
                    ? ` (${warning.count})`
                    : warning.issue_count != null
                    ? ` (${warning.issue_count})`
                    : "")
              )
              .join(" · ")}
          </span>
        </div>
      )}

      {error && (
        <div className="analysis-warning">
          <strong>Could not update this dataset version</strong>
          <span>{error}</span>
        </div>
      )}

      {/* =====================================================
          ACTIONS
          ===================================================== */}

      <div className="analysis-action-bar">
        <div>
          <strong>
            {active
              ? "This version is active."
              : status === "validated"
              ? "Ready to activate."
              : "Validate this version to continue."}
          </strong>
          <span>
            {active
              ? "You can continue to build the analysis plan."
              : status === "validated"
              ? "Activating replaces the dataset used for analysis and clears any existing plan or results."
              : "Validation records that you have reviewed the cleaning report above."}
          </span>
        </div>

        <div className="current-dataset-actions">
          {onReplace && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={onReplace}
              disabled={loading}
            >
              Replace dataset
            </button>
          )}

          {canValidate && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={onValidate}
              disabled={loading}
            >
              {loading ? "Validating…" : "Validate dataset"}
            </button>
          )}

          {canActivate && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={onActivate}
              disabled={loading}
            >
              {loading ? "Activating…" : "Activate & continue →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
