"use client";

import type { CloudTypingScatterPoint } from "@/lib/dev/cloudTypingDev";

interface DevCloudTypingScatterChartProps {
  points: CloudTypingScatterPoint[];
  centerKey: string;
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

export function DevCloudTypingScatterChart({ points, centerKey }: DevCloudTypingScatterChartProps) {
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;

  const xValues = points.map((p) => p.durationMs);
  const yValues = points.map((p) => p.latencyMs);
  const xMax = xValues.length > 0 ? Math.max(...xValues, 1) : 1;
  const yMax = yValues.length > 0 ? Math.max(...yValues, 1) : 1;
  const paddingX = Math.max(8, xMax * 0.06);
  const paddingY = Math.max(8, yMax * 0.06);
  const domainXMax = xMax + paddingX;
  const domainYMax = yMax + paddingY;

  const toSvgX = (x: number) => scaleLinear(x, 0, domainXMax, PAD.left, PAD.left + plotWidth);
  const toSvgY = (y: number) =>
    scaleLinear(y, 0, domainYMax, PAD.top + plotHeight, PAD.top);

  const xTicks = 5;
  const yTicks = 5;
  const xTickValues = Array.from({ length: xTicks }, (_, i) => (i / (xTicks - 1)) * domainXMax);
  const yTickValues = Array.from({ length: yTicks }, (_, i) => (i / (yTicks - 1)) * domainYMax);

  const diagonalEnd = Math.min(domainXMax, domainYMax);

  return (
    <svg
      className="cloud-typing-scatter-chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`${centerKey} outgoing hold vs latency scatter`}
    >
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="var(--bg-inset)" rx={12} />

      {yTickValues.map((tick) => (
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

      {points.map((point, index) => (
        <circle
          key={index}
          cx={toSvgX(point.durationMs)}
          cy={toSvgY(point.latencyMs)}
          r={4}
          fill="var(--accent)"
          opacity={0.82}
        >
          <title>
            {centerKey}→{point.toKey}: hold={point.durationMs}ms, latency={point.latencyMs}ms
          </title>
        </circle>
      ))}

      <text
        x={PAD.left + plotWidth / 2}
        y={HEIGHT - 8}
        textAnchor="middle"
        fill="var(--text-secondary)"
        fontSize={12}
      >
        X: center({centerKey}) holdDurationMs · Y: 기준 쌍 latencyMs
      </text>
    </svg>
  );
}
