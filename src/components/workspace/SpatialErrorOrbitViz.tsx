"use client";

import { useMemo } from "react";
import { buildLayout } from "@/lib/skdm/layout";
import {
  classifySpatialTypoDistance,
  SPATIAL_TYPO_CLASS_LABEL,
} from "@/lib/skdm/geometry";
import type { SpatialErrorDistanceResult } from "@/utils/cylindricalStats";
import type { KeyPosition } from "@/lib/skdm/types";

const VIEW_W = 340;
const VIEW_H = 118;
const HALF_KEY_U = 0.5;
const VIEW_PAD = 0.015;
const KEY_GAP_RATIO = 0.08;
const TYPO_DOT_MIN_RATIO = 0.26;
const TYPO_DOT_MAX_RATIO = 0.4;

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
  const viz = useMemo(() => {
    const layout = buildLayout();
    const targetKey = focusKey.toLowerCase();
    const targetPos = layout[targetKey];
    if (!targetPos) return null;

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
    const labelFontPx = Math.max(8, Math.min(13, keySizePx * 0.44));
    const labelBaselineOffset = keySizePx * 0.18;

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
      labelBaselineOffset,
      medianU,
      typoClass,
      keys: alphaKeys.map((k) => {
        const svg = toSvg(k.x, k.y);
        return {
          key: k.key,
          isTarget: k.key === targetKey,
          x: svg.x - keySizePx / 2,
          y: svg.y - keySizePx / 2,
        };
      }),
      typoMarkers: typoMarkers.map((m) => ({
        ...m,
        r: minDotR + (m.count / maxTypoCount) * (maxDotR - minDotR),
        opacity: 0.55 + (m.count / maxTypoCount) * 0.35,
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

        <g className="cyl-diag__spatial-typo-layer">
          {viz.typoMarkers.map((m) => (
            <circle
              key={m.key}
              className="cyl-diag__spatial-typo-dot"
              cx={m.x}
              cy={m.y}
              r={m.r}
              fillOpacity={m.opacity}
            />
          ))}
        </g>

        <g className="cyl-diag__spatial-key-labels">
          {viz.keys.map((k) => (
            <text
              key={k.key}
              className={`cyl-diag__spatial-key-label${k.isTarget ? " cyl-diag__spatial-key-label--center" : ""}`}
              x={k.x + viz.keySizePx / 2}
              y={k.y + viz.keySizePx / 2 + viz.labelBaselineOffset}
              textAnchor="middle"
              fontSize={viz.labelFontPx}
            >
              {k.key.toUpperCase()}
            </text>
          ))}
        </g>
      </svg>

      <div className="cyl-diag__spatial-summary">
        <span className="cyl-diag__spatial-summary-metric">
          중앙값 거리{" "}
          <strong>{viz.medianU.toFixed(2)} U</strong>
          <span className="cyl-diag__spatial-summary-sub"> (n={data.sampleCount})</span>
        </span>
        <span
          className={`cyl-diag__spatial-summary-badge cyl-diag__spatial-summary-badge--${viz.typoClass}`}
        >
          {SPATIAL_TYPO_CLASS_LABEL[viz.typoClass]}
        </span>
      </div>

      <p className="cyl-diag__card-desc cyl-diag__spatial-orbit-caption">
        정답 {focusKey.toUpperCase()} 대신 누른 키 — 핑크 원 크기 = 오타 빈도
      </p>
    </div>
  );
}
