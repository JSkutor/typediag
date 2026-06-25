"use client";

import type { CloudTypingScatterPoint } from "@/lib/dev/cloudTypingDev";
import {
  CLOUD_TYPING_DEV_ND_MAX,
  traceDevCloudBandPolygon,
} from "@/lib/dev/cloudTypingDev";

interface DevCloudTypingScatterChartProps {
  analysisPoints: CloudTypingScatterPoint[];
  excludedPoints: CloudTypingScatterPoint[];
  focusKey: string;
  minDenomMs: number;
}

const WIDTH = 720;
const HEIGHT = 420;
const PAD = { top: 24, right: 24, bottom: 52, left: 56 };

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

function buildLinearTicks(domainMax: number, count: number): number[] {
  const step = domainMax / (count - 1);
  return Array.from({ length: count }, (_, i) =>
    Number((i * step).toFixed(0)),
  );
}

export function DevCloudTypingScatterChart({
  analysisPoints,
  excludedPoints,
  focusKey,
  minDenomMs,
}: DevCloudTypingScatterChartProps) {
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;

  const allPoints = [...analysisPoints, ...excludedPoints];
  const xValues = allPoints.map((p) => p.holdMs);
  const yValues = allPoints.map((p) => p.latencyMs);
  const xMax = xValues.length > 0 ? Math.max(...xValues, 100) : 150;
  const yMax = yValues.length > 0 ? Math.max(...yValues, 100) : 150;
  const paddingX = Math.max(10, xMax * 0.08);
  const paddingY = Math.max(10, yMax * 0.08);
  const domainXMax = xMax + paddingX;
  const domainYMax = yMax + paddingY;

  const toSvgX = (holdMs: number) =>
    scaleLinear(holdMs, 0, domainXMax, PAD.left, PAD.left + plotWidth);
  const toSvgY = (latencyMs: number) =>
    scaleLinear(latencyMs, 0, domainYMax, PAD.top + plotHeight, PAD.top);

  const xTickValues = buildLinearTicks(domainXMax, 6);
  const yTickValues = buildLinearTicks(domainYMax, 6);

  const bandPath = traceDevCloudBandPolygon(
    domainXMax,
    domainYMax,
    CLOUD_TYPING_DEV_ND_MAX,
    minDenomMs,
  )
    .map((point) => `${toSvgX(point.hold)},${toSvgY(point.latency)}`)
    .join(" ");

  const diagonalEnd = Math.min(domainXMax, domainYMax);

  const renderPoint = (point: CloudTypingScatterPoint, index: number, prefix: string) => {
    const fill = !point.inAnalysisPool
      ? "var(--text-muted)"
      : point.isCloudStroke
        ? "var(--accent)"
        : "var(--text-secondary)";
    const opacity = point.inAnalysisPool ? 0.88 : 0.45;

    return (
      <circle
        key={`${prefix}-${index}`}
        cx={toSvgX(point.holdMs)}
        cy={toSvgY(point.latencyMs)}
        r={point.inAnalysisPool ? 4.5 : 4}
        fill={fill}
        opacity={opacity}
        stroke={point.inAnalysisPool && point.isCloudStroke ? "var(--accent-hover)" : "none"}
        strokeWidth={1}
      >
        <title>
          {focusKey}→{point.toKey}: hold={point.holdMs.toFixed(1)}ms, latency={point.latencyMs.toFixed(1)}ms
          , ND={point.normalizedDifference.toFixed(3)}
          {point.isCloudStroke ? " (cloud stroke)" : ""}
          {!point.inAnalysisPool ? " (머뭇거림 제외)" : ""}
        </title>
      </circle>
    );
  };

  return (
    <svg
      className="cloud-typing-scatter-chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`${focusKey} raw hold vs latency scatter`}
    >
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="var(--bg-inset)" rx={12} />

      <polygon points={bandPath} fill="var(--accent)" opacity={0.1} />

      {yTickValues.map((tick) => (
        <g key={`y-${tick}`}>
          <line
            x1={PAD.left}
            x2={PAD.left + plotWidth}
            y1={toSvgY(tick)}
            y2={toSvgY(tick)}
            stroke="var(--border-subtle)"
          />
          <text
            x={PAD.left - 8}
            y={toSvgY(tick) + 4}
            textAnchor="end"
            fill="var(--text-muted)"
            fontSize={11}
            fontFamily="var(--font-mono)"
          >
            {tick}
          </text>
        </g>
      ))}

      {xTickValues.map((tick) => (
        <g key={`x-${tick}`}>
          <line
            x1={toSvgX(tick)}
            x2={toSvgX(tick)}
            y1={PAD.top}
            y2={PAD.top + plotHeight}
            stroke="var(--border-subtle)"
            strokeDasharray="2 2"
            opacity={0.4}
          />
          <text
            x={toSvgX(tick)}
            y={PAD.top + plotHeight + 16}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize={11}
            fontFamily="var(--font-mono)"
          >
            {tick}
          </text>
        </g>
      ))}

      <line
        x1={toSvgX(0)}
        x2={toSvgX(diagonalEnd)}
        y1={toSvgY(0)}
        y2={toSvgY(diagonalEnd)}
        stroke="var(--text-muted)"
        strokeDasharray="4 4"
        opacity={0.35}
      />

      <line
        x1={PAD.left}
        x2={PAD.left + plotWidth}
        y1={PAD.top + plotHeight}
        y2={PAD.top + plotHeight}
        stroke="var(--border-strong)"
      />
      <line
        x1={PAD.left}
        x2={PAD.left}
        y1={PAD.top}
        y2={PAD.top + plotHeight}
        stroke="var(--border-strong)"
      />

      {excludedPoints.map((point, index) => renderPoint(point, index, "ex"))}
      {analysisPoints.map((point, index) => renderPoint(point, index, "in"))}

      <text
        x={PAD.left + plotWidth / 2}
        y={HEIGHT - 8}
        textAnchor="middle"
        fill="var(--text-secondary)"
        fontSize={12}
      >
        D, L 원본(ms) 축 · 최소 분모 M={minDenomMs}ms · ND=|L-D|/max(L+D, M) ≤ {CLOUD_TYPING_DEV_ND_MAX}
      </text>
    </svg>
  );
}
