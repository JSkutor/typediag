import { KeyEvent } from "@/lib/skdm";
import { getMedian, getPercentile, getStudentTPValue } from "@/utils/stats";
import {
  CLOUD_TYPING_CORRELATION_MIN_SAMPLES,
  CLOUD_TYPING_CORRELATION_P_THRESHOLD,
  CLOUD_TYPING_CORRELATION_R_THRESHOLD,
  CLOUD_TYPING_EXCLUDE_TO_KEYS,
  CLOUD_TYPING_LEVEL_MODERATE,
  CLOUD_TYPING_LEVEL_STRONG,
  CLOUD_TYPING_LEVEL_WEAK,
  CLOUD_TYPING_MIN_DENOM,
  CLOUD_TYPING_MIN_SAMPLES,
  CLOUD_TYPING_ND_MAX,
} from "./constants";
import type {
  CloudTypingDiagnostics,
  CloudTypingEffectiveness,
  CloudTypingLevel,
  HoldCorrelationResult,
  OutgoingTransitionSample,
} from "./types";

export function hasValidHold(event: KeyEvent): event is KeyEvent & { holdDurationMs: number } {
  return (
    event.holdDurationMs !== undefined &&
    event.holdDurationMs !== null &&
    typeof event.holdDurationMs === "number"
  );
}

const EMPTY_CLOUD_TYPING: CloudTypingDiagnostics = {
  effectivenessCorrelation: { pearsonR: 0, pValue: 1.0, isSignificant: false, sampleCount: 0 },
  effectiveness: "neutral",
  sessionCloudTypingRatio: 0,
  key: null,
  insufficientSample: false,
  analysisPoolCount: 0,
};

/** ND = |L − D| / max(L + D, M), D = hold */
export function computeNormalizedDifference(
  holdMs: number,
  latencyMs: number,
  minDenomMs: number = CLOUD_TYPING_MIN_DENOM,
): number {
  const denominator = Math.max(latencyMs + holdMs, minDenomMs);
  if (denominator <= 0) return 1;
  return Math.abs(latencyMs - holdMs) / denominator;
}

export function extractOutgoingSamples(
  events: KeyEvent[],
  focusKey: string,
): OutgoingTransitionSample[] {
  const samples: OutgoingTransitionSample[] = [];

  for (let i = 1; i < events.length; i++) {
    const outgoingEvent = events[i];
    const referenceEvent = events[i - 1];

    if (outgoingEvent.fromKey !== focusKey) continue;
    if (outgoingEvent.isCorrect !== true || outgoingEvent.latencyMs <= 0) continue;
    if (CLOUD_TYPING_EXCLUDE_TO_KEYS.has(outgoingEvent.toKey)) continue;
    if (referenceEvent.toKey !== focusKey) continue;
    if (!hasValidHold(referenceEvent)) continue;

    samples.push({
      fromKey: focusKey,
      toKey: outgoingEvent.toKey,
      latencyMs: outgoingEvent.latencyMs,
      fromHoldMs: referenceEvent.holdDurationMs,
    });
  }

  return samples;
}

export function filterOutgoingHesitation(
  samples: OutgoingTransitionSample[],
): OutgoingTransitionSample[] {
  if (samples.length === 0) return [];

  const latencies = samples.map((sample) => sample.latencyMs);
  const sorted = [...latencies].sort((a, b) => a - b);
  const q3 = getPercentile(sorted, 0.75);
  const q1 = getPercentile(sorted, 0.25);
  const iqr = q3 - q1;
  const hesitationThreshold = q3 + 1.5 * iqr;

  return samples.filter((sample) => sample.latencyMs <= hesitationThreshold);
}

export function isCloudTypingStroke(
  holdMs: number,
  latencyMs: number,
  ndMax: number = CLOUD_TYPING_ND_MAX,
  minDenomMs: number = CLOUD_TYPING_MIN_DENOM,
): boolean {
  return computeNormalizedDifference(holdMs, latencyMs, minDenomMs) <= ndMax;
}

function classifyCloudTypingLevel(ratio: number): CloudTypingLevel {
  if (ratio >= CLOUD_TYPING_LEVEL_STRONG) return "strong";
  if (ratio >= CLOUD_TYPING_LEVEL_MODERATE) return "moderate";
  if (ratio >= CLOUD_TYPING_LEVEL_WEAK) return "weak";
  return "not_applied";
}

