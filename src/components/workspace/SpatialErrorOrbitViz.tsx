"use client";

import { useId, useMemo } from "react";
import { buildLayout } from "@/lib/skdm/layout";
import { classifySpatialTypoDistance, SPATIAL_TYPO_CLASS_LABEL } from "@/lib/skdm/geometry";
import type { SpatialErrorDistanceResult } from "@/utils/cylindricalStats";
import type { KeyPosition } from "@/lib/skdm/types";

const VIEW_W = 340;
const VIEW_H = 132;
const HALF_KEY_U = 0.5;
const VIEW_PAD = 0.02;
const KEY_GAP_RATIO = 0.06;
const TYPO_DOT_MIN_RATIO = 0.34;
const TYPO_DOT_MAX_RATIO = 0.52;

function isAlphaKey(key: string) {
  return /^[a-z]$/.test(key);
}

function layoutBounds(keys: KeyPosition[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const k of keys) {
    minX = Math.min(minX, k.x - HALF_KEY_U);
    maxX = Math.max(maxX, k.x + HALF_KEY_U);
    minY = Math.min(minY, k.y - HALF_KEY_U);
    maxY = Math.max(maxY, k.y + HALF_KEY_U);
  }

  return { minX, maxX, minY, maxY };
}

interface SpatialErrorOrbitVizProps {
  focusKey: string;
  data: SpatialErrorDistanceResult;
}

export function SpatialErrorOrbitViz({ focusKey, data }: SpatialErrorOrbitVizProps) {
  const typoGlowId = useId().replace(/:/g, "");
  const viz = useMemo(() => {
    const layout = buildLayout();
    const focus = focusKey.toLowerCase();
    const focusPos = layout[focus];
    if (!focusPos) return null;

    const alphaKeys = Object.values(layout).filter((k) => isAlphaKey(k.key));
    const kbBounds = layoutBounds(alphaKeys);

    const keyboardCenterX = (kbBounds.minX + kbBounds.maxX) / 2;
    const keyboardCenterY = (kbBounds.minY + kbBounds.maxY) / 2;

    const kbW = kbBounds.maxX - kbBounds.minX;
    const kbH = kbBounds.maxY - kbBounds.minY;
    const unitPx = Math.min(
      (VIEW_W * (1 - VIEW_PAD * 2)) / kbW,
      (VIEW_H * (1 - VIEW_PAD * 2)) / kbH,
    );
    const keySizePx = unitPx * (1 - KEY_GAP_RATIO);
    const keyRadiusPx = Math.max(2.5, keySizePx * 0.2);
    const labelFontPx = Math.max(10.5, Math.min(15.5, keySizePx * 0.58));

    const toSvg = (lx: number, ly: number) => ({
      x: VIEW_W / 2 + (lx - keyboardCenterX) * unitPx,
      y: VIEW_H / 2 - (ly - keyboardCenterY) * unitPx,
    });

    const typoMarkers = Object.entries(data.typoCounts)
      .map(([key, count]) => {
        const pos = layout[key];
        if (!pos) return null;
        const svg = toSvg(pos.x, pos.y);
        return { key, count, ...svg };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    const maxTypoCount = Math.max(...typoMarkers.map((m) => m.count), 1);
    const minDotR = keySizePx * TYPO_DOT_MIN_RATIO;
    const maxDotR = keySizePx * TYPO_DOT_MAX_RATIO;

    const medianU = data.quartilesU.q2;
    const typoClass = classifySpatialTypoDistance(medianU);

    return {
      keySizePx,
      keyRadiusPx,
      labelFontPx,
      medianU,
      typoClass,
      keys: alphaKeys.map((k) => {
        const svg = toSvg(k.x, k.y);
        return {
          key: k.key,
          isTarget: k.key === focus,
          x: svg.x - keySizePx / 2,
          y: svg.y - keySizePx / 2,
        };
      }),
      typoMarkers: typoMarkers.map((m) => ({
        ...m,
        r: minDotR + (m.count / maxTypoCount) * (maxDotR - minDotR),
        opacity: 0.82 + (m.count / maxTypoCount) * 0.18,
      })),
    };
  }, [focusKey, data]);

  if (!viz) return null;

  return (
    <div className="cyl-diag__spatial-orbit">
      <svg
        className="cyl-diag__spatial-orbit-svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`${focusKey.toUpperCase()} 키 공간적 오타 분포`}
      >
        <defs>
          <radialGradient id={typoGlowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef5b5b" stopOpacity="0.88" />
            <stop offset="42%" stopColor="#ef5b5b" stopOpacity="0.42" />
            <stop offset="78%" stopColor="#ef5b5b" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ef5b5b" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className="cyl-diag__spatial-keys">
          {viz.keys.map((k) => (
            <rect
              key={k.key}
              className={`cyl-diag__spatial-key${k.isTarget ? " cyl-diag__spatial-key--center" : ""}`}
              x={k.x}
              y={k.y}
              width={viz.keySizePx}
              height={viz.keySizePx}
              rx={viz.keyRadiusPx}
            />
          ))}
        </g>

        <g className="cyl-diag__spatial-typo-halos">
          {viz.typoMarkers.map((m) => (
            <circle
              key={`halo-${m.key}`}
              className="cyl-diag__spatial-typo-halo"
              cx={m.x}
              cy={m.y}
              r={m.r}
              fill={`url(#${typoGlowId})`}
              opacity={m.opacity}
            />
          ))}
        </g>

        <g className="cyl-diag__spatial-key-labels">
          {viz.keys.map((k) => (
            <text
              key={k.key}
              className={`cyl-diag__spatial-key-label${k.isTarget ? " cyl-diag__spatial-key-label--center" : ""}`}
              x={k.x + viz.keySizePx / 2}
              y={k.y + viz.keySizePx / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={viz.labelFontPx}
            >
              {k.key.toUpperCase()}
            </text>
          ))}
        </g>
      </svg>

      <div className="cyl-diag__spatial-summary">
        <span className="cyl-diag__spatial-summary-metric">
          <span className="cyl-diag__spatial-summary-median">
            <span>중앙값</span>
            <strong>{viz.medianU.toFixed(2)} U</strong>
          </span>
          <span className="cyl-diag__penalty-count">{data.sampleCount}회</span>
        </span>
        <span
          className={`cyl-diag__spatial-summary-badge cyl-diag__spatial-summary-badge--${viz.typoClass}`}
        >
          {SPATIAL_TYPO_CLASS_LABEL[viz.typoClass]}
        </span>
      </div>
    </div>
  );
}
