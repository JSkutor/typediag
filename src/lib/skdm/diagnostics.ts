/**
 * Diagnostics module for the Cylindrical Vector panel.
 *
 * Given the raw keystroke event stream and a selected center (To) key,
 * produces high-level typing diagnostics:
 *
 * 1. Shift Overhead — latency penalty when Shift is used
 * 2. First Error Incidence — how often this key breaks the typing rhythm
 * 3. Physical Variance — same row / same finger / alternating hand comparisons
 * 4. Slowest From Keys — top-N highest-latency incoming transitions
 */

import type { KeyEvent } from "./types";
import type { CylindricalVector } from "./cylindrical";
import { KEYBOARD_META, getHand, getFinger, getMetaRow, isShiftCombinable } from "./keyboardMeta";
import { filterInterruptedTransitions, filterOutliers } from "./model";

// ---------------------------------------------------------------------------
// 1. Shift Overhead
// ---------------------------------------------------------------------------

export interface ShiftOverheadResult {
  /** Whether this key supports Shift combination in Korean. */
  applicable: boolean;
  /** Average latency for direct transitions (from → toKey), in ms. */
  directAvgMs: number;
  /** Average latency for Shift transitions (from → shift → toKey), in ms.
   *  This is the sum of (from→shift latency) + (shift→toKey latency). */
  shiftAvgMs: number;
  /** Overhead = shiftAvgMs - directAvgMs. */
  overheadMs: number;
  /** Number of direct transition samples. */
  directCount: number;
  /** Number of Shift transition samples. */
  shiftCount: number;
  /** Fraction of Shift presses that used Left Shift (0–1). */
  leftShiftRatio: number;
  /** Fraction of Shift presses that used Right Shift (0–1). */
  rightShiftRatio: number;
}

/**
 * Compare direct entry vs Shift-mediated entry latency for a target key.
 *
 * A "Shift transition" is the three-event pattern in the raw stream:
 *   events[i-1].toKey = <some alphanumeric key>
 *   events[i].toKey   = shift_l | shift_r   (fromKey = events[i-1].toKey)
 *   events[i+1].toKey = targetKey (uppercase, i.e. the Shift combo result)
 *
 * The combined Shift latency = events[i].latencyMs + events[i+1].latencyMs
 *
 * A "direct transition" is any event where:
 *   events[j].toKey = targetKey (lowercase)
 *   events[j].fromKey is an alphabetic key (not shift/backspace/etc.)
 *
 * Both use the same pre-processing (filterInterruptedTransitions + filterOutliers) so
 * the comparison is apples-to-apples.
 */
export function getShiftOverhead(rawEvents: KeyEvent[], targetKey: string): ShiftOverheadResult {
  const target = targetKey.toLowerCase();
  const meta = KEYBOARD_META[target];

  if (!meta || !meta.shiftCombinable) {
    return {
      applicable: false,
      directAvgMs: 0,
      shiftAvgMs: 0,
      overheadMs: 0,
      directCount: 0,
      shiftCount: 0,
      leftShiftRatio: 0,
      rightShiftRatio: 0,
    };
  }

  // We work on the raw (unfiltered) stream to detect shift patterns,
  // but only include events within the outlier bounds.
  const targetUpper = target.toUpperCase();
  const isAlpha = (k: string) => /^[a-z]$/i.test(k);
  const isShift = (k: string) => k === "shift_l" || k === "shift_r";

  // Direct transitions: from any alpha -> toKey (lowercase, no shift)
  const directLatencies: number[] = [];
  // Shift transitions: alpha -> shift -> toKey (uppercase)
  const shiftLatencies: number[] = [];
  let leftCount = 0;
  let rightCount = 0;

  for (let i = 0; i < rawEvents.length; i++) {
    const ev = rawEvents[i];

    // Direct transition detection
    if (
      ev.toKey === target &&
      ev.fromKey &&
      isAlpha(ev.fromKey) &&
      ev.latencyMs > 0 &&
      ev.latencyMs <= 2000
    ) {
      directLatencies.push(ev.latencyMs);
    }

    // Shift transition detection: look for shift_l/shift_r followed by uppercase target
    if (isShift(ev.toKey) && i + 1 < rawEvents.length) {
      const next = rawEvents[i + 1];
      if (
        next.toKey === targetUpper &&
        ev.fromKey &&
        isAlpha(ev.fromKey) &&
        ev.latencyMs > 0 &&
        next.latencyMs > 0 &&
        ev.latencyMs + next.latencyMs <= 2000
      ) {
        const combinedLatency = ev.latencyMs + next.latencyMs;
        shiftLatencies.push(combinedLatency);
        if (ev.toKey === "shift_l") leftCount++;
        else rightCount++;
      }
    }
  }

  const directAvg =
    directLatencies.length > 0
      ? directLatencies.reduce((a, b) => a + b, 0) / directLatencies.length
      : 0;
  const shiftAvg =
    shiftLatencies.length > 0
      ? shiftLatencies.reduce((a, b) => a + b, 0) / shiftLatencies.length
      : 0;
  const totalShift = leftCount + rightCount;

  return {
    applicable: true,
    directAvgMs: directAvg,
    shiftAvgMs: shiftAvg,
    overheadMs: shiftAvg - directAvg,
    directCount: directLatencies.length,
    shiftCount: shiftLatencies.length,
    leftShiftRatio: totalShift > 0 ? leftCount / totalShift : 0,
    rightShiftRatio: totalShift > 0 ? rightCount / totalShift : 0,
  };
}

