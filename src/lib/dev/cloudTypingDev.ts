import type { KeyEvent } from "@/lib/skdm";
import {
  CLOUD_TYPING_MIN_DENOM,
  computeNormalizedDifference,
  computePearsonCorrelation,
  extractOutgoingSamples,
  filterOutgoingHesitation,
  isCloudTypingStroke,
  type CloudTypingDiagnostics,
  type CloudTypingEffectiveness,
  type CloudTypingLevel,
  type OutgoingTransitionSample,
} from "@/utils/cylindricalStats";
import { getMedian } from "@/utils/stats";

import { countCorrectReferenceTransitions, selectDefaultFocusKey } from "./piecewiseDev";

/** diag `CLOUD_TYPING_MIN_SAMPLES`와 동일 */
const CLOUD_TYPING_MIN_SAMPLES = 10;
const CLOUD_TYPING_LEVEL_WEAK = 0.7;
const CLOUD_TYPING_LEVEL_MODERATE = 0.8;
const CLOUD_TYPING_LEVEL_STRONG = 0.9;
const CLOUD_TYPING_CORRELATION_R_THRESHOLD = 0.3;

const EMPTY_CLOUD_TYPING: CloudTypingDiagnostics = {
  effectivenessCorrelation: { pearsonR: 0, pValue: 1.0, isSignificant: false, sampleCount: 0 },
  effectiveness: "neutral",
  sessionCloudTypingRatio: 0,
  key: null,
  insufficientSample: false,
  analysisPoolCount: 0,
};

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

/** `CLOUD_TYPING_MIN_DENOM` 별칭 — dev UI·산점도에서 사용 */
export const CLOUD_TYPING_DEV_MIN_DENOM = CLOUD_TYPING_MIN_DENOM;

/** dev 산점도 구름 stroke 상한 */
export const CLOUD_TYPING_DEV_ND_MAX = 0.25;

export interface CloudTypingScatterPoint {
  holdMs: number;
  latencyMs: number;
  toKey: string;
  normalizedDifference: number;
  isCloudStroke: boolean;
  inAnalysisPool: boolean;
}

export interface CloudTypingDevData {
  diagnostics: CloudTypingDiagnostics;
  analysisPoints: CloudTypingScatterPoint[];
  excludedPoints: CloudTypingScatterPoint[];
  rawOutgoingCount: number;
}

/**
 * ND = |L − D| / max(L + D, M). M 미지정 시 `CLOUD_TYPING_MIN_DENOM`(300 ms).
 */
export function computeDevNormalizedDifference(
  holdMs: number,
  latencyMs: number,
  minDenomMs: number = CLOUD_TYPING_DEV_MIN_DENOM,
): number {
  return computeNormalizedDifference(holdMs, latencyMs, minDenomMs);
}

export function isDevCloudTypingStroke(
  holdMs: number,
  latencyMs: number,
  ndMax: number = CLOUD_TYPING_DEV_ND_MAX,
  minDenomMs: number = CLOUD_TYPING_DEV_MIN_DENOM,
): boolean {
  return isCloudTypingStroke(holdMs, latencyMs, ndMax, minDenomMs);
}

export function computeDevCloudBandLatencies(
  holdMs: number,
  ndMax: number = CLOUD_TYPING_DEV_ND_MAX,
  minDenomMs: number = CLOUD_TYPING_DEV_MIN_DENOM,
): { lowerMs: number; upperMs: number } {
  // 절대 오차 허용 경계 (L+D <= M 영역)
  const upperAbs = holdMs + ndMax * minDenomMs;
  const lowerAbs = holdMs - ndMax * minDenomMs;

  // 비율 오차 허용 경계 (L+D > M 영역)
  const upperRel = (holdMs * (1 + ndMax)) / (1 - ndMax);
  const lowerRel = (holdMs * (1 - ndMax)) / (1 + ndMax);

  return {
    lowerMs: Math.max(0, Math.min(lowerAbs, lowerRel)),
    upperMs: Math.max(upperAbs, upperRel),
  };
}

export interface CloudBandPoint {
  hold: number;
  latency: number;
}

