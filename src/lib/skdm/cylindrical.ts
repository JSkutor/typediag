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
import { filterInterruptedTransitions, filterOutliers } from "./model";
import { getTheta, THETA_ORDER } from "./theta";

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
  
  for (const ev of validEvents) {
    if (!ev.fromKey) continue;
    const from = ev.fromKey.toLowerCase();
    const to = ev.toKey.toLowerCase();
    if (from === to) continue;
    if (!/^[a-z]$/.test(from) || !/^[a-z]$/.test(to)) continue;
    
    const key = `${from}->${to}`;
    const arr = buckets.get(key);
    if (arr) arr.push(ev.latencyMs);
    else buckets.set(key, [ev.latencyMs]);
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
 * Build cylindrical vectors for all keys that transition INTO `centerKey`.
 *
 * Returns one CylindricalVector per unique (fromKey → centerKey) pair,
 * sorted by theta (ascending).
 */
export function buildCylindricalVectors(
  events: KeyEvent[],
  centerKey: string,
  globalMax?: GlobalCylindricalMax
): CylindricalVector[] {
  const center = centerKey.toLowerCase();
  const cleaned = filterInterruptedTransitions(events);
  const [validEvents] = filterOutliers(cleaned);

  // Bucket latencies by fromKey
  const buckets = new Map<string, number[]>();
  for (const ev of validEvents) {
    if (ev.toKey.toLowerCase() !== center) continue;
    if (ev.fromKey === null) continue;
    const from = ev.fromKey.toLowerCase();
    if (from === center) continue;
    // Alphabetic keys only (skip modifiers and punctuation)
    if (!/^[a-z]$/.test(from)) continue;

    const arr = buckets.get(from);
    if (arr) arr.push(ev.latencyMs);
    else buckets.set(from, [ev.latencyMs]);
  }

  const order = THETA_ORDER[center] || [];
  const vectors: CylindricalVector[] = [];
  
  for (const fromKey of order) {
    const latencies = buckets.get(fromKey);
    const theta = getTheta(center, fromKey);
    const thetaDeg = (theta * 180) / Math.PI;
    const r = latencies ? latencies.length : 0;
    const z = latencies ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    
    let normalizedR: number | undefined;
    let normalizedZ: number | undefined;
    if (globalMax) {
      // Global square root normalization for R keeps relative differences visible.
      // If there is no data (r = 0), we set a minimum radius (e.g., 0.15) and height (e.g., 0.05)
      // to prevent the flower petal from completely collapsing to the center.
      normalizedR = r > 0 ? Math.sqrt(r / globalMax.maxR) : 0.15;
      normalizedZ = z > 0 ? z / globalMax.maxZ : 0.05;
    }
    
    vectors.push({ fromKey, theta, thetaDeg, r, z, normalizedR, normalizedZ });
  }

  vectors.sort((a, b) => a.theta - b.theta);
  return vectors;
}

/**
 * Returns all keys that appear as `toKey` in events (alphabetic only),
 * sorted alphabetically. These are valid center keys for cylindrical view.
 */
export function getAvailableCenterKeys(events: KeyEvent[]): string[] {
  const cleaned = filterInterruptedTransitions(events);
  const keys = new Set<string>();
  for (const ev of cleaned) {
    const key = ev.toKey.toLowerCase();
    if (/^[a-z]$/.test(key)) keys.add(key);
  }
  return Array.from(keys).sort();
}