// ---------------------------------------------------------------------------
// 2. First Error Incidence (Rhythm Breaker)
// ---------------------------------------------------------------------------

export interface FirstErrorResult {
  /** Number of times this key was the first error in a correct streak. */
  breakCount: number;
  /** Average cascade length: number of backspaces/errors before recovery. */
  avgCascade: number;
  /** Whether the user tends to immediately correct (high = good awareness). */
  immediateCorrectionRate: number;
  /** Total number of error streaks across all keys (for context). */
  totalBreaks: number;
}

/**
 * Count how many times `targetKey` was the first incorrect keystroke
 * after a streak of correct inputs.
 *
 * Also measures the "cascade": how many backspace/error events follow
 * before the user gets back on track (next isCorrect=true non-backspace event).
 */
export function getFirstErrorStats(rawEvents: KeyEvent[], targetKey: string): FirstErrorResult {
  const target = targetKey.toLowerCase();

  let breakCount = 0;
  let totalBreaks = 0;
  const cascadeLengths: number[] = [];
  let immediateCorrections = 0;

  let inCorrectStreak = true; // Start assuming correct until proven otherwise

  for (let i = 0; i < rawEvents.length; i++) {
    const ev = rawEvents[i];
    const toKey = ev.toKey.toLowerCase();

    // Skip shift/enter/control keys — they don't break correctness tracking
    if (toKey === "shift_l" || toKey === "shift_r" || toKey === "enter") {
      continue;
    }

    if (toKey === "backspace") {
      // Backspace doesn't reset the streak — it's part of error recovery
      continue;
    }

    if (ev.isCorrect === true) {
      inCorrectStreak = true;
      continue;
    }

    if (ev.isCorrect === false && inCorrectStreak) {
      // This is the FIRST error after a correct streak
      totalBreaks++;
      inCorrectStreak = false;

      if (toKey === target) {
        breakCount++;

        // Measure cascade: count events until next correct non-backspace
        let cascadeLen = 0;
        for (let j = i + 1; j < rawEvents.length; j++) {
          const next = rawEvents[j];
          const nextKey = next.toKey.toLowerCase();

          if (nextKey === "shift_l" || nextKey === "shift_r" || nextKey === "enter") {
            continue;
          }

          if (next.isCorrect === true && nextKey !== "backspace") {
            break;
          }
          cascadeLen++;
        }

        cascadeLengths.push(cascadeLen);

        // Immediate correction: next meaningful event is backspace
        if (i + 1 < rawEvents.length) {
          const nextMeaningful = rawEvents[i + 1];
          if (nextMeaningful.toKey.toLowerCase() === "backspace") {
            immediateCorrections++;
          }
        }
      }
    }
  }

  const avgCascade =
    cascadeLengths.length > 0
      ? cascadeLengths.reduce((a, b) => a + b, 0) / cascadeLengths.length
      : 0;

  return {
    breakCount,
    avgCascade,
    immediateCorrectionRate: breakCount > 0 ? immediateCorrections / breakCount : 0,
    totalBreaks,
  };
}

// ---------------------------------------------------------------------------
// 3. Physical Variance (Row / Finger / Hand)
// ---------------------------------------------------------------------------

