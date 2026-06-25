import type { ChartData } from "@/utils/cylindricalStats";
import type { PiecewiseFitFailure, PiecewiseFitSuccess } from "@/utils/piecewiseRegression";
import { PIECEWISE_FAILURE_LABEL } from "@/lib/dev/piecewiseDev";

function isSuccess(
  outcome: PiecewiseFitSuccess | PiecewiseFitFailure,
): outcome is PiecewiseFitSuccess {
  return "result" in outcome;
}

function scaleLinear(
  value: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
) {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  const t = (value - domainMin) / (domainMax - domainMin);
  return rangeMin + t * (rangeMax - rangeMin);
}

export function PiecewiseChart({
  outcome,
  chartData,
}: {
  outcome: PiecewiseFitSuccess | PiecewiseFitFailure | null;
  chartData: ChartData | null;
}) {
  if (!outcome) {
    return <p className="cyl-diag__empty">데이터가 로드되지 않았습니다.</p>;
  }
  if (!isSuccess(outcome)) {
    return (
      <div className="cyl-diag__failure-box">
        <p className="cyl-diag__empty cyl-diag__empty--fail">
          {PIECEWISE_FAILURE_LABEL[outcome.reason] ?? outcome.reason}
        </p>
        <div className="cyl-diag__stats-sub">
          <span>정답 n = {outcome.rawCorrectCount}</span>
          <span>필터 후 = {outcome.filteredCount}</span>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.points.length === 0) {
    return <p className="cyl-diag__empty">시각화할 수 있는 데이터 포인트가 없습니다.</p>;
  }

  const { points, regressionSamples, xMax, domainYMin, domainYMax, yTickValues } = chartData;

  const WIDTH = 320;
  const HEIGHT = 120;
  const PAD = { top: 12, right: 8, bottom: 18, left: 32 };
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;

  const toSvgX = (x: number) => scaleLinear(x, 0, xMax, PAD.left, PAD.left + plotWidth);
  const toSvgY = (y: number) =>
    scaleLinear(y, domainYMin, domainYMax, PAD.top + plotHeight, PAD.top);

  const regressionPath = regressionSamples
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${toSvgX(point.x).toFixed(1)} ${toSvgY(point.y).toFixed(1)}`,
    )
    .join(" ");

  return (
    <div className="cyl-diag__chart-container">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="cyl-diag__svg"
        role="img"
        aria-label="모래시계 분절회귀 차트"
      >
        {yTickValues.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotWidth}
              y1={toSvgY(tick)}
              y2={toSvgY(tick)}
              stroke="rgba(255, 255, 255, 0.03)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={toSvgY(tick) + 3}
              textAnchor="end"
              fill="var(--text-muted)"
              fontSize={9}
              fontFamily="var(--font-mono)"
              opacity={0.8}
            >
              {Math.round(tick)}
            </text>
          </g>
        ))}
        <line
          x1={PAD.left}
          x2={PAD.left + plotWidth}
          y1={PAD.top + plotHeight}
          y2={PAD.top + plotHeight}
          stroke="var(--border-subtle)"
          opacity={0.3}
          strokeWidth={1}
        />
        <line
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top}
          y2={PAD.top + plotHeight}
          stroke="var(--border-subtle)"
          opacity={0.3}
          strokeWidth={1}
        />
        {points.map((point, index) => (
          <circle
            key={index}
            cx={toSvgX(point.x)}
            cy={toSvgY(point.y)}
            r={1.8}
            fill="var(--text-secondary)"
            opacity={0.45}
          />
        ))}
        <path
          d={regressionPath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