function classifyCloudTypingEffectiveness(
  pearsonR: number,
  isSignificant: boolean,
): CloudTypingEffectiveness {
  if (!isSignificant) return "neutral";
  if (pearsonR <= -CLOUD_TYPING_CORRELATION_R_THRESHOLD) return "effective";
  if (pearsonR >= CLOUD_TYPING_CORRELATION_R_THRESHOLD) return "counterproductive";
  return "neutral";
}

export function computePearsonCorrelation(
  xs: number[],
  ys: number[],
): HoldCorrelationResult {
  const defaultResult: HoldCorrelationResult = {
    pearsonR: 0,
    pValue: 1.0,
    isSignificant: false,
    sampleCount: xs.length,
  };

  if (xs.length < CLOUD_TYPING_CORRELATION_MIN_SAMPLES || xs.length !== ys.length) {
    return { ...defaultResult, sampleCount: xs.length };
  }

  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  if (denX <= 0 || denY <= 0) {
    return defaultResult;
  }

  let pearsonR = num / Math.sqrt(denX * denY);
  pearsonR = Math.max(-1, Math.min(1, pearsonR));

  let pValue = 1.0;
  const df = xs.length - 2;
  if (Math.abs(pearsonR) < 1.0) {
    const t = pearsonR * Math.sqrt(df / (1 - pearsonR * pearsonR));
    pValue = getStudentTPValue(t, df);
  } else {
    pValue = 0.0;
  }

  const isSignificant =
    Math.abs(pearsonR) > CLOUD_TYPING_CORRELATION_R_THRESHOLD &&
    pValue < CLOUD_TYPING_CORRELATION_P_THRESHOLD;

  return { pearsonR, pValue, isSignificant, sampleCount: xs.length };
}

/** 이미 추출된 rawSamples를 받아 cloud typing 집계를 수행합니다 (events 재순회 없음). */
export function computeCloudTypingFromSamples(
  rawSamples: OutgoingTransitionSample[],
  focusKey: string,
): CloudTypingDiagnostics {
  const analysisPool = filterOutgoingHesitation(rawSamples);

  if (analysisPool.length === 0) {
    return EMPTY_CLOUD_TYPING;
  }

  if (analysisPool.length <= CLOUD_TYPING_MIN_SAMPLES) {
    return {
      ...EMPTY_CLOUD_TYPING,
      insufficientSample: true,
      analysisPoolCount: analysisPool.length,
    };
  }

  const ndValues = analysisPool.map((sample) =>
    computeNormalizedDifference(sample.fromHoldMs, sample.latencyMs),
  );
  const latencies = analysisPool.map((sample) => sample.latencyMs);
  const holds = analysisPool.map((sample) => sample.fromHoldMs);

  const strokeCount = analysisPool.filter((sample) =>
    isCloudTypingStroke(sample.fromHoldMs, sample.latencyMs),
  ).length;
  const cloudTypingRatio = strokeCount / analysisPool.length;

  const effectivenessCorrelation = computePearsonCorrelation(ndValues, latencies);
  const effectiveness = classifyCloudTypingEffectiveness(
    effectivenessCorrelation.pearsonR,
    effectivenessCorrelation.isSignificant,
  );

  return {
    effectivenessCorrelation,
    effectiveness,
    sessionCloudTypingRatio: cloudTypingRatio,
    insufficientSample: false,
    analysisPoolCount: analysisPool.length,
    key: {
      key: focusKey,
      holdMs: getMedian(holds),
      latencyMs: getMedian(latencies),
      normalizedDifference: getMedian(ndValues),
      cloudTypingRatio,
      sampleCount: analysisPool.length,
      level: classifyCloudTypingLevel(cloudTypingRatio),
    },
  };
}

export function computeCloudTypingDiagnostics(
  events: KeyEvent[],
  focusKey: string,
): CloudTypingDiagnostics {
  if (!focusKey || events.length === 0) {
    return EMPTY_CLOUD_TYPING;
  }
  const rawSamples = extractOutgoingSamples(events, focusKey);
  return computeCloudTypingFromSamples(rawSamples, focusKey);
}