export function traceDevCloudBandPolygon(
  holdMax: number,
  latencyMax: number,
  ndMax: number = CLOUD_TYPING_DEV_ND_MAX,
  minDenomMs: number = CLOUD_TYPING_DEV_MIN_DENOM,
): CloudBandPoint[] {
  if (holdMax <= 0 || latencyMax <= 0) return [];

  const points: CloudBandPoint[] = [];
  const steps = 100;

  // 상한선 추적
  for (let i = 0; i <= steps; i++) {
    const hold = (i / steps) * holdMax;
    const { upperMs } = computeDevCloudBandLatencies(hold, ndMax, minDenomMs);
    points.push({ hold, latency: Math.min(upperMs, latencyMax) });
  }

  // 끝점 이음
  points.push({ hold: holdMax, latency: latencyMax });
  points.push({ hold: holdMax, latency: 0 });

  // 하한선 역방향 추적
  for (let i = steps; i >= 0; i--) {
    const hold = (i / steps) * holdMax;
    const { lowerMs } = computeDevCloudBandLatencies(hold, ndMax, minDenomMs);
    points.push({ hold, latency: Math.max(0, Math.min(lowerMs, latencyMax)) });
  }

  return points;
}

function sampleKey(sample: OutgoingTransitionSample): string {
  return `${sample.toKey}:${sample.latencyMs}:${sample.fromHoldMs}`;
}

export function computeDevCloudTypingDiagnostics(
  analysisPool: OutgoingTransitionSample[],
  focusKey: string,
  minDenomMs: number,
): CloudTypingDiagnostics {
  if (!focusKey || analysisPool.length === 0) {
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
    computeDevNormalizedDifference(sample.fromHoldMs, sample.latencyMs, minDenomMs),
  );
  const latencies = analysisPool.map((sample) => sample.latencyMs);
  const holds = analysisPool.map((sample) => sample.fromHoldMs);

  const strokeCount = analysisPool.filter((sample) =>
    isDevCloudTypingStroke(
      sample.fromHoldMs,
      sample.latencyMs,
      CLOUD_TYPING_DEV_ND_MAX,
      minDenomMs,
    ),
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

function toScatterPoint(
  sample: OutgoingTransitionSample,
  inAnalysisPool: boolean,
  minDenomMs: number,
): CloudTypingScatterPoint {
  return {
    holdMs: sample.fromHoldMs,
    latencyMs: sample.latencyMs,
    toKey: sample.toKey,
    normalizedDifference: computeDevNormalizedDifference(
      sample.fromHoldMs,
      sample.latencyMs,
      minDenomMs,
    ),
    isCloudStroke: isDevCloudTypingStroke(
      sample.fromHoldMs,
      sample.latencyMs,
      CLOUD_TYPING_DEV_ND_MAX,
      minDenomMs,
    ),
    inAnalysisPool,
  };
}

export interface BuildCloudTypingDevDataOptions {
  minDenomMs?: number;
}

export function buildCloudTypingDevData(
  events: KeyEvent[],
  focusKey: string,
  options?: BuildCloudTypingDevDataOptions,
): CloudTypingDevData {
  const minDenomMs = Math.max(0, options?.minDenomMs ?? CLOUD_TYPING_DEV_MIN_DENOM);
  const rawSamples = extractOutgoingSamples(events, focusKey);
  const analysisPool = filterOutgoingHesitation(rawSamples);
  const analysisKeys = new Set(analysisPool.map(sampleKey));
  const diagnostics = computeDevCloudTypingDiagnostics(analysisPool, focusKey, minDenomMs);

  return {
    diagnostics,
    analysisPoints: analysisPool.map((sample) => toScatterPoint(sample, true, minDenomMs)),
    excludedPoints: rawSamples
      .filter((sample) => !analysisKeys.has(sampleKey(sample)))
      .map((sample) => toScatterPoint(sample, false, minDenomMs)),
    rawOutgoingCount: rawSamples.length,
  };
}

export { countCorrectReferenceTransitions, selectDefaultFocusKey };
