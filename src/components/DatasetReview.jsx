import { useState } from "react";

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
  onApplyGroupings,
  loading,
  error,
}) {
  const [groupSelections, setGroupSelections] = useState({});
  const [applyingGroupings, setApplyingGroupings] = useState(false);

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

  // Suggestions only: flatten { column: { groups: [...] } } into one list.
  // A column with an empty/missing groups array contributes nothing here,
  // so it never shows up as something to review.
  const groupingSuggestions = version.grouping_suggestions || {};
  const pendingGroups = Object.entries(groupingSuggestions).flatMap(
    ([column, suggestion]) =>
      (suggestion?.groups || []).map((group, index) => ({
        key: `${column}::${index}`,
        column,
        variants: Array.isArray(group.variants) ? group.variants : [],
        confidence: group.confidence || "low",
        defaultCanonical: group.canonical || "",
      }))
  );

  function getSelection(group) {
    return (
      groupSelections[group.key] || {
        accepted: false,
        canonical: group.defaultCanonical,
      }
    );
  }

  function toggleAccepted(group) {
    setGroupSelections((prev) => ({
      ...prev,
      [group.key]: {
        ...getSelection(group),
        accepted: !getSelection(group).accepted,
      },
    }));
  }

  function updateCanonical(group, value) {
    setGroupSelections((prev) => ({
      ...prev,
      [group.key]: {
        ...getSelection(group),
        canonical: value,
      },
    }));
  }

  const hasConfirmedGrouping = pendingGroups.some(
    (group) => getSelection(group).accepted
  );

  async function handleApplyGroupings() {
    if (!onApplyGroupings) return;

    const confirmed = pendingGroups
      .map((group) => ({ group, selection: getSelection(group) }))
      .filter(({ selection }) => selection.accepted)
      .map(({ group, selection }) => ({
        column: group.column,
        canonical: selection.canonical,
        variants: group.variants,
      }));

    if (!confirmed.length) return;

    setApplyingGroupings(true);
    try {
      await onApplyGroupings(confirmed);
      setGroupSelections({});
    } finally {
      setApplyingGroupings(false);
    }
  }

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
          POSSIBLE GROUPINGS (suggestion only — nothing here is
          applied until the researcher checks a group and clicks
          "Apply checked groupings"). Renders nothing at all when
          there are no suggestions, so a clean column never shows
          an empty box asking for a decision that doesn't exist.
          ===================================================== */}

      {pendingGroups.length > 0 && (
        <div className="dataset-variables">
          <div className="dataset-variables-heading">
            <div>
              <div className="dataset-profile-kicker">
                POSSIBLE GROUPINGS
              </div>
              <h3>Adanse noticed values that might be the same category</h3>
            </div>
            <span>{pendingGroups.length} to review</span>
          </div>

          <p className="dataset-grouping-note">
            These are suggestions only — nothing is merged until you check a
            group below and apply it. Leaving a suggestion unchecked keeps
            the values exactly as they are.
          </p>

          <div className="dataset-variable-list">
            {pendingGroups.map((group) => {
              const selection = getSelection(group);
              return (
                <div
                  className="dataset-variable-row grouping-suggestion"
                  key={group.key}
                >
                  <label className="dataset-grouping-checkbox">
                    <input
                      type="checkbox"
                      checked={selection.accepted}
                      onChange={() => toggleAccepted(group)}
                      disabled={applyingGroupings}
                    />
                    Merge these
                  </label>

                  <div className="dataset-variable-main">
                    <span className="dataset-type-badge">
                      {formatVariableName(group.column)}
                    </span>
                    <span className="dataset-grouping-variants">
                      {group.variants.join(" · ")}
                    </span>
                    <span
                      className={`dataset-grouping-confidence ${group.confidence}`}
                    >
                      {group.confidence} confidence
                    </span>
                  </div>

                  <div className="dataset-grouping-canonical">
                    <label>Merge into</label>
                    <input
                      type="text"
                      value={selection.canonical}
                      onChange={(event) =>
                        updateCanonical(group, event.target.value)
                      }
                      disabled={!selection.accepted || applyingGroupings}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dataset-grouping-actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={handleApplyGroupings}
              disabled={!hasConfirmedGrouping || applyingGroupings}
            >
              {applyingGroupings
                ? "Applying…"
                : "Apply checked groupings"}
            </button>
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