export interface PhysicalVarianceResult {
  /** Average latency when from-key is on the same row as target. */
  sameRowAvgMs: number;
  /** Average latency when from-key is on a different row. */
  diffRowAvgMs: number;
  /** Number of same-row samples. */
  sameRowCount: number;
  /** Number of different-row samples. */
  diffRowCount: number;

  /** Average latency when from-key uses the same finger. */
  sameFingerAvgMs: number;
  /** Average latency when from-key uses a different finger. */
  diffFingerAvgMs: number;
  /** Number of same-finger samples. */
  sameFingerCount: number;
  /** Number of different-finger samples. */
  diffFingerCount: number;

  /** Average latency when alternating hands (from=L→to=R or from=R→to=L). */
  altHandAvgMs: number;
  /** Average latency when same hand (from=L→to=L or from=R→to=R). */
  sameHandAvgMs: number;
  /** Number of alternating-hand samples. */
  altHandCount: number;
  /** Number of same-hand samples. */
  sameHandCount: number;
}

/**
 * Compare latency by physical keyboard relationships between the
 * from-key and the target (to) key.
 *
 * Uses the pre-processed (cleaned + outlier-filtered) event stream.
 */
export function getPhysicalVariance(
  rawEvents: KeyEvent[],
  targetKey: string,
): PhysicalVarianceResult {
  const target = targetKey.toLowerCase();
  const targetMeta = KEYBOARD_META[target];

  const result: PhysicalVarianceResult = {
    sameRowAvgMs: 0,
    diffRowAvgMs: 0,
    sameRowCount: 0,
    diffRowCount: 0,
    sameFingerAvgMs: 0,
    diffFingerAvgMs: 0,
    sameFingerCount: 0,
    diffFingerCount: 0,
    altHandAvgMs: 0,
    sameHandAvgMs: 0,
    altHandCount: 0,
    sameHandCount: 0,
  };

  if (!targetMeta) return result;

  const cleaned = filterInterruptedTransitions(rawEvents);
  const [validEvents] = filterOutliers(cleaned);

  const sameRowLats: number[] = [];
  const diffRowLats: number[] = [];
  const sameFingerLats: number[] = [];
  const diffFingerLats: number[] = [];
  const altHandLats: number[] = [];
  const sameHandLats: number[] = [];

  for (const ev of validEvents) {
    if (ev.toKey.toLowerCase() !== target) continue;
    if (!ev.fromKey) continue;
    const from = ev.fromKey.toLowerCase();
    if (!/^[a-z]$/.test(from)) continue;

    const fromMeta = KEYBOARD_META[from];
    if (!fromMeta) continue;

    const lat = ev.latencyMs;

    // Row comparison
    if (fromMeta.row === targetMeta.row) sameRowLats.push(lat);
    else diffRowLats.push(lat);

    // Finger comparison
    if (fromMeta.hand === targetMeta.hand && fromMeta.finger === targetMeta.finger) {
      sameFingerLats.push(lat);
    } else {
      diffFingerLats.push(lat);
    }

    // Hand comparison
    if (fromMeta.hand === targetMeta.hand) sameHandLats.push(lat);
    else altHandLats.push(lat);
  }

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  result.sameRowAvgMs = avg(sameRowLats);
  result.diffRowAvgMs = avg(diffRowLats);
  result.sameRowCount = sameRowLats.length;
  result.diffRowCount = diffRowLats.length;

  result.sameFingerAvgMs = avg(sameFingerLats);
  result.diffFingerAvgMs = avg(diffFingerLats);
  result.sameFingerCount = sameFingerLats.length;
  result.diffFingerCount = diffFingerLats.length;

  result.altHandAvgMs = avg(altHandLats);
  result.sameHandAvgMs = avg(sameHandLats);
  result.altHandCount = altHandLats.length;
  result.sameHandCount = sameHandLats.length;

  return result;
}

// ---------------------------------------------------------------------------
// 4. Slowest From Keys (Top N)
// ---------------------------------------------------------------------------

export interface SlowestFromKey {
  fromKey: string;
  avgLatencyMs: number;
}

/**
 * Extract the top-N slowest incoming keys from already-computed
 * cylindrical vectors. Filters out zero-data entries.
 */
export function getSlowestFromKeys(
  vectors: CylindricalVector[],
  topN: number = 5,
): SlowestFromKey[] {
  return vectors
    .filter((v) => v.r > 0 && v.z > 0)
    .sort((a, b) => b.z - a.z)
    .slice(0, topN)
    .map((v) => ({ fromKey: v.fromKey, avgLatencyMs: v.z }));
}
