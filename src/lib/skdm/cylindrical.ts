/**
 * Cylindrical coordinate data extraction for SKDM Vector Visualizer.
 *
 * Given raw keystroke events and a focusKey, produces cylindrical
 * coordinate vectors [θ, r, z] for all incoming reference transitions
 * (fromKey → focusKey where toKey === focusKey).
 *
 * θ = angular position from theta_order.json
 * r = transition frequency count
 * z = mean latency in ms
 */

import { CYLINDRICAL_MIN_NORMALIZED_R } from "@/components/workspace/geometryUtils";
import type { KeyEvent } from "./types";
import { filterInterruptedTransitions, filterOutliers } from "./model";
import { getTheta, THETA_ORDER } from "./theta";

/** A single cylindrical vector for one reference transition (fromKey → focusKey). */
export interface CylindricalVector {
  fromKey: string;
  /** Angular position in radians (0–2π). */
  theta: number;
  /** Angular position in degrees (0–360). */
  thetaDeg: number;
  /** Transition frequency count. */
  r: number;
  /** Mean transition latency in milliseconds. */
  z: number;
  /** Normalized frequency [0.0 - 1.0] relative to global max frequency. */
  normalizedR?: number;
  /** Normalized latency [0.0 - 1.0] relative to global max latency. */
  normalizedZ?: number;
}

export interface GlobalCylindricalMax {
  maxR: number;
  maxZ: number;
}

/** Compute the absolute maximum r (frequency) and z (latency) across all key pairs in the dataset. */
export function getGlobalCylindricalMax(events: KeyEvent[]): GlobalCylindricalMax {
  const cleaned = filterInterruptedTransitions(events);
  const [validEvents] = filterOutliers(cleaned);
  const buckets = new Map<string, number[]>();

  for (const event of validEvents) {
    if (!event.fromKey) continue;
    const from = event.fromKey.toLowerCase();
    const to = event.toKey.toLowerCase();
    if (from === to) continue;
    if (!/^[a-z]$/.test(from) || !/^[a-z]$/.test(to)) continue;

    const key = `${from}->${to}`;
    const arr = buckets.get(key);
    if (arr) arr.push(event.latencyMs);
    else buckets.set(key, [event.latencyMs]);
  }

  let maxR = 0;
  let maxZ = 0;
  for (const latencies of buckets.values()) {
    if (latencies.length > maxR) maxR = latencies.length;
    const avgZ = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    if (avgZ > maxZ) maxZ = avgZ;
  }

  return { maxR: Math.max(maxR, 1), maxZ: Math.max(maxZ, 1) };
}

/**
 * Build cylindrical vectors for all reference transitions into `focusKey`
 * (toKey === focusKey).
 *
 * Returns one CylindricalVector per unique (fromKey → focusKey) transition,
 * sorted by theta (ascending).
 */
export function buildCylindricalVectors(
  events: KeyEvent[],
  focusKey: string,
  globalMax?: GlobalCylindricalMax,
): CylindricalVector[] {
  const focus = focusKey.toLowerCase();
  const cleaned = filterInterruptedTransitions(events);
  const [validEvents] = filterOutliers(cleaned);

  // Bucket latencies by fromKey (reference transition sources)
  const buckets = new Map<string, number[]>();
  for (const event of validEvents) {
    if (event.toKey.toLowerCase() !== focus) continue;
    if (event.fromKey === null) continue;
    const from = event.fromKey.toLowerCase();
    if (from === focus) continue;
    // Alphabetic keys only (skip modifiers and punctuation)
    if (!/^[a-z]$/.test(from)) continue;

    const arr = buckets.get(from);
    if (arr) arr.push(event.latencyMs);
    else buckets.set(from, [event.latencyMs]);
  }

  const order = THETA_ORDER[focus] || [];
  const vectors: CylindricalVector[] = [];

  for (const fromKey of order) {
    const latencies = buckets.get(fromKey);
    const theta = getTheta(focus, fromKey);
    const thetaDeg = (theta * 180) / Math.PI;
    const r = latencies ? latencies.length : 0;
    const z = latencies ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

    let normalizedR: number | undefined;
    let normalizedZ: number | undefined;
    if (globalMax) {
      // Global square root normalization for R keeps relative differences visible.
      // If there is no data (r = 0), use a floor normalizedR so the petal rim stays off origin.
      normalizedR = r > 0 ? Math.sqrt(r / globalMax.maxR) : CYLINDRICAL_MIN_NORMALIZED_R;
      normalizedZ = z > 0 ? z / globalMax.maxZ : 0.05;
    }

    vectors.push({ fromKey, theta, thetaDeg, r, z, normalizedR, normalizedZ });
  }

  vectors.sort((a, b) => a.theta - b.theta);
  return vectors;
}

