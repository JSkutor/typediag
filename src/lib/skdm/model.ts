/**
 * SKDM core math model. Direct TypeScript port of `skdm/model.py`.
 *
 * Pipeline: raw keystroke log -> pair aggregation -> per-key summary ->
 * Delaunay mesh + Graph-Laplacian smoothing -> points for a 3D surface.
 */

import { Delaunay } from "d3-delaunay";

import {
  EXCLUDE_ROWS,
  FREQUENCY_WEIGHT_POWER,
  LAPLACIAN_ITERATIONS,
  LAPLACIAN_SMOOTHING_ALPHA,
  OUTLIER_IQR_MIN_EVENTS,
  OUTLIER_IQR_MULTIPLIER,
  OUTLIER_STATIC_MAX_MS,
} from "./config";
import { mean, median, percentile, std } from "./stats";
import type { KeyEvent, KeyPosition, KeyResult, PairStat } from "./types";

const PAIR_SEP = "\u0000";
const pairKey = (from: string, self: string) => `${from}${PAIR_SEP}${self}`;

// ---------------------------------------------------------------------------
// 1. Pre-processing
// ---------------------------------------------------------------------------

/**
 * Convert one latency (ms) to a [0, 1] sigmoid value.
 * Insensitive for short times, sensitive in the middle, saturating for long.
 */
export function sigmoidLatency(latencyMs: number, maxClipMs: number): number {
  const t = Math.max(0.0, Math.min(maxClipMs, latencyMs));
  const center = maxClipMs * 0.4;
  const denom = maxClipMs - center;
  const steepness = denom > 0 ? 4.6 / denom : 0.02;

  const x = steepness * (t - center);
  return 1.0 / (1.0 + Math.exp(-x));
}

/**
 * Remove typo transitions using backspaces as anchors, keeping only the
 * clean stretches of normal typing.
 */
export function filterBackspaces(events: KeyEvent[]): KeyEvent[] {
  // Logical stack tracking text assembly: [selfKey, originating event | null].
  const stack: Array<[string, KeyEvent | null]> = [];

  for (const ev of events) {
    const sKey = ev.selfKey.toLowerCase();
    const fKey = ev.fromKey.toLowerCase();

    if (sKey === "backspace") {
      if (stack.length > 0) stack.pop();
    } else if (fKey === "backspace") {
      // First normal key after a backspace: flow is broken, drop the transition.
      stack.push([sKey, null]);
    } else {
      stack.push([sKey, ev]);
    }
  }

  const cleaned: KeyEvent[] = [];
  for (const [, ev] of stack) {
    if (ev !== null) cleaned.push(ev);
  }
  return cleaned;
}

/**
 * Remove upper outliers and return the effective max latency (clip bound).
 * Static 1500ms cutoff below the IQR threshold, dynamic log-IQR above it.
 */
export function filterOutliers(events: KeyEvent[]): [KeyEvent[], number] {
  if (events.length < OUTLIER_IQR_MIN_EVENTS) {
    const cutoff = OUTLIER_STATIC_MAX_MS;
    const validEvents = events.filter((ev) => ev.latencyMs <= cutoff);
    const maxObserved =
      validEvents.length > 0
        ? Math.max(...validEvents.map((ev) => ev.latencyMs))
        : cutoff;
    return [validEvents, maxObserved];
  }

  const latencies = events
    .filter((ev) => ev.latencyMs > 0)
    .map((ev) => ev.latencyMs);
  if (latencies.length === 0) {
    const maxObserved =
      events.length > 0
        ? Math.max(...events.map((ev) => ev.latencyMs))
        : OUTLIER_STATIC_MAX_MS;
    return [events, maxObserved];
  }

  const logLatencies = latencies.map((v) => Math.log(v));
  const q1 = percentile(logLatencies, 25);
  const q3 = percentile(logLatencies, 75);
  const iqr = q3 - q1;
  const upperBound = Math.exp(q3 + OUTLIER_IQR_MULTIPLIER * iqr);

  const validEvents = events.filter((ev) => ev.latencyMs <= upperBound);
  const maxObserved =
    validEvents.length > 0
      ? Math.max(...validEvents.map((ev) => ev.latencyMs))
      : upperBound;

  return [validEvents, maxObserved];
}

