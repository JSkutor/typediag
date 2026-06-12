/**
 * Cylindrical coordinate data extraction for SKDM Vector Visualizer.
 *
 * Given raw keystroke events and a center (To) key, produces cylindrical
 * coordinate vectors [θ, r, z] for all incoming (From) keys.
 *
 * θ = angular position from theta_order.json
 * r = transition frequency count
 * z = mean latency in ms
 */

import type { KeyEvent } from "./types";
import { filterBackspaces } from "./model";
import { getTheta } from "./theta";

/** A single cylindrical vector from a From Key to the Center (To) Key. */
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
}

/**
 * Build cylindrical vectors for all keys that transition INTO `centerKey`.
 *
 * Returns one CylindricalVector per unique (fromKey → centerKey) pair,
 * sorted by theta (ascending).
 */
export function buildCylindricalVectors(
  events: KeyEvent[],
  centerKey: string,
): CylindricalVector[] {
  const center = centerKey.toLowerCase();
  const cleaned = filterBackspaces(events);

  // Bucket latencies by fromKey
  const buckets = new Map<string, number[]>();
  for (const ev of cleaned) {
    if (ev.toKey.toLowerCase() !== center) continue;
    const from = ev.fromKey.toLowerCase();
    if (from === center) continue;
    // Alpha + punctuation keys only (skip modifiers)
    if (!/^[a-z,.]$/.test(from)) continue;

    const arr = buckets.get(from);
    if (arr) arr.push(ev.latencyMs);
    else buckets.set(from, [ev.latencyMs]);
  }

  const vectors: CylindricalVector[] = [];
  for (const [fromKey, latencies] of buckets) {
    const theta = getTheta(center, fromKey);
    const thetaDeg = (theta * 180) / Math.PI;
    const r = latencies.length;
    const z = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    vectors.push({ fromKey, theta, thetaDeg, r, z });
  }

  vectors.sort((a, b) => a.theta - b.theta);
  return vectors;
}

/**
 * Returns all keys that appear as `toKey` in events (alphabetic only),
 * sorted alphabetically. These are valid center keys for cylindrical view.
 */
export function getAvailableCenterKeys(events: KeyEvent[]): string[] {
  const cleaned = filterBackspaces(events);
  const keys = new Set<string>();
  for (const ev of cleaned) {
    const key = ev.toKey.toLowerCase();
    if (/^[a-z]$/.test(key)) keys.add(key);
  }
  return Array.from(keys).sort();
}
