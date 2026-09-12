function formatVariableName(name) {
  if (!name) return "";

  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bCgpa\b/g, "CGPA")
    .replace(/\bGpa\b/g, "GPA");
}

function formatGroupName(name) {
  if (!name) return "";

  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTick(value) {
  if (!Number.isFinite(value)) return "";

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1);
}

function getTicks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [];
  }

  if (min === max) {
    return [min];
  }

  const ticks = [];

  for (let i = 0; i < count; i += 1) {
    const ratio = i / (count - 1);
    ticks.push(min + (max - min) * ratio);
  }

  return ticks;
}

function linearRegression(points) {
  if (points.length < 2) {
    return null;
  }

  const n = points.length;

  const meanX =
    points.reduce((sum, point) => sum + point.x, 0) /
    n;

  const meanY =
    points.reduce((sum, point) => sum + point.y, 0) /
    n;

  let numerator = 0;
  let denominator = 0;

  for (const point of points) {
    numerator +=
      (point.x - meanX) *
      (point.y - meanY);

    denominator +=
      (point.x - meanX) ** 2;
  }

  if (denominator === 0) {
    return null;
  }

  const slope = numerator / denominator;
  const intercept =
    meanY - slope * meanX;

  return {
    slope,
    intercept,
  };
}

function EmptyChart({ children }) {
  return (
    <div className="result-chart-empty">
      {children}
    </div>
  );
}

