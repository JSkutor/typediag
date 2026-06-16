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

/**
 * Calculates typing metrics (WPM, CPM, Accuracy, Elapsed Time) from key events,
 * correcting outlier latencies using the average of normal latencies.
 */
export function calculateMetrics(
  events: GenericKeyEvent[],
  outlierThresholdMs: number = 3000
) {
  if (events.length === 0) {
    return { elapsed_time_ms: 0, cpm: 0, wpm: 0, accuracy: 100 };
  }

  // Normalize event fields
  const normalized = events.map((e) => ({
    latency: e.latencyMs ?? e.latency ?? 0,
    isCorrect: e.isCorrect ?? e.is_correct ?? true,
  }));

  // 1. Calculate accuracy
  const totalEvaluated = normalized.length;
  const correctEvents = normalized.filter((e) => e.isCorrect !== false).length;
  const accuracy = totalEvaluated > 0 ? (correctEvents / totalEvaluated) * 100 : 100;

  // 2. Identify outliers and calculate corrected elapsed time
  const realLatencies = normalized
    .map((e) => e.latency)
    .filter((lat) => lat > 0);
  const normalRealLatencies = realLatencies.filter((lat) => lat <= outlierThresholdMs);

  // If there are transitions, but ALL transitions are outliers (> 3 seconds), it's statistically meaningless.
  if (realLatencies.length > 0 && normalRealLatencies.length === 0) {
    return { elapsed_time_ms: 0, cpm: 0, wpm: 0, accuracy };
  }

  const normalLatencies = normalized
    .map((e) => e.latency)
    .filter((lat) => lat <= outlierThresholdMs);

  const avgNormalLatency =
    normalLatencies.length > 0
      ? normalLatencies.reduce((sum, lat) => sum + lat, 0) / normalLatencies.length
      : 250; // default latency if all are outliers

  let corrected_elapsed_time_ms = 0;
  for (const event of normalized) {
    if (event.latency > outlierThresholdMs) {
      corrected_elapsed_time_ms += avgNormalLatency;
    } else {
      corrected_elapsed_time_ms += event.latency;
    }
  }

  // 3. Calculate CPM & WPM
  // Note: the count of total keystrokes is equal to the number of events.
  const keystrokes = normalized.length;
  const elapsedMinutes = corrected_elapsed_time_ms / 60000;
  const cpm = elapsedMinutes > 0 ? Math.round(keystrokes / elapsedMinutes) : 0;
  const wpm = Math.round(cpm / 5);

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
  gapThresholdMs: number = 180000 // 3 minutes default
): number {
  if (events.length === 0) return 0;

  const latencies = events.map((e) => e.latencyMs ?? e.latency ?? 0);

  // Find the index of the last gap
  let lastGapIndex = -1;
  for (let i = 0; i < latencies.length; i++) {
    if (latencies[i] >= gapThresholdMs) {
      lastGapIndex = i;
    }
  }

  if (lastGapIndex === -1) {
    // No gap found, return sum of all latencies
    return latencies.reduce((sum, lat) => sum + lat, 0);
  }

  // Sum latencies strictly after the last gap. Exclude the gap event's giant latency.
  let activeTime = 0;
  for (let i = lastGapIndex + 1; i < latencies.length; i++) {
    activeTime += latencies[i];
  }

  return activeTime;
}
