/**
 * 2D keyboard geometry helpers on top of `buildLayout()` coordinates (U units).
 */

import { KEY_PITCH_MM, SPATIAL_ADJACENT_MAX_DISTANCE_U } from "./config";
import { buildLayout } from "./layout";
import type { KeyPosition } from "./types";

const DEFAULT_LAYOUT = buildLayout();

export function getKeyPosition(
  key: string,
  layout: Record<string, KeyPosition> = DEFAULT_LAYOUT,
): KeyPosition | undefined {
  return layout[key.toLowerCase()];
}

/** Euclidean distance between two keys in layout U units. */
export function keyDistanceU(
  keyA: string,
  keyB: string,
  layout: Record<string, KeyPosition> = DEFAULT_LAYOUT,
): number | null {
  const a = getKeyPosition(keyA, layout);
  const b = getKeyPosition(keyB, layout);
  if (!a || !b) return null;
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Euclidean distance between two keys in millimeters. */
export function keyDistanceMm(
  keyA: string,
  keyB: string,
  layout: Record<string, KeyPosition> = DEFAULT_LAYOUT,
): number | null {
  const distanceU = keyDistanceU(keyA, keyB, layout);
  if (distanceU === null) return null;
  return distanceU * KEY_PITCH_MM;
}

export type SpatialTypoClass = "adjacent" | "cognitive";

export const SPATIAL_TYPO_CLASS_LABEL: Record<SpatialTypoClass, string> = {
  adjacent: "인접 오타 (공간적 미끄러짐)",
  cognitive: "인지적 오타 (먼 키 혼동)",
};

/** Classify median typo distance as adjacent slip vs far-key confusion. */
export function classifySpatialTypoDistance(distanceU: number): SpatialTypoClass {
  return distanceU <= SPATIAL_ADJACENT_MAX_DISTANCE_U ? "adjacent" : "cognitive";
}