export default function ResultChart({ result }) {
  if (!result) {
    return null;
  }

  // =========================================================
  // CORRELATION — Scatter plot
  // =========================================================

  if (result.test === "correlation") {
    const rawPoints = Array.isArray(result.points)
      ? result.points
      : [];

    const points = rawPoints
      .map((point) => ({
        x: Number(point?.x),
        y: Number(point?.y),
      }))
      .filter(
        (point) =>
          Number.isFinite(point.x) &&
          Number.isFinite(point.y)
      );

    if (points.length === 0) {
      return (
        <EmptyChart>
          No chart data available for this correlation.
        </EmptyChart>
      );
    }

    const width = 560;
    const height = 320;

    const leftPad = 58;
    const rightPad = 24;
    const topPad = 28;
    const bottomPad = 55;

    const chartWidth =
      width - leftPad - rightPad;

    const chartHeight =
      height - topPad - bottomPad;

    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);

    const rawMinX = Math.min(...xs);
    const rawMaxX = Math.max(...xs);
    const rawMinY = Math.min(...ys);
    const rawMaxY = Math.max(...ys);

    const xPadding =
      (rawMaxX - rawMinX || 1) * 0.04;

    const yPadding =
      (rawMaxY - rawMinY || 1) * 0.04;

    const minX = rawMinX - xPadding;
    const maxX = rawMaxX + xPadding;
    const minY = rawMinY - yPadding;
    const maxY = rawMaxY + yPadding;

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const scaleX = (x) =>
      leftPad +
      ((x - minX) / rangeX) *
        chartWidth;

    const scaleY = (y) =>
      topPad +
      chartHeight -
      ((y - minY) / rangeY) *
        chartHeight;

    const xTicks = getTicks(
      rawMinX,
      rawMaxX
    );

    const yTicks = getTicks(
      rawMinY,
      rawMaxY
    );

    const regression = linearRegression(points);

    let regressionLine = null;

    if (regression) {
      const lineStartX = rawMinX;
      const lineEndX = rawMaxX;

      const lineStartY =
        regression.slope * lineStartX +
        regression.intercept;

      const lineEndY =
        regression.slope * lineEndX +
        regression.intercept;

      regressionLine = {
        x1: scaleX(lineStartX),
        y1: scaleY(lineStartY),
        x2: scaleX(lineEndX),
        y2: scaleY(lineEndY),
      };
    }

    const xLabel = formatVariableName(
      result.columns?.[0]
    );

    const yLabel = formatVariableName(
      result.columns?.[1]
    );

    return (
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-ink-soft)",
            marginBottom: 6,
          }}
        >
          Relationship between {xLabel} and {yLabel}
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
          role="img"
          aria-label={`Scatter plot showing the relationship between ${xLabel} and ${yLabel}`}
        >
          {/* Horizontal grid + Y ticks */}
          {yTicks.map((tick, index) => {
            const y = scaleY(tick);

            return (
              <g key={`y-${index}`}>
                <line
                  x1={leftPad}
                  x2={width - rightPad}
                  y1={y}
                  y2={y}
                  stroke="var(--color-line)"
                  strokeWidth="1"
                />

                <text
                  x={leftPad - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--color-ink-soft)"
                >
                  {formatTick(tick)}
                </text>
              </g>
            );
          })}

          {/* Vertical grid + X ticks */}
          {xTicks.map((tick, index) => {
            const x = scaleX(tick);

            return (
              <g key={`x-${index}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={topPad}
                  y2={height - bottomPad}
                  stroke="var(--color-line)"
                  strokeWidth="1"
                />

                <text
                  x={x}
                  y={height - bottomPad + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--color-ink-soft)"
                >
                  {formatTick(tick)}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line
            x1={leftPad}
            y1={height - bottomPad}
            x2={width - rightPad}
            y2={height - bottomPad}
            stroke="var(--color-ink)"
            strokeWidth="1.5"
          />

          <line
            x1={leftPad}
            y1={topPad}
            x2={leftPad}
            y2={height - bottomPad}
            stroke="var(--color-ink)"
            strokeWidth="1.5"
          />

          {/* Regression line */}
          {regressionLine && (
            <line
              x1={regressionLine.x1}
              y1={regressionLine.y1}
              x2={regressionLine.x2}
              y2={regressionLine.y2}
              stroke="var(--color-ink)"
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.7"
            />
          )}

          {/* Data points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={scaleX(point.x)}
              cy={scaleY(point.y)}
              r="3"
              fill="var(--color-ink)"
              opacity="0.45"
            />
          ))}

          {/* X axis label */}
          <text
            x={width / 2}
            y={height - 10}
            textAnchor="middle"
            fontSize="12"
            fill="var(--color-ink-soft)"
          >
            {xLabel}
          </text>

          {/* Y axis label */}
          <text
            x="15"
            y={height / 2}
            textAnchor="middle"
            fontSize="12"
            fill="var(--color-ink-soft)"
            transform={`rotate(-90 15 ${
              height / 2
            })`}
          >
            {yLabel}
          </text>
        </svg>

        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--color-ink-soft)",
            marginTop: 4,
          }}
        >
          Pearson correlation: r ={" "}
          {result.r ?? "—"}
        </div>
      </div>
    );
  }

  // =========================================================
  // T-TEST / ANOVA — Group mean chart
  // =========================================================

  if (
    result.test === "t_test" ||
    result.test === "anova"
  ) {
    const groups =
      result.groups &&
      typeof result.groups === "object"
        ? Object.entries(result.groups)
        : [];

    const validGroups = groups.filter(
      ([, stats]) =>
        Number.isFinite(Number(stats?.mean))
    );

    if (validGroups.length === 0) {
      return (
        <EmptyChart>
          No group data available for this test.
        </EmptyChart>
      );
    }

    const width = 560;
    const height = 320;

    const leftPad = 58;
    const rightPad = 25;
    const topPad = 28;
    const bottomPad = 70;

    const chartHeight =
      height - topPad - bottomPad;

    const chartWidth =
      width - leftPad - rightPad;

    const means = validGroups.map(
      ([, stats]) => Number(stats.mean)
    );

    const minMean = Math.min(...means);
    const maxMean = Math.max(...means);

    const range =
      maxMean - minMean || 1;

    const yMin = Math.max(
      0,
      minMean - range * 0.15
    );

    const yMax =
      maxMean + range * 0.15;

    const yRange =
      yMax - yMin || 1;

    const scaleY = (value) =>
      topPad +
      chartHeight -
      ((value - yMin) / yRange) *
        chartHeight;

    const barGap =
      validGroups.length > 8 ? 8 : 18;

    const barWidth = Math.max(
      18,
      (chartWidth -
        barGap * (validGroups.length - 1)) /
        validGroups.length
    );

    const yTicks = getTicks(yMin, yMax);

    return (
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-ink-soft)",
            marginBottom: 6,
          }}
        >
          Mean comparison across groups
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
          role="img"
          aria-label="Bar chart comparing group means"
        >
          {/* Grid */}
          {yTicks.map((tick, index) => {
            const y = scaleY(tick);

            return (
              <g key={index}>
                <line
                  x1={leftPad}
                  x2={width - rightPad}
                  y1={y}
                  y2={y}
                  stroke="var(--color-line)"
                  strokeWidth="1"
                />

                <text
                  x={leftPad - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--color-ink-soft)"
                >
                  {formatTick(tick)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {validGroups.map(
            ([name, stats], index) => {
              const mean = Number(stats.mean);

              const x =
                leftPad +
                index *
                  (barWidth + barGap);

              const y = scaleY(mean);

              const baseY =
                scaleY(yMin);

              const barHeight =
                Math.max(0, baseY - y);

              const formattedName =
                formatGroupName(name);

              return (
                <g key={name}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill="var(--color-ink)"
                    opacity="0.75"
                    rx="3"
                  />

                  {/* Mean */}
                  <text
                    x={
                      x +
                      barWidth / 2
                    }
                    y={y - 7}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="var(--color-ink)"
                  >
                    {mean.toFixed(2)}
                  </text>

                  {/* Group name */}
                  <text
                    x={
                      x +
                      barWidth / 2
                    }
                    y={
                      height -
                      bottomPad +
                      20
                    }
                    textAnchor="middle"
                    fontSize="10"
                    fill="var(--color-ink-soft)"
                  >
                    {formattedName.length > 14
                      ? `${formattedName.substring(
                          0,
                          12
                        )}…`
                      : formattedName}
                  </text>

                  {/* n */}
                  <text
                    x={
                      x +
                      barWidth / 2
                    }
                    y={
                      height -
                      bottomPad +
                      36
                    }
                    textAnchor="middle"
                    fontSize="9"
                    fill="var(--color-ink-soft)"
                  >
                    n = {stats?.n ?? "—"}
                  </text>
                </g>
              );
            }
          )}

          {/* Axes */}
          <line
            x1={leftPad}
            y1={topPad}
            x2={leftPad}
            y2={
              topPad +
              chartHeight
            }
            stroke="var(--color-ink)"
            strokeWidth="1.5"
          />

          <line
            x1={leftPad}
            y1={
              topPad +
              chartHeight
            }
            x2={width - rightPad}
            y2={
              topPad +
              chartHeight
            }
            stroke="var(--color-ink)"
            strokeWidth="1.5"
          />
        </svg>

        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--color-ink-soft)",
            marginTop: 4,
          }}
        >
          Group means with sample sizes
        </div>
      </div>
    );
  }

  // =========================================================
  // CROSS-TABULATION — Count chart
  // =========================================================

  if (result.test === "cross_tab") {
    const table =
      result.table &&
      typeof result.table === "object"
        ? result.table
        : {};

    const rowNames = Object.keys(table);

    if (rowNames.length === 0) {
      return (
        <EmptyChart>
          No cross-tabulation data available for this chart.
        </EmptyChart>
      );
    }

    const columnNames = [
      ...new Set(
        rowNames.flatMap((row) =>
          Object.keys(table[row] || {})
        )
      ),
    ];

    if (columnNames.length === 0) {
      return (
        <EmptyChart>
          No category data available for this chart.
        </EmptyChart>
      );
    }

    const width = 560;
    const height = 330;

    const leftPad = 55;
    const rightPad = 25;
    const topPad = 30;
    const bottomPad = 70;

    const chartHeight =
      height - topPad - bottomPad;

    const chartWidth =
      width - leftPad - rightPad;

    const barGap =
      rowNames.length > 8 ? 8 : 18;

    const barWidth = Math.max(
      18,
      (chartWidth -
        barGap * (rowNames.length - 1)) /
        rowNames.length
    );

    const totals = rowNames.map(
      (row) =>
        columnNames.reduce(
          (sum, column) =>
            sum +
            Number(
              table[row]?.[column] || 0
            ),
          0
        )
    );

    const maxTotal =
      Math.max(...totals, 1);

    const yTicks = getTicks(
      0,
      maxTotal
    );

    const scaleY = (value) =>
      topPad +
      chartHeight -
      (value / maxTotal) *
        chartHeight;

    return (
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-ink-soft)",
            marginBottom: 6,
          }}
        >
          Response counts across categories
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
          role="img"
          aria-label="Stacked bar chart showing response counts across categories"
        >
          {/* Grid */}
          {yTicks.map((tick, index) => {
            const y = scaleY(tick);

            return (
              <g key={index}>
                <line
                  x1={leftPad}
                  x2={width - rightPad}
                  y1={y}
                  y2={y}
                  stroke="var(--color-line)"
                  strokeWidth="1"
                />

                <text
                  x={leftPad - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--color-ink-soft)"
                >
                  {Math.round(tick)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {rowNames.map(
            (row, rowIndex) => {
              const values =
                columnNames.map(
                  (column) =>
                    Number(
                      table[row]?.[
                        column
                      ] || 0
                    )
                );

              const total =
                values.reduce(
                  (sum, value) =>
                    sum + value,
                  0
                );

              const x =
                leftPad +
                rowIndex *
                  (barWidth + barGap);

              let currentValue = 0;

              return (
                <g key={row}>
                  {values.map(
                    (
                      value,
                      columnIndex
                    ) => {
                      const start =
                        currentValue;

                      currentValue += value;

                      const yTop =
                        scaleY(
                          currentValue
                        );

                      const yBottom =
                        scaleY(start);

                      const segmentHeight =
                        Math.max(
                          0,
                          yBottom - yTop
                        );

                      const percentage =
                        total > 0
                          ? (value /
                              total) *
                            100
                          : 0;

                      return (
                        <g
                          key={
                            columnNames[
                              columnIndex
                            ]
                          }
                        >
                          <rect
                            x={x}
                            y={yTop}
                            width={barWidth}
                            height={
                              segmentHeight
                            }
                            fill="var(--color-ink)"
                            opacity={
                              0.3 +
                              (columnIndex /
                                Math.max(
                                  columnNames.length,
                                  1
                                )) *
                                0.55
                            }
                            stroke="var(--color-surface)"
                            strokeWidth="1"
                          />

                          {percentage >=
                            10 &&
                            segmentHeight >
                              20 && (
                              <text
                                x={
                                  x +
                                  barWidth /
                                    2
                                }
                                y={
                                  yTop +
                                  segmentHeight /
                                    2 +
                                  4
                                }
                                textAnchor="middle"
                                fontSize="9"
                                fill="var(--color-ink)"
                              >
                                {Math.round(
                                  percentage
                                )}
                                %
                              </text>
                            )}
                        </g>
                      );
                    }
                  )}

                  {/* Total */}
                  <text
                    x={
                      x +
                      barWidth / 2
                    }
                    y={
                      scaleY(total) -
                      6
                    }
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="var(--color-ink)"
                  >
                    {total}
                  </text>

                  {/* Row name */}
                  <text
                    x={
                      x +
                      barWidth / 2
                    }
                    y={
                      height -
                      bottomPad +
                      20
                    }
                    textAnchor="middle"
                    fontSize="10"
                    fill="var(--color-ink-soft)"
                  >
                    {formatGroupName(row)
                      .length > 14
                      ? `${formatGroupName(
                          row
                        ).substring(
                          0,
                          12
                        )}…`
                      : formatGroupName(row)}
                  </text>
                </g>
              );
            }
          )}

          {/* Axes */}
          <line
            x1={leftPad}
            y1={topPad}
            x2={leftPad}
            y2={
              height -
              bottomPad
            }
            stroke="var(--color-ink)"
            strokeWidth="1.5"
          />

          <line
            x1={leftPad}
            y1={
              height -
              bottomPad
            }
            x2={width - rightPad}
            y2={
              height -
              bottomPad
            }
            stroke="var(--color-ink)"
            strokeWidth="1.5"
          />
        </svg>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 16px",
            marginTop: 6,
            fontSize: 11,
            color: "var(--color-ink-soft)",
          }}
        >
          {columnNames.map(
            (column, index) => (
              <div key={column}>
                {index + 1}.{" "}
                {formatGroupName(column)}
              </div>
            )
          )}
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--color-ink-soft)",
            marginTop: 6,
          }}
        >
          Counts shown as stacked categories; percentages
          indicate each group's composition
        </div>
      </div>
    );
  }

  return null;
}