function formatVariableName(name) {
  if (!name) return "";

  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bCgpa\b/g, "CGPA")
    .replace(/\bGpa\b/g, "GPA");
}

function formatTick(value) {
  if (!Number.isFinite(value)) {
    return "";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1);
}

export default function HistogramChart({
  distribution,
}) {
  if (!distribution) {
    return null;
  }

  const binEdges = Array.isArray(
    distribution.bin_edges
  )
    ? distribution.bin_edges
    : [];

  const counts = Array.isArray(
    distribution.counts
  )
    ? distribution.counts
    : [];

  const name = distribution.name;

  if (
    binEdges.length < 2 ||
    counts.length === 0
  ) {
    return null;
  }

  const maxCount =
    Math.max(...counts, 1);

  const width = 560;
  const height = 220;

  const leftPad = 45;
  const rightPad = 20;
  const topPad = 20;
  const bottomPad = 45;

  const chartWidth =
    width - leftPad - rightPad;

  const chartHeight =
    height - topPad - bottomPad;

  const barWidth =
    chartWidth / counts.length;

  const tickIndexes = [
    0,
    Math.floor(
      (binEdges.length - 1) / 4
    ),
    Math.floor(
      (binEdges.length - 1) / 2
    ),
    Math.floor(
      ((binEdges.length - 1) * 3) /
        4
    ),
    binEdges.length - 1,
  ];

  const uniqueTickIndexes = [
    ...new Set(tickIndexes),
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 13,
          color: "var(--color-ink-soft)",
          marginBottom: 4,
        }}
      >
        Distribution of{" "}
        {formatVariableName(name)}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
        }}
        role="img"
        aria-label={`Histogram showing the distribution of ${formatVariableName(
          name
        )}`}
      >
        {/* Horizontal guide line */}
        <line
          x1={leftPad}
          x2={width - rightPad}
          y1={topPad + chartHeight}
          y2={topPad + chartHeight}
          stroke="var(--color-ink)"
          strokeWidth="1.5"
        />

        {/* Bars */}
        {counts.map((count, index) => {
          const numericCount =
            Number(count) || 0;

          const barHeight =
            (numericCount /
              maxCount) *
            chartHeight;

          const x =
            leftPad +
            index * barWidth;

          const y =
            topPad +
            chartHeight -
            barHeight;

          return (
            <rect
              key={index}
              x={x + 1}
              y={y}
              width={Math.max(
                0,
                barWidth - 2
              )}
              height={barHeight}
              fill="var(--color-ink)"
              opacity="0.7"
              rx="2"
            />
          );
        })}

        {/* Y-axis maximum */}
        <text
          x={leftPad - 7}
          y={topPad + 4}
          textAnchor="end"
          fontSize="10"
          fill="var(--color-ink-soft)"
        >
          {maxCount}
        </text>

        {/* Y-axis zero */}
        <text
          x={leftPad - 7}
          y={
            topPad +
            chartHeight +
            4
          }
          textAnchor="end"
          fontSize="10"
          fill="var(--color-ink-soft)"
        >
          0
        </text>

        {/* X-axis ticks */}
        {uniqueTickIndexes.map(
          (index) => {
            const value =
              Number(
                binEdges[index]
              );

            if (!Number.isFinite(value)) {
              return null;
            }

            const x =
              leftPad +
              (index /
                (binEdges.length - 1)) *
                chartWidth;

            return (
              <g key={index}>
                <line
                  x1={x}
                  x2={x}
                  y1={
                    topPad +
                    chartHeight
                  }
                  y2={
                    topPad +
                    chartHeight +
                    5
                  }
                  stroke="var(--color-ink)"
                  strokeWidth="1"
                />

                <text
                  x={x}
                  y={
                    topPad +
                    chartHeight +
                    20
                  }
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--color-ink-soft)"
                >
                  {formatTick(value)}
                </text>
              </g>
            );
          }
        )}
      </svg>
    </div>
  );
}