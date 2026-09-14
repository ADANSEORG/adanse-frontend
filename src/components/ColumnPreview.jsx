function formatVariableName(name) {
  if (!name) return "";

  return String(name)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
    .replace(/\bId\b/g, "ID")
    .replace(/\bGpa\b/g, "GPA")
    .replace(/\bAi\b/g, "AI");
}

function formatType(type) {
  if (!type) return "Variable";

  const normalized = String(type).toLowerCase();

  if (
    normalized.includes("categorical") ||
    normalized.includes("category") ||
    normalized.includes("object")
  ) {
    return "Categorical";
  }

  if (
    normalized.includes("numeric") ||
    normalized.includes("number") ||
    normalized.includes("int") ||
    normalized.includes("float")
  ) {
    return "Numeric";
  }

  return type;
}

export default function ColumnPreview({
  filename,
  rows,
  columns = [],
}) {
  const safeColumns = Array.isArray(columns)
    ? columns
    : [];

  const safeRows = Number(rows) || 0;

  const variablesWithMissing =
    safeColumns.filter(
      (column) =>
        Number(column?.missing_count || 0) > 0
    );

  const variablesWithUnusualValues =
    safeColumns.filter(
      (column) =>
        Number(column?.outlier_count || 0) > 0
    );

  const completeVariables =
    safeColumns.filter(
      (column) =>
        Number(column?.missing_count || 0) === 0 &&
        Number(column?.outlier_count || 0) === 0
    );

  const totalMissingValues =
    safeColumns.reduce(
      (total, column) =>
        total +
        Number(column?.missing_count || 0),
      0
    );

  const totalUnusualValues =
    safeColumns.reduce(
      (total, column) =>
        total +
        Number(column?.outlier_count || 0),
      0
    );

  return (
    <div className="dataset-profile-card">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="dataset-profile-header">
        <div>
          <div className="dataset-profile-kicker">
            DATASET OVERVIEW
          </div>

          <h2>
            Your data at a glance.
          </h2>

          <p>
            Adanse has reviewed your dataset and
            identified the variables and data-quality
            issues that may matter before analysis.
          </p>
        </div>

        <div className="dataset-profile-file">
          <strong>
            {filename || "Uploaded dataset"}
          </strong>

          <span>
            {safeRows.toLocaleString()}{" "}
            {safeRows === 1
              ? "observation"
              : "observations"}{" "}
            · {safeColumns.length}{" "}
            {safeColumns.length === 1
              ? "variable"
              : "variables"}
          </span>
        </div>
      </div>

      {/* =====================================================
          DATA QUALITY
          ===================================================== */}

      <div className="dataset-quality">
        <div className="dataset-quality-heading">
          <span>DATA QUALITY</span>

          <p>
            A quick look at what Adanse found in
            your data.
          </p>
        </div>

        <div className="dataset-quality-grid">

          <div className="dataset-quality-item">
            <div className="dataset-quality-icon neutral">
              {safeColumns.length}
            </div>

            <div>
              <strong>
                {safeColumns.length} variables
              </strong>

              <span>
                available for analysis
              </span>
            </div>
          </div>

          <div className="dataset-quality-item">
            <div className="dataset-quality-icon warning">
              {variablesWithMissing.length}
            </div>

            <div>
              <strong>
                {variablesWithMissing.length}{" "}
                {variablesWithMissing.length === 1
                  ? "variable"
                  : "variables"}{" "}
                with missing data
              </strong>

              <span>
                {totalMissingValues}{" "}
                {totalMissingValues === 1
                  ? "missing value"
                  : "missing values"}{" "}
                detected
              </span>
            </div>
          </div>

          <div className="dataset-quality-item">
            <div className="dataset-quality-icon warning">
              {variablesWithUnusualValues.length}
            </div>

            <div>
              <strong>
                {variablesWithUnusualValues.length}{" "}
                {variablesWithUnusualValues.length === 1
                  ? "variable"
                  : "variables"}{" "}
                with unusual values
              </strong>

              <span>
                {totalUnusualValues}{" "}
                {totalUnusualValues === 1
                  ? "unusual value"
                  : "unusual values"}{" "}
                detected
              </span>
            </div>
          </div>

          <div className="dataset-quality-item">
            <div className="dataset-quality-icon good">
              {completeVariables.length}
            </div>

            <div>
              <strong>
                {completeVariables.length}{" "}
                {completeVariables.length === 1
                  ? "variable"
                  : "variables"}{" "}
                look clean
              </strong>

              <span>
                no issues detected
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* =====================================================
          VARIABLES
          ===================================================== */}

      <div className="dataset-variables">

        <div className="dataset-variables-heading">
          <div>
            <div className="dataset-profile-kicker">
              VARIABLES
            </div>

            <h3>
              What is in your dataset?
            </h3>
          </div>

          <span>
            {safeColumns.length} total
          </span>
        </div>

        <div className="dataset-variable-list">

          {safeColumns.map(
            (column, index) => {
              const missingCount = Number(
                column?.missing_count || 0
              );

              const unusualCount = Number(
                column?.outlier_count || 0
              );

              const hasMissing =
                missingCount > 0;

              const hasUnusual =
                unusualCount > 0;

              const needsAttention =
                hasMissing || hasUnusual;

              return (
                <div
                  className={`dataset-variable-row ${
                    needsAttention
                      ? "needs-attention"
                      : "clean"
                  }`}
                  key={
                    column?.name ||
                    `variable-${index}`
                  }
                >
                  <div className="dataset-variable-main">

                    <strong>
                      {formatVariableName(
                        column?.name
                      )}
                    </strong>

                    <span className="dataset-type-badge">
                      {formatType(
                        column?.inferred_type
                      )}
                    </span>

                  </div>

                  <div className="dataset-variable-status">

                    {hasMissing && (
                      <span className="dataset-status warning">
                        {missingCount}{" "}
                        {missingCount === 1
                          ? "missing"
                          : "missing values"}
                      </span>
                    )}

                    {hasUnusual && (
                      <span className="dataset-status unusual">
                        {unusualCount}{" "}
                        {unusualCount === 1
                          ? "unusual value"
                          : "unusual values"}
                      </span>
                    )}

                    {!needsAttention && (
                      <span className="dataset-status clean">
                        Looks good
                      </span>
                    )}

                  </div>
                </div>
              );
            }
          )}

        </div>
      </div>

      {/* =====================================================
          WHAT THIS MEANS
          ===================================================== */}

      <div className="dataset-profile-note">

        <div className="dataset-profile-note-icon">
          ✓
        </div>

        <div>
          <strong>
            What this means
          </strong>

          <p>
            Adanse will use these findings when
            deciding which statistical analyses are
            appropriate for your research objectives.
            You do not need to clean or select
            variables manually before continuing.
          </p>
        </div>

      </div>
    </div>
  );
}