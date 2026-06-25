import { KeyEvent } from "@/lib/skdm";
import { KEYBOARD_META, getHand, needsShift } from "@/lib/skdm/keyboardMeta";
import { getSpatialErrorDistance } from "@/lib/skdm/diagnostics";
import { getMAD, getMedian, getPercentile, getStudentTPValue } from "./stats";
import { PiecewiseFitOutcome } from "@/utils/piecewiseRegression";

/** Cylindrical Diagnostics SSOT — focusKey / reference·outgoing transition 용어: docs/DIAGNOSTICS.md */

export interface KeystrokeDiagnostics {
  errorInducement: {
    rate: number;
    count: number;
    totalErrorStartsCount: number;
  };
  lateKeystroke: {
    rate: number;
    count: number;
    totalErrorsCount: number;
  };
  commonPair: {
    rank: number;
    from: string;
    to: string;
    count: number;
  } | null;
  unconsciousKey: {
    rank: number;
    key: string;
    errorRate: number;
    errorCount: number;
    totalCount: number;
  } | null;
  shiftPenalty: {
    shiftMedianMs: number;
    nonShiftMedianMs: number;
    differenceMs: number;
    shiftCount: number;
  } | null;
  speedMetrics: {
    medianLatencyMs: number;
    equivalentCpm: number;
  };
  cloudTyping: CloudTypingDiagnostics;
  hesitation: {
    ratio: number;
    hasTendency: boolean;
    thresholdMs: number;
  };
  fingerTransitions: {
    ratios: {
      oppositeHand: number;
      sameHandPinky: number;
      sameHandRing: number;
      sameHandMiddle: number;
      sameHandIndex: number;
      other: number;
    };
    counts: {
      oppositeHand: number;
      sameHandPinky: number;
      sameHandRing: number;
      sameHandMiddle: number;
      sameHandIndex: number;
      other: number;
      total: number;
    };
  };
  relativeSpeed: {
    speedDiffMs: number;
    handMedianMs: number;
  };
  latencyConsistency: {
    madMs: number;
    medianMs: number;
    /** MAD / median — robust analog of coefficient of variation */
    relativeMad: number;
    sampleCount: number;
    level: "steady" | "moderate" | "erratic";
    histogram: number[];
  } | null;
  spatialErrorDistance: {
    sampleCount: number;
    quartilesU: { q1: number; q2: number; q3: number };
    typoCounts: Record<string, number>;
  } | null;
}

const LATENCY_CONSISTENCY_MIN_SAMPLES = 5;
const LATENCY_HISTOGRAM_BINS = 12;

export const CLOUD_TYPING_ND_MAX = 0.25;
/** ND 분모 하한(ms). 빠른 타건에서 비율 폭주를 막는 휴리스틱. */
export const CLOUD_TYPING_MIN_DENOM = 300;
const CLOUD_TYPING_MIN_SAMPLES = 10;
const CLOUD_TYPING_LEVEL_WEAK = 0.7;
const CLOUD_TYPING_LEVEL_MODERATE = 0.8;
const CLOUD_TYPING_LEVEL_STRONG = 0.9;
const CLOUD_TYPING_CORRELATION_R_THRESHOLD = 0.3;
const CLOUD_TYPING_CORRELATION_P_THRESHOLD = 0.05;
const CLOUD_TYPING_CORRELATION_MIN_SAMPLES = 5;

const CLOUD_TYPING_EXCLUDE_TO_KEYS = new Set(["shift_l", "shift_r", "backspace", "enter"]);

const EMPTY_CLOUD_TYPING: CloudTypingDiagnostics = {
  effectivenessCorrelation: { pearsonR: 0, pValue: 1.0, isSignificant: false, sampleCount: 0 },
  effectiveness: "neutral",
  sessionCloudTypingRatio: 0,
  key: null,
  insufficientSample: false,
  analysisPoolCount: 0,
};

export type CloudTypingLevel = "not_applied" | "weak" | "moderate" | "strong";
export type CloudTypingEffectiveness = "effective" | "counterproductive" | "neutral";

export interface HoldCorrelationResult {
  pearsonR: number;
  pValue: number;
  isSignificant: boolean;
  sampleCount: number;
}

/** outgoing transition(fromKey === focusKey) 집계 결과 */
export interface CloudTypingKeyResult {
  key: string;
  dwellMs: number;
  flightMs: number;
  /** 전이 latency 중앙값 (dwell+flight 바 비율의 분모) */
  latencyMs: number;
  normalizedDifference: number;
  cloudTypingRatio: number;
  sampleCount: number;
  level: CloudTypingLevel;
}

export interface CloudTypingDiagnostics {
  effectivenessCorrelation: HoldCorrelationResult;
  effectiveness: CloudTypingEffectiveness;
  sessionCloudTypingRatio: number;
  key: CloudTypingKeyResult | null;
  /** 분석 풀 n ≤ CLOUD_TYPING_MIN_SAMPLES — 연산 생략 */
  insufficientSample: boolean;
  analysisPoolCount: number;
}

/**
 * 전이 샘플 한 건: outgoing(또는 일반 transition) 행의 latency + fromKey reference transition 행의 hold.
 * hold는 reference transition 행(toKey === focusKey)의 holdDurationMs에 붙는다.
 */
export interface TransitionDwellSample {
  fromKey: string;
  toKey: string;
  latencyMs: number;
  fromHoldMs: number;
}

function hasValidHold(event: KeyEvent): event is KeyEvent & { holdDurationMs: number } {
  return (
    event.holdDurationMs !== undefined &&
    event.holdDurationMs !== null &&
    typeof event.holdDurationMs === "number"
  );
}

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
): TransitionDwellSample[] {
  const samples: TransitionDwellSample[] = [];

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

/** @deprecated use extractOutgoingSamples */
export function extractOutgoingDwellSamples(
  events: KeyEvent[],
  focusKey: string,
): TransitionDwellSample[] {
  return extractOutgoingSamples(events, focusKey);
}

/** @deprecated use extractOutgoingSamples + filterOutgoingHesitation */
export function extractOutgoingCorrelationSamples(
  events: KeyEvent[],
  focusKey: string,
): TransitionDwellSample[] {
  return filterOutgoingHesitation(extractOutgoingSamples(events, focusKey));
}

export function filterOutgoingHesitation(
  samples: TransitionDwellSample[],
): TransitionDwellSample[] {
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

/** relativeMad = MAD/median 기준 일관성 등급 */
function classifyLatencyConsistency(relativeMad: number): "steady" | "moderate" | "erratic" {
  if (relativeMad < 0.2) return "steady";
  if (relativeMad < 0.35) return "moderate";
  return "erratic";
}

function buildLatencyHistogram(values: number[], binCount: number): number[] {
  if (values.length === 0) return Array(binCount).fill(0);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const counts = Array(binCount).fill(0);

  for (const value of values) {
    const idx =
      range === 0
        ? Math.floor(binCount / 2)
        : Math.min(binCount - 1, Math.floor(((value - min) / range) * binCount));
    counts[idx]++;
  }

  const peak = Math.max(...counts, 1);
  return counts.map((count) => Math.round((count / peak) * 100));
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

export function computeCloudTypingDiagnostics(
  events: KeyEvent[],
  focusKey: string,
): CloudTypingDiagnostics {
  if (!focusKey || events.length === 0) {
    return EMPTY_CLOUD_TYPING;
  }

  const rawSamples = extractOutgoingSamples(events, focusKey);
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
  const flights = analysisPool.map((sample) =>
    Math.max(0, sample.latencyMs - sample.fromHoldMs),
  );

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
      dwellMs: getMedian(holds),
      flightMs: getMedian(flights),
      latencyMs: getMedian(latencies),
      normalizedDifference: getMedian(
        analysisPool.map((sample) =>
          computeNormalizedDifference(sample.fromHoldMs, sample.latencyMs),
        ),
      ),
      cloudTypingRatio,
      sampleCount: analysisPool.length,
      level: classifyCloudTypingLevel(cloudTypingRatio),
    },
  };
}

function computeLatencyConsistency(latencies: number[]) {
  if (latencies.length < LATENCY_CONSISTENCY_MIN_SAMPLES) return null;

  const medianMs = getMedian(latencies);
  const madMs = getMAD(latencies);
  const relativeMad = medianMs > 0 ? madMs / medianMs : 0;

  return {
    madMs,
    medianMs,
    relativeMad,
    sampleCount: latencies.length,
    level: classifyLatencyConsistency(relativeMad),
    histogram: buildLatencyHistogram(latencies, LATENCY_HISTOGRAM_BINS),
  };
}

export function calculateKeystrokeDiagnostics(
  events: KeyEvent[],
  focusKey: string,
): KeystrokeDiagnostics {
  const defaultDiagnostics: KeystrokeDiagnostics = {
    errorInducement: { rate: 0, count: 0, totalErrorStartsCount: 0 },
    lateKeystroke: { rate: 0, count: 0, totalErrorsCount: 0 },
    commonPair: null,
    unconsciousKey: null,
    shiftPenalty: null,
    speedMetrics: { medianLatencyMs: 0, equivalentCpm: 0 },
    cloudTyping: EMPTY_CLOUD_TYPING,
    hesitation: { ratio: 0, hasTendency: false, thresholdMs: 0 },
    fingerTransitions: {
      ratios: {
        oppositeHand: 0,
        sameHandPinky: 0,
        sameHandRing: 0,
        sameHandMiddle: 0,
        sameHandIndex: 0,
        other: 0,
      },
      counts: {
        oppositeHand: 0,
        sameHandPinky: 0,
        sameHandRing: 0,
        sameHandMiddle: 0,
        sameHandIndex: 0,
        other: 0,
        total: 0,
      },
    },
    relativeSpeed: { speedDiffMs: 0, handMedianMs: 0 },
    latencyConsistency: null,
    spatialErrorDistance: null,
  };

  if (!focusKey || events.length === 0) {
    return defaultDiagnostics;
  }

  // 1) 오타 유발 및 순서 뒤바뀜 (additionalStats 대응)
  let totalErrorStartsCount = 0;
  let errorInducementCount = 0;
  let totalErrorsCount = 0;
  let lateKeystrokeCount = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const precedingEvent = i > 0 ? events[i - 1] : null;
    const isErrorStart =
      event.isCorrect === false &&
      (precedingEvent === null || precedingEvent.isCorrect === true);

    if (isErrorStart) {
      totalErrorStartsCount++;
      if (event.toKey === focusKey) {
        errorInducementCount++;
      }
    }

    if (event.toKey === focusKey && event.isCorrect === false) {
      totalErrorsCount++;
    }
  }

  for (let k = 0; k < events.length - 1; k++) {
    const precedingEvent = k > 0 ? events[k - 1] : null;
    const event = events[k];
    const followingEvent = events[k + 1];
    const precedingWasCorrect = precedingEvent ? precedingEvent.isCorrect === true : true;

    if (
      event.isCorrect === false &&
      followingEvent.isCorrect === false &&
      precedingWasCorrect &&
      followingEvent.toKey === focusKey &&
      event.expectedChar === focusKey
    ) {
      lateKeystrokeCount++;
    }
  }

  const errorInducementRate =
    totalErrorStartsCount > 0 ? (errorInducementCount / totalErrorStartsCount) * 100 : 0;
  const lateKeystrokeRate =
    totalErrorsCount > 0 ? (lateKeystrokeCount / totalErrorsCount) * 100 : 0;

  const spatialErrorDistance = getSpatialErrorDistance(events, focusKey);

  // 2) 선택적 진단 (optionalStats 대응)
  const EXCLUDE_KEYS = new Set(["shift_l", "shift_r", "backspace", "enter"]);
  const isAlphaKey = (k: string) => /^[a-zA-Z]$/.test(k);

  // (1) 빈번 순서쌍 top5
  const pairCounts = new Map<string, number>();
  for (const event of events) {
    if (
      event.isCorrect === true &&
      event.fromKey &&
      event.toKey &&
      isAlphaKey(event.toKey) &&
      !EXCLUDE_KEYS.has(event.fromKey) &&
      !EXCLUDE_KEYS.has(event.toKey)
    ) {
      const pairKey = `${event.fromKey}→${event.toKey}`;
      pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);
    }
  }
  const allTopPairs = [...pairCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  let commonPair = null;
  const matchIdx = allTopPairs.findIndex(([pair]) => pair.split("→")[1] === focusKey);
  if (matchIdx !== -1) {
    const [pair, count] = allTopPairs[matchIdx];
    const [from, to] = pair.split("→");
    commonPair = { rank: matchIdx + 1, from, to, count };
  }

  // (2) 무의식적 오타 키 top3
  const keyStats = new Map<string, { correct: number; incorrect: number }>();
  for (const event of events) {
    if (event.isCorrect === true || event.isCorrect === false) {
      const key = event.toKey;
      if (EXCLUDE_KEYS.has(key)) continue;
      if (!keyStats.has(key)) {
        keyStats.set(key, { correct: 0, incorrect: 0 });
      }
      const stat = keyStats.get(key)!;
      if (event.isCorrect === true) {
        stat.correct++;
      } else {
        stat.incorrect++;
      }
    }
  }
  const unconsciousKeys = [...keyStats.entries()]
    .map(([key, stat]) => {
      const total = stat.correct + stat.incorrect;
      const errorRate = total > 0 ? (stat.incorrect / total) * 100 : 0;
      return { key, errorRate, errorCount: stat.incorrect, totalCount: total };
    })
    .filter((item) => item.errorRate > 0)
    .sort((a, b) => b.errorRate - a.errorRate || b.errorCount - a.errorCount)
    .slice(0, 3);

  let unconsciousKey = null;
  const matchUnconsciousIdx = unconsciousKeys.findIndex((item) => item.key === focusKey);
  if (matchUnconsciousIdx !== -1) {
    unconsciousKey = { rank: matchUnconsciousIdx + 1, ...unconsciousKeys[matchUnconsciousIdx] };
  }

  // (3) 시프트 지연 패널티
  const correctEvents = events.filter((event) => event.isCorrect === true);
  const shiftLatencies: number[] = [];
  const nonShiftLatencies: number[] = [];

  for (const event of correctEvents) {
    if (EXCLUDE_KEYS.has(event.toKey)) continue;
    const char = event.expectedChar || event.keyChar;
    if (needsShift(char)) {
      shiftLatencies.push(event.latencyMs);
    } else {
      nonShiftLatencies.push(event.latencyMs);
    }
  }

  let shiftPenalty = null;
  if (shiftLatencies.length >= 10) {
    const shiftMedian = getMedian(shiftLatencies);
    const nonShiftMedian = getMedian(nonShiftLatencies);
    const diff = shiftMedian - nonShiftMedian;
    if (diff > 0) {
      shiftPenalty = {
        shiftMedianMs: shiftMedian,
        nonShiftMedianMs: nonShiftMedian,
        differenceMs: diff,
        shiftCount: shiftLatencies.length,
      };
    }
  }

  const cloudTyping = computeCloudTypingDiagnostics(events, focusKey);

  // 3) 상세 통계 (detailedStats 대응) — reference transition(toKey === focusKey) 정답
  const targetCorrectEvents = events.filter(
    (event) => event.toKey === focusKey && event.isCorrect === true,
  );
  if (targetCorrectEvents.length === 0) {
    return {
      ...defaultDiagnostics,
      errorInducement: {
        rate: errorInducementRate,
        count: errorInducementCount,
        totalErrorStartsCount,
      },
      lateKeystroke: { rate: lateKeystrokeRate, count: lateKeystrokeCount, totalErrorsCount },
      commonPair,
      unconsciousKey,
      shiftPenalty,
      spatialErrorDistance,
      cloudTyping,
    };
  }

  // 반응 속도 및 CPM
  const latencies = targetCorrectEvents.map((event) => event.latencyMs);
  const medianLatencyMs = getMedian(latencies);
  const equivalentCpm = medianLatencyMs > 0 ? Math.round(60000 / medianLatencyMs) : 0;
  const latencyConsistency = computeLatencyConsistency(latencies);

  // 머뭇거림 비율
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const q1 = getPercentile(sortedLatencies, 0.25);
  const q3 = getPercentile(sortedLatencies, 0.75);
  const iqr = q3 - q1;
  const iqrThreshold = q3 + 1.5 * iqr;

  const hesitationCount = latencies.filter((l) => l > iqrThreshold).length;
  const hesitationRatio = latencies.length > 0 ? (hesitationCount / latencies.length) * 100 : 0;
  const hasHesitationTendency = hesitationRatio >= 5;

  // 손가락 타이핑 전이
  const targetMeta = KEYBOARD_META[focusKey.toLowerCase()];
  const transitionCounts = {
    oppositeHand: 0,
    sameHandPinky: 0,
    sameHandRing: 0,
    sameHandMiddle: 0,
    sameHandIndex: 0,
    other: 0,
    total: 0,
  };

  if (targetMeta) {
    const targetHand = targetMeta.hand;

    for (const event of targetCorrectEvents) {
      if (!event.fromKey) {
        transitionCounts.other++;
        transitionCounts.total++;
        continue;
      }

      const fromKeyLower = event.fromKey.toLowerCase();
      const fromMeta = KEYBOARD_META[fromKeyLower];

      if (!fromMeta) {
        transitionCounts.other++;
      } else if (fromMeta.hand !== targetHand) {
        transitionCounts.oppositeHand++;
      } else {
        if (fromMeta.finger === "pinky") transitionCounts.sameHandPinky++;
        else if (fromMeta.finger === "ring") transitionCounts.sameHandRing++;
        else if (fromMeta.finger === "middle") transitionCounts.sameHandMiddle++;
        else if (fromMeta.finger === "index") transitionCounts.sameHandIndex++;
        else transitionCounts.other++;
      }
      transitionCounts.total++;
    }
  }

  const totalTransitions = transitionCounts.total || 1;
  const transitionRatios = {
    oppositeHand: (transitionCounts.oppositeHand / totalTransitions) * 100,
    sameHandPinky: (transitionCounts.sameHandPinky / totalTransitions) * 100,
    sameHandRing: (transitionCounts.sameHandRing / totalTransitions) * 100,
    sameHandMiddle: (transitionCounts.sameHandMiddle / totalTransitions) * 100,
    sameHandIndex: (transitionCounts.sameHandIndex / totalTransitions) * 100,
    other: (transitionCounts.other / totalTransitions) * 100,
  };

  // 상대 속도 비교
  let relativeSpeedMs = 0;
  let comparedToMedianMs = 0;
  if (targetMeta) {
    const targetHand = targetMeta.hand;
    const otherKeysSameHandLatencies = events
      .filter(
        (event) =>
          event.isCorrect === true &&
          event.toKey !== focusKey &&
          getHand(event.toKey) === targetHand,
      )
      .map((event) => event.latencyMs);

    if (otherKeysSameHandLatencies.length > 0) {
      comparedToMedianMs = getMedian(otherKeysSameHandLatencies);
      relativeSpeedMs = medianLatencyMs - comparedToMedianMs;
    }
  }

  return {
    errorInducement: {
      rate: errorInducementRate,
      count: errorInducementCount,
      totalErrorStartsCount,
    },
    lateKeystroke: {
      rate: lateKeystrokeRate,
      count: lateKeystrokeCount,
      totalErrorsCount,
    },
    commonPair,
    unconsciousKey,
    shiftPenalty,
    speedMetrics: {
      medianLatencyMs,
      equivalentCpm,
    },
    cloudTyping,
    hesitation: {
      ratio: hesitationRatio,
      hasTendency: hasHesitationTendency,
      thresholdMs: iqrThreshold,
    },
    fingerTransitions: {
      ratios: transitionRatios,
      counts: transitionCounts,
    },
    relativeSpeed: {
      speedDiffMs: relativeSpeedMs,
      handMedianMs: comparedToMedianMs,
    },
    latencyConsistency,
    spatialErrorDistance,
  };
}