/**
 * Returns all keys that can serve as focusKey (alphabetic toKey in events),
 * sorted alphabetically.
 */
export function getAvailableFocusKeys(events: KeyEvent[]): string[] {
  const cleaned = filterInterruptedTransitions(events);
  const keys = new Set<string>();
  for (const event of cleaned) {
    const key = event.toKey.toLowerCase();
    if (/^[a-z]$/.test(key)) keys.add(key);
  }
  return Array.from(keys).sort();
}

export interface CylindricalSelection {
  focusKey: string;
  fromKey: string;
}

/** Pick the map entry with the highest count; ties break alphabetically. */
function pickMaxCountKey(counts: Map<string, number>): string | null {
  let bestKey: string | null = null;
  let bestCount = -1;

  for (const [key, count] of counts) {
    if (count > bestCount || (count === bestCount && bestKey !== null && key < bestKey)) {
      bestCount = count;
      bestKey = key;
    }
  }

  return bestKey;
}

/** Count unique incoming fromKeys per focusKey (reference transition 집계). */
function countIncomingReferenceTransitions(events: KeyEvent[]): Map<string, number> {
  const cleaned = filterInterruptedTransitions(events);
  const [validEvents] = filterOutliers(cleaned);
  const uniqueFromKeys = new Map<string, Set<string>>();

  for (const event of validEvents) {
    if (event.fromKey === null) continue;
    const from = event.fromKey.toLowerCase();
    const to = event.toKey.toLowerCase();
    if (from === to) continue;
    if (!/^[a-z]$/.test(from) || !/^[a-z]$/.test(to)) continue;

    let set = uniqueFromKeys.get(to);
    if (!set) {
      set = new Set<string>();
      uniqueFromKeys.set(to, set);
    }
    set.add(from);
  }

  const counts = new Map<string, number>();
  for (const [focusKey, set] of uniqueFromKeys.entries()) {
    counts.set(focusKey, set.size);
  }

  return counts;
}

/**
 * Default focusKey / fromKey selection for the cylindrical view.
 * Chooses the focusKey with the most incoming reference transitions, then the
 * fromKey with the highest mean latency (z). An optional preferred focusKey
 * is used when it has data; otherwise falls back to the richest focusKey.
 */
export function getDefaultCylindricalSelection(
  events: KeyEvent[],
  preferredFocusKey?: string,
): CylindricalSelection | null {
  const focusCounts = countIncomingReferenceTransitions(events);
  if (focusCounts.size === 0) return null;

  const preferred = preferredFocusKey?.toLowerCase();
  const focusKey =
    preferred && /^[a-z]$/.test(preferred) && focusCounts.has(preferred)
      ? preferred
      : pickMaxCountKey(focusCounts);

  if (!focusKey) return null;

  const vectors = buildCylindricalVectors(events, focusKey);
  const withData = vectors.filter((v) => v.r > 0);
  if (withData.length === 0) {
    return { focusKey, fromKey: vectors[0]?.fromKey ?? "" };
  }

  const slowestFrom = withData.reduce((best, v) =>
    v.z > best.z || (v.z === best.z && v.fromKey < best.fromKey) ? v : best,
  );

  return { focusKey, fromKey: slowestFrom.fromKey };
}