/** Aggregate raw events into (from, self) pair statistics. */
export function aggregatePairs(
  events: KeyEvent[],
): Map<string, PairStat> {
  const [validEvents, maxClipMs] = filterOutliers(events);

  const buckets = new Map<string, number[]>();
  const meta = new Map<string, { fromKey: string; selfKey: string }>();
  for (const ev of validEvents) {
    const key = pairKey(ev.fromKey, ev.selfKey);
    const sig = sigmoidLatency(ev.latencyMs, maxClipMs);
    const arr = buckets.get(key);
    if (arr) {
      arr.push(sig);
    } else {
      buckets.set(key, [sig]);
      meta.set(key, { fromKey: ev.fromKey, selfKey: ev.selfKey });
    }
  }

  const stats = new Map<string, PairStat>();
  for (const [key, sigValues] of buckets) {
    if (sigValues.length === 0) continue;
    const { fromKey, selfKey } = meta.get(key)!;
    stats.set(key, {
      fromKey,
      selfKey,
      frequency: sigValues.length,
      z: mean(sigValues),
    });
  }
  return stats;
}

// ---------------------------------------------------------------------------
// 2. Per-key summary (frequency-weighted average)
// ---------------------------------------------------------------------------

/** Summarize incoming pairs into one representative value per key. */
export function summarizeKeys(
  pairStats: Map<string, PairStat>,
  layout: Record<string, KeyPosition>,
  validEvents: KeyEvent[] = [],
): Record<string, KeyResult> {
  const incoming = new Map<string, PairStat[]>();
  const allZs: number[] = [];
  for (const stat of pairStats.values()) {
    const list = incoming.get(stat.selfKey);
    if (list) list.push(stat);
    else incoming.set(stat.selfKey, [stat]);
    allZs.push(stat.z);
  }

  const sessionMedianZ = allZs.length > 0 ? median(allZs) : 0.0;

  const latenciesPerKey = new Map<string, number[]>();
  for (const ev of validEvents) {
    const list = latenciesPerKey.get(ev.selfKey);
    if (list) list.push(ev.latencyMs);
    else latenciesPerKey.set(ev.selfKey, [ev.latencyMs]);
  }

  const allStdevs: number[] = [];
  for (const keyLats of latenciesPerKey.values()) {
    if (keyLats.length >= 2) allStdevs.push(std(keyLats));
  }
  const sessionMedianStdev = allStdevs.length > 0 ? median(allStdevs) : 0.0;

  const results: Record<string, KeyResult> = {};
  for (const [key, pos] of Object.entries(layout)) {
    if (EXCLUDE_ROWS.has(pos.row)) continue;

    const stats = incoming.get(key) ?? [];

    const keyLatencies = latenciesPerKey.get(key) ?? [];
    const keyStdev =
      keyLatencies.length >= 2 ? std(keyLatencies) : sessionMedianStdev;

    if (stats.length === 0) {
      results[key] = {
        key,
        row: pos.row,
        x: pos.x,
        y: pos.y,
        z: sessionMedianZ,
        confidence: 0.0,
        stdev: sessionMedianStdev,
        zSmoothed: 0.0,
        stdevSmoothed: 0.0,
      };
      continue;
    }

    let totalW = 0;
    let weightedZ = 0;
    let totalFreq = 0;
    for (const s of stats) {
      const w = Math.pow(s.frequency, FREQUENCY_WEIGHT_POWER);
      totalW += w;
      weightedZ += w * s.z;
      totalFreq += s.frequency;
    }
    const zRep = totalW > 0 ? weightedZ / totalW : 0.0;

    results[key] = {
      key,
      row: pos.row,
      x: pos.x,
      y: pos.y,
      z: zRep,
      confidence: totalFreq,
      stdev: keyStdev,
      zSmoothed: 0.0,
      stdevSmoothed: 0.0,
    };
  }
  return results;
}

// ---------------------------------------------------------------------------
// 3. Mesh + confidence propagation (Delaunay + Graph Laplacian)
// ---------------------------------------------------------------------------

/** Build the Delaunay triangulation of the keys' (x, y) coordinates. */
export function triangulate(
  results: Record<string, KeyResult>,
  keys?: string[],
): { keys: string[]; triangles: Uint32Array } {
  const orderedKeys = keys ?? Object.keys(results);
  const points: Array<[number, number]> = orderedKeys.map((k) => [
    results[k].x,
    results[k].y,
  ]);
  const delaunay = Delaunay.from(points);
  return { keys: orderedKeys, triangles: delaunay.triangles };
}

/** Build the undirected neighbour graph from triangulation simplices. */
export function buildAdjacency(triangles: Uint32Array): Map<number, Set<number>> {
  const adj = new Map<number, Set<number>>();
  const add = (i: number, j: number) => {
    let set = adj.get(i);
    if (!set) {
      set = new Set<number>();
      adj.set(i, set);
    }
    set.add(j);
  };

  for (let t = 0; t < triangles.length; t += 3) {
    const simplex = [triangles[t], triangles[t + 1], triangles[t + 2]];
    for (const i of simplex) {
      for (const j of simplex) {
        if (i !== j) add(i, j);
      }
    }
  }
  return adj;
}

/**
 * Graph-Laplacian local smoothing that propagates values to neighbour keys.
 * Low-confidence keys are pulled harder towards the neighbour mean
 * (alpha_i = ALPHA * (1 - normConf_i)), filling empty/uncertain keys.
 */
export function smooth(
  results: Record<string, KeyResult>,
): Record<string, KeyResult> {
  const keys = Object.keys(results);

  // Degenerate guard: Delaunay needs >= 3 non-collinear points.
  if (keys.length < 3) {
    for (const k of keys) {
      results[k].zSmoothed = results[k].z;
      results[k].stdevSmoothed = results[k].stdev;
    }
    return results;
  }

  const { keys: orderedKeys, triangles } = triangulate(results, keys);
  const adj = buildAdjacency(triangles);

  let z = orderedKeys.map((k) => results[k].z);
  let stdev = orderedKeys.map((k) => results[k].stdev);
  const conf = orderedKeys.map((k) => results[k].confidence);

  const maxConfRaw = conf.length > 0 ? Math.max(...conf) : 0;
  const maxConf = maxConfRaw > 0 ? maxConfRaw : 1.0;
  const normConf = conf.map((c) => c / maxConf);

  for (let iter = 0; iter < LAPLACIAN_ITERATIONS; iter++) {
    const newZ = [...z];
    const newStdev = [...stdev];
    for (let i = 0; i < orderedKeys.length; i++) {
      const neighbors = adj.get(i);
      if (!neighbors || neighbors.size === 0) continue;
      const neighborMeanZ = mean([...neighbors].map((j) => z[j]));
      const neighborMeanStdev = mean([...neighbors].map((j) => stdev[j]));
      const alpha = LAPLACIAN_SMOOTHING_ALPHA * (1.0 - normConf[i]);
      newZ[i] = (1.0 - alpha) * z[i] + alpha * neighborMeanZ;
      newStdev[i] = (1.0 - alpha) * stdev[i] + alpha * neighborMeanStdev;
    }
    z = newZ;
    stdev = newStdev;
  }

  orderedKeys.forEach((k, idx) => {
    results[k].zSmoothed = z[idx];
    results[k].stdevSmoothed = stdev[idx];
  });
  return results;
}

// ---------------------------------------------------------------------------
// Pipeline entry point
// ---------------------------------------------------------------------------

/** Full pipeline: raw events -> pre-process -> summarize -> mesh. */
export function runPipeline(
  events: KeyEvent[],
  layout: Record<string, KeyPosition>,
): Record<string, KeyResult> {
  const cleanedEvents = filterBackspaces(events);
  const [validEvents] = filterOutliers(cleanedEvents);
  const pairStats = aggregatePairs(cleanedEvents);
  let results = summarizeKeys(pairStats, layout, validEvents);
  results = smooth(results);
  return results;
}
