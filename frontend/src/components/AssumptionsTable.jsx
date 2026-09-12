function formatPValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "n/a";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value);
  }

  return number.toFixed(4);
}

function AssumptionStatus({ ok }) {
  if (ok === true) {
    return (
      <span
        style={{
          fontWeight: 600,
        }}
      >
        Met
      </span>
    );
  }

  if (ok === false) {
    return (
      <span
        style={{
          fontWeight: 600,
        }}
      >
        Not met
      </span>
    );
  }

  return (
    <span
      style={{
        fontWeight: 600,
      }}
    >
      Not available
    </span>
  );
}

export default function AssumptionsTable({
  assumptions,
}) {
  if (!assumptions) {
    return null;
  }

  const hasShapiro =
    assumptions.shapiro_min_p !==
      undefined &&
    assumptions.shapiro_min_p !== null;

  const hasVariance =
    assumptions.levene_p !==
      undefined &&
    assumptions.levene_p !== null;

  if (!hasShapiro && !hasVariance) {
    return null;
  }

  return (
    <div
      style={{
        overflowX: "auto",
        marginBottom: 16,
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom:
                "1px solid var(--color-line)",
            }}
          >
            <th
              style={{
                textAlign: "left",
                padding: "8px 0",
              }}
            >
              Assumption
            </th>

            <th
              style={{
                textAlign: "right",
                padding: "8px 0",
              }}
            >
              Result
            </th>

            <th
              style={{
                textAlign: "right",
                padding: "8px 0",
              }}
            >
              Status
            </th>
          </tr>
        </thead>

        <tbody>
          {hasShapiro && (
            <tr
              style={{
                borderBottom:
                  "1px solid var(--color-line)",
              }}
            >
              <td
                style={{
                  padding: "8px 0",
                  paddingRight: 12,
                }}
              >
                Normality
                <div
                  style={{
                    fontSize: 11,
                    color:
                      "var(--color-ink-soft)",
                    marginTop: 2,
                  }}
                >
                  Shapiro-Wilk, minimum p across
                  groups
                </div>
              </td>

              <td
                style={{
                  textAlign: "right",
                  padding: "8px 0",
                }}
              >
                p ={" "}
                {formatPValue(
                  assumptions.shapiro_min_p
                )}
              </td>

              <td
                style={{
                  textAlign: "right",
                  padding: "8px 0",
                }}
              >
                <AssumptionStatus
                  ok={assumptions.normal_ok}
                />
              </td>
            </tr>
          )}

          {hasVariance && (
            <tr>
              <td
                style={{
                  padding: "8px 0",
                  paddingRight: 12,
                }}
              >
                Equal variance
                <div
                  style={{
                    fontSize: 11,
                    color:
                      "var(--color-ink-soft)",
                    marginTop: 2,
                  }}
                >
                  Levene's test
                </div>
              </td>

              <td
                style={{
                  textAlign: "right",
                  padding: "8px 0",
                }}
              >
                p ={" "}
                {formatPValue(
                  assumptions.levene_p
                )}
              </td>

              <td
                style={{
                  textAlign: "right",
                  padding: "8px 0",
                }}
              >
                <AssumptionStatus
                  ok={
                    assumptions.variance_ok
                  }
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}