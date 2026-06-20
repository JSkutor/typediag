"use client";

import type { PiecewiseResult } from "@/utils/piecewiseRegression";

interface PiecewiseRegressionChartProps {
  points: Array<{ x: number; y: number }>;
  result: PiecewiseResult;
  breakpointC0: number;
}

const WIDTH = 720;
const HEIGHT = 360;
const PAD = { top: 24, right: 24, bottom: 44, left: 56 };

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

export function PiecewiseRegressionChart({
  points,
  result,
  breakpointC0,
}: PiecewiseRegressionChartProps) {
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;

  const xMax = points.length > 0 ? Math.max(...points.map((p) => p.x)) : 1;
  const yValues = points.map((p) => p.y);
  const regressionSamples = [
    { x: 0, y: result.predict(0) },
    { x: result.c, y: result.predict(result.c) },
    { x: xMax, y: result.predict(xMax) },
  ];

  const yMin = Math.min(...yValues, ...regressionSamples.map((p) => p.y));
  const yMax = Math.max(...yValues, ...regressionSamples.map((p) => p.y));
  const yPadding = Math.max(8, (yMax - yMin) * 0.08);
  const domainYMin = yMin - yPadding;
  const domainYMax = yMax + yPadding;

  const toSvgX = (x: number) => scaleLinear(x, 0, xMax, PAD.left, PAD.left + plotWidth);
  const toSvgY = (y: number) =>
    scaleLinear(y, domainYMin, domainYMax, PAD.top + plotHeight, PAD.top);

  const regressionPath = regressionSamples
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${toSvgX(point.x).toFixed(2)} ${toSvgY(point.y).toFixed(2)}`,
    )
    .join(" ");

  const yTicks = 5;
  const tickValues = Array.from({ length: yTicks }, (_, i) => {
    const t = i / (yTicks - 1);
    return domainYMin + t * (domainYMax - domainYMin);
  });

  const xTicks = 5;
  const xTickValues = Array.from({ length: xTicks }, (_, i) => {
    const t = i / (xTicks - 1);
    return t * xMax;
  });

  return (
    <svg
      className="piecewise-chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="분절 회귀 scatter 및 회귀선"
    >
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="var(--bg-inset)" rx={12} />

      {tickValues.map((tick) => (
        <g key={tick}>
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
            {Math.round(tick)}
          </text>
        </g>
      ))}

      {xTickValues.map((tick) => (
        <g key={tick}>
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
            {Math.round(tick)}
          </text>
        </g>
      ))}

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

      <line
        x1={toSvgX(result.c)}
        x2={toSvgX(result.c)}
        y1={PAD.top}
        y2={PAD.top + plotHeight}
        stroke="var(--accent)"
        strokeDasharray="6 4"
        opacity={0.75}
      />
      <line
        x1={toSvgX(breakpointC0)}
        x2={toSvgX(breakpointC0)}
        y1={PAD.top}
        y2={PAD.top + plotHeight}
        stroke="var(--text-muted)"
        strokeDasharray="3 5"
        opacity={0.55}
      />

      <path d={regressionPath} fill="none" stroke="var(--accent-hover)" strokeWidth={2.5} />

      {points.map((point, index) => (
        <circle
          key={index}
          cx={toSvgX(point.x)}
          cy={toSvgY(point.y)}
          r={3.2}
          fill="var(--text-secondary)"
          opacity={0.85}
        />
      ))}

      <text x={PAD.left} y={HEIGHT - 14} fill="var(--text-secondary)" fontSize={12}>
        X: 해당 키 정답 입력 순서 (0 … {xMax})
      </text>
      <text
        x={PAD.left + plotWidth}
        y={HEIGHT - 14}
        textAnchor="end"
        fill="var(--text-muted)"
        fontSize={11}
        fontFamily="var(--font-mono)"
      >
        c={result.c.toFixed(1)} · c₀={breakpointC0.toFixed(1)}
      </text>
    </svg>
  );
}