export interface ChartData {
  points: Array<{ x: number; y: number }>;
  regressionSamples: Array<{ x: number; y: number }>;
  xMax: number;
  domainYMin: number;
  domainYMax: number;
  yTickValues: number[];
}

export function calculateChartData(outcome: PiecewiseFitOutcome | null): ChartData | null {
  if (!outcome || !("result" in outcome)) return null;

  const { points } = outcome.diagnostics;
  const { result } = outcome;

  if (points.length === 0) return null;

  const xMax = Math.max(...points.map((p) => p.x), 1);
  const yValues = points.map((p) => p.y);
  const regressionSamples = [
    { x: 0, y: result.predict(0) },
    { x: result.c, y: result.predict(result.c) },
    { x: xMax, y: result.predict(xMax) },
  ];

  const yMin = Math.min(...yValues, ...regressionSamples.map((p) => p.y));
  const yMax = Math.max(...yValues, ...regressionSamples.map((p) => p.y));
  const yPadding = Math.max(8, (yMax - yMin) * 0.08);
  const domainYMin = yMin - yPadding;
  const domainYMax = yMax + yPadding;

  const yTicksCount = 4;
  const yTickValues = Array.from({ length: yTicksCount }, (_, i) => {
    const t = i / (yTicksCount - 1);
    return domainYMin + t * (domainYMax - domainYMin);
  });

  return {
    points,
    regressionSamples,
    xMax,
    domainYMin,
    domainYMax,
    yTickValues,
  };
}
