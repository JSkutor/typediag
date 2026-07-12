import { disassemble } from "es-hangul";
import { getPureHangulCount } from "./targetSentence";

export interface GenericKeyEvent {
  fromKey?: string | null;
  from_key?: string | null;
  toKey?: string;
  to_key?: string;
  latencyMs?: number;
  latency?: number;
  isCorrect?: boolean | null;
  is_correct?: boolean | null;
}

export interface CalculateMetricsOptions {
  targetText: string;
  language: string;
  outlierThresholdMs?: number;
}

function isKoreanTargetText(targetText: string, language: string): boolean {
  return language === "ko" || /[가-힣]/.test(targetText);
}

/**
 * Target input steps for CPM numerator.
 * KO: es-hangul disassemble length (spaces and punctuation in decomposed stream included).
 * EN: targetText.length (same indexing as evaluateKeystroke).
 */
export function countTargetKeystrokes(targetText: string, language: string): number {
  if (!targetText) return 0;
  if (isKoreanTargetText(targetText, language)) {
    return disassemble(targetText).length;
  }
  return targetText.length;
}

/**
 * Word count for WPM numerator.
 * KO: pure Hangul syllable blocks (가-힣), excluding spaces and punctuation.
 * EN: whitespace-delimited tokens.
 */
export function countTargetWords(targetText: string, language: string): number {
  if (!targetText) return 0;
  if (isKoreanTargetText(targetText, language)) {
    return getPureHangulCount(targetText);
  }
  const trimmed = targetText.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Calculates typing metrics from key events and target text.
 *
 * CPM = countTargetKeystrokes / corrected_elapsed_minutes
 * WPM = countTargetWords / corrected_elapsed_minutes
 *
 * Elapsed time is the sum of per-event latencies (not wall clock).
 * Outliers (> outlierThresholdMs) are replaced with avg of normal latencies (latency > 0 only).
 */
export function calculateMetrics(events: GenericKeyEvent[], options: CalculateMetricsOptions) {
  const outlierThresholdMs = options.outlierThresholdMs ?? 3000;
  const targetKeystrokes = countTargetKeystrokes(options.targetText, options.language);
  const targetWords = countTargetWords(options.targetText, options.language);

  if (events.length === 0 || targetKeystrokes === 0) {
    return { elapsed_time_ms: 0, cpm: 0, wpm: 0, accuracy: 100 };
  }

  const normalized = events.map((e) => ({
    latency: e.latencyMs ?? e.latency ?? 0,
    isCorrect: e.isCorrect ?? e.is_correct ?? true,
  }));

  const totalEvaluated = normalized.length;
  const correctEvents = normalized.filter((e) => e.isCorrect !== false).length;
  const accuracy = totalEvaluated > 0 ? (correctEvents / totalEvaluated) * 100 : 100;

  const realLatencies = normalized.map((e) => e.latency).filter((lat) => lat > 0);
  const normalRealLatencies = realLatencies.filter((lat) => lat <= outlierThresholdMs);

  if (realLatencies.length > 0 && normalRealLatencies.length === 0) {
    return { elapsed_time_ms: 0, cpm: 0, wpm: 0, accuracy };
  }

  const normalLatencies = normalized
    .map((e) => e.latency)
    .filter((lat) => lat > 0 && lat <= outlierThresholdMs);

  const avgNormalLatency =
    normalLatencies.length > 0
      ? normalLatencies.reduce((sum, lat) => sum + lat, 0) / normalLatencies.length
      : 250;

  let corrected_elapsed_time_ms = 0;
  for (const event of normalized) {
    if (event.latency > outlierThresholdMs) {
      corrected_elapsed_time_ms += avgNormalLatency;
    } else {
      corrected_elapsed_time_ms += event.latency;
    }
  }

  const elapsedMinutes = corrected_elapsed_time_ms / 60000;
  const cpm = elapsedMinutes > 0 ? Math.round(targetKeystrokes / elapsedMinutes) : 0;
  const wpm = elapsedMinutes > 0 ? Math.round(targetWords / elapsedMinutes) : 0;

  return {
    elapsed_time_ms: Math.round(corrected_elapsed_time_ms),
    cpm,
    wpm,
    accuracy,
  };
}

/**
 * Calculates the total active typing duration after the last long pause (gap).
 * If a gap of > gapThresholdMs exists, we find the last gap and sum the latencies after it.
 */
export function calculateLatencyAfterGap(
  events: GenericKeyEvent[],
  gapThresholdMs: number = 180000,
): number {
  if (events.length === 0) return 0;

  const latencies = events.map((e) => e.latencyMs ?? e.latency ?? 0);

  let lastGapIndex = -1;
  for (let i = 0; i < latencies.length; i++) {
    if (latencies[i] >= gapThresholdMs) {
      lastGapIndex = i;
    }
  }

  if (lastGapIndex === -1) {
    return latencies.reduce((sum, lat) => sum + lat, 0);
  }

  let activeTime = 0;
  for (let i = lastGapIndex + 1; i < latencies.length; i++) {
    activeTime += latencies[i];
  }

  return activeTime;
}
