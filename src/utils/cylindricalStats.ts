import { KeyEvent } from "@/lib/skdm";
import { KEYBOARD_META, getHand, needsShift } from "@/lib/skdm/keyboardMeta";
import { charToLayoutKey } from "@/lib/practice/hangulRules";
import { buildLayout } from "@/lib/skdm/layout";
import { keyDistanceU } from "@/lib/skdm/geometry";
import { getMAD, getMedian, getPercentile, getStudentTPValue } from "./stats";
import type { PiecewiseFitOutcome } from "@/utils/piecewiseRegression";

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
  fatalNgrams: FatalNgramEntry[];
}

export interface FatalNgramEntry {
  sequence: string[];
  errorRate: number;
  totalCount: number;
}

/** 3-Gram 맥락 오타: 최소 진입 횟수 */
export const FATAL_NGRAM_MIN_SAMPLES = 10;
/** 3-Gram 맥락 오타: 오타율 하한(%) */
export const FATAL_NGRAM_ERROR_RATE_THRESHOLD = 20;

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

/** 이미 추출된 rawSamples를 받아 cloud typing 집계를 수행합니다 (events 재순회 없음). */
function computeCloudTypingFromSamples(
  rawSamples: TransitionDwellSample[],
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

// ============================================================
// Accumulator — 단일 O(N) 패스로 모든 진단 데이터를 수집
// ============================================================

/** 키 하나에 대한 누산 데이터. buildDiagnosticsAccumulator 내부에서 생성됩니다. */
export interface PerKeyAccumulator {
  /** reference transition 정답 latency 배열 (toKey===key, isCorrect, latencyMs>0). 시간순 보존. */
  referenceLatencies: number[];
  /** reference transition 기준 손가락 전환 카운트 */
  fingerCounts: {
    oppositeHand: number;
    sameHandPinky: number;
    sameHandRing: number;
    sameHandMiddle: number;
    sameHandIndex: number;
    other: number;
    total: number;
  };
  /** outgoing transition 샘플 (fromKey===key). cloud typing 집계용. */
  outgoingSamples: TransitionDwellSample[];
  /** 이 키가 오타 스트릭의 시작점(toKey===key && isErrorStart)인 횟수 */
  errorInducementCount: number;
  /** late keystroke 횟수 (expectedChar===key && nextEvent.toKey===key) */
  lateKeystrokeCount: number;
  /** 공간적 오타 거리 데이터 (expectedChar===key && isCorrect===false) */
  spatialErrors: {
    distancesU: number[];
    typoCounts: Record<string, number>;
  };
  contextualTypos: {
    ngrams: Map<string, { total: number; error: number }>;
  };
}

/** 단일 O(N) 순회로 수집한 전역·키별 누산 데이터 */
export interface DiagnosticsAccumulator {
  /** toKey → correct count (all keys, countCorrectReferenceTransitions와 동일) */
  correctByKey: Map<string, number>;
  /** 전역 순서쌍 빈도 (correct, alpha 키만) */
  pairCounts: Map<string, number>;
  /** 키별 correct/incorrect 카운트 (EXCLUDE_KEYS 제외, unconsciousKey·lateKeystroke 분모용) */
  keyStats: Map<string, { correct: number; incorrect: number }>;
  /** 전역 오타 스트릭 시작 횟수 */
  totalErrorStartsCount: number;
  /** Shift 조합 키 정답 이벤트의 latency 배열 */
  shiftLatencies: number[];
  /** 일반(비-Shift) 정답 이벤트의 latency 배열 */
  nonShiftLatencies: number[];
  /** 키별 누산 데이터 */
  perKey: Map<string, PerKeyAccumulator>;
}

const ACCUMULATOR_EXCLUDE_KEYS = new Set(["shift_l", "shift_r", "backspace", "enter"]);
const ALPHA_KEY_REGEX = /^[a-zA-Z]$/;

function getOrCreatePerKey(
  perKey: Map<string, PerKeyAccumulator>,
  key: string,
): PerKeyAccumulator {
  let entry = perKey.get(key);
  if (!entry) {
    entry = {
      referenceLatencies: [],
      fingerCounts: {
        oppositeHand: 0,
        sameHandPinky: 0,
        sameHandRing: 0,
        sameHandMiddle: 0,
        sameHandIndex: 0,
        other: 0,
        total: 0,
      },
      outgoingSamples: [],
      errorInducementCount: 0,
      lateKeystrokeCount: 0,
      spatialErrors: { distancesU: [], typoCounts: {} },
      contextualTypos: { ngrams: new Map() },
    };
    perKey.set(key, entry);
  }
  return entry;
}

/**
 * events 배열을 단일 O(N) 순회하여 모든 진단 데이터를 누산합니다.
 *
 * 반환된 DiagnosticsAccumulator를 `finalizeKeystrokeDiagnostics(acc, focusKey)`에
 * 전달하면 events 재순회 없이 O(k) 시간에 진단 결과를 생성할 수 있습니다.
 */
export function buildDiagnosticsAccumulator(events: KeyEvent[]): DiagnosticsAccumulator {
  const correctByKey = new Map<string, number>();
  const pairCounts = new Map<string, number>();
  const keyStats = new Map<string, { correct: number; incorrect: number }>();
  const perKey = new Map<string, PerKeyAccumulator>();
  let totalErrorStartsCount = 0;
  const shiftLatencies: number[] = [];
  const nonShiftLatencies: number[] = [];
  const window3Gram: Array<{ key: string; isCorrect: boolean }> = [];

  const layout = buildLayout();

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const prevEvent = i > 0 ? events[i - 1] : null;
    const nextEvent = i < events.length - 1 ? events[i + 1] : null;

    // 1. correctByKey (all keys, focusKeyOptions용)
    if (event.isCorrect === true) {
      correctByKey.set(event.toKey, (correctByKey.get(event.toKey) ?? 0) + 1);
    }

    // 2. keyStats (EXCLUDE_KEYS 제외, unconsciousKey·totalErrorsCount용)
    if (!ACCUMULATOR_EXCLUDE_KEYS.has(event.toKey) && (event.isCorrect === true || event.isCorrect === false)) {
      const stat = keyStats.get(event.toKey) ?? { correct: 0, incorrect: 0 };
      if (event.isCorrect === true) stat.correct++;
      else stat.incorrect++;
      keyStats.set(event.toKey, stat);
    }

    // 3. pairCounts (correct & alpha 키 순서쌍)
    if (
      event.isCorrect === true &&
      event.fromKey &&
      ALPHA_KEY_REGEX.test(event.toKey) &&
      !ACCUMULATOR_EXCLUDE_KEYS.has(event.fromKey) &&
      !ACCUMULATOR_EXCLUDE_KEYS.has(event.toKey)
    ) {
      const pairKey = `${event.fromKey}→${event.toKey}`;
      pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);
    }

    // 4. shiftLatencies / nonShiftLatencies
    if (event.isCorrect === true && !ACCUMULATOR_EXCLUDE_KEYS.has(event.toKey)) {
      const char = event.expectedChar || event.keyChar;
      if (needsShift(char)) shiftLatencies.push(event.latencyMs);
      else nonShiftLatencies.push(event.latencyMs);
    }

    // 5. 오타 스트릭 시작 → errorInducementCount
    const isErrorStart =
      event.isCorrect === false && (prevEvent === null || prevEvent.isCorrect === true);
    if (isErrorStart) {
      totalErrorStartsCount++;
      getOrCreatePerKey(perKey, event.toKey).errorInducementCount++;
    }

    // 6. Late keystroke (event.expectedChar === nextEvent.toKey 동시 체크)
    if (
      nextEvent !== null &&
      event.isCorrect === false &&
      nextEvent.isCorrect === false &&
      (prevEvent === null || prevEvent.isCorrect === true) &&
      event.expectedChar &&
      nextEvent.toKey === event.expectedChar
    ) {
      getOrCreatePerKey(perKey, event.expectedChar).lateKeystrokeCount++;
    }

    // 7. Reference transition (toKey === key && isCorrect && latencyMs > 0)
    if (event.isCorrect === true && event.latencyMs > 0) {
      const keyEntry = getOrCreatePerKey(perKey, event.toKey);
      keyEntry.referenceLatencies.push(event.latencyMs);

      // 손가락 전환 분류 (fromKey → toKey 기준)
      const targetMeta = KEYBOARD_META[event.toKey.toLowerCase()];
      if (targetMeta) {
        const fromKeyLower = event.fromKey?.toLowerCase();
        const fromMeta = fromKeyLower ? KEYBOARD_META[fromKeyLower] : undefined;

        if (!event.fromKey || !fromMeta) {
          keyEntry.fingerCounts.other++;
        } else if (fromMeta.hand !== targetMeta.hand) {
          keyEntry.fingerCounts.oppositeHand++;
        } else {
          switch (fromMeta.finger) {
            case "pinky":
              keyEntry.fingerCounts.sameHandPinky++;
              break;
            case "ring":
              keyEntry.fingerCounts.sameHandRing++;
              break;
            case "middle":
              keyEntry.fingerCounts.sameHandMiddle++;
              break;
            case "index":
              keyEntry.fingerCounts.sameHandIndex++;
              break;
            default:
              keyEntry.fingerCounts.other++;
          }
        }
        keyEntry.fingerCounts.total++;
      }
    }

    // 8. Outgoing transition (fromKey === key) → cloud typing 샘플
    if (
      i > 0 &&
      event.fromKey &&
      event.isCorrect === true &&
      event.latencyMs > 0 &&
      !CLOUD_TYPING_EXCLUDE_TO_KEYS.has(event.toKey)
    ) {
      const refEvent = events[i - 1];
      if (refEvent.toKey === event.fromKey && hasValidHold(refEvent)) {
        const keyEntry = getOrCreatePerKey(perKey, event.fromKey);
        keyEntry.outgoingSamples.push({
          fromKey: event.fromKey,
          toKey: event.toKey,
          latencyMs: event.latencyMs,
          fromHoldMs: refEvent.holdDurationMs,
        });
      }
    }

    // 9. 공간적 오타 거리 (expectedChar === key && isCorrect === false)
    if (event.isCorrect === false && event.expectedChar) {
      const expectedLayoutKey = charToLayoutKey(event.expectedChar);
      if (expectedLayoutKey) {
        const toKeyNorm = event.toKey?.toLowerCase();
        const typoKey = toKeyNorm && /^[a-z]$/.test(toKeyNorm) ? toKeyNorm : null;
        if (typoKey) {
          const distU = keyDistanceU(expectedLayoutKey, typoKey, layout);
          if (distU !== null) {
            const keyEntry = getOrCreatePerKey(perKey, expectedLayoutKey);
            keyEntry.spatialErrors.distancesU.push(distU);
            keyEntry.spatialErrors.typoCounts[typoKey] =
              (keyEntry.spatialErrors.typoCounts[typoKey] ?? 0) + 1;
          }
        }
      }
    }

    // 10. Contextual Typos (3-Gram)
    // K₁·K₂ 정타 뒤 K₃(focusKey) 시도: total=정타+오타, error=오타만
    if (window3Gram.length >= 2 && window3Gram[0].isCorrect && window3Gram[1].isCorrect) {
      let targetKey: string | null = null;
      if (event.isCorrect === true) {
        targetKey = event.toKey;
      } else if (event.isCorrect === false && event.expectedChar) {
        targetKey = charToLayoutKey(event.expectedChar);
      }

      if (targetKey && ALPHA_KEY_REGEX.test(targetKey) && !ACCUMULATOR_EXCLUDE_KEYS.has(targetKey)) {
        const seq = `${window3Gram[0].key}→${window3Gram[1].key}`;
        const keyEntry = getOrCreatePerKey(perKey, targetKey);
        const ngramMap = keyEntry.contextualTypos.ngrams;
        const stat = ngramMap.get(seq) ?? { total: 0, error: 0 };
        stat.total++;
        if (event.isCorrect === false) stat.error++;
        ngramMap.set(seq, stat);
      }
    }

    if (event.toKey && ALPHA_KEY_REGEX.test(event.toKey) && !ACCUMULATOR_EXCLUDE_KEYS.has(event.toKey)) {
      window3Gram.push({ key: event.toKey, isCorrect: event.isCorrect === true });
      if (window3Gram.length > 2) window3Gram.shift();
    } else {
      // 알파벳이 아니거나 특수·제외 키가 끼면 연속 맥락 끊김
      window3Gram.length = 0;
    }
  }

  return {
    correctByKey,
    pairCounts,
    keyStats,
    totalErrorStartsCount,
    shiftLatencies,
    nonShiftLatencies,
    perKey,
  };
}

/**
 * DiagnosticsAccumulator에서 focusKey에 대한 KeystrokeDiagnostics를 O(k)에 생성합니다.
 * events 재순회 없음.
 */
export function finalizeKeystrokeDiagnostics(
  acc: DiagnosticsAccumulator,
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
    fatalNgrams: [],
  };

  if (!focusKey) return defaultDiagnostics;

  const keyEntry = acc.perKey.get(focusKey);
  const keyStat = acc.keyStats.get(focusKey) ?? { correct: 0, incorrect: 0 };

  // --- 오타 유발 & 순서 뒤바뀜 ---
  const errorInducementCount = keyEntry?.errorInducementCount ?? 0;
  const lateKeystrokeCount = keyEntry?.lateKeystrokeCount ?? 0;
  const totalErrorsCount = keyStat.incorrect;

  const errorInducementRate =
    acc.totalErrorStartsCount > 0
      ? (errorInducementCount / acc.totalErrorStartsCount) * 100
      : 0;
  const lateKeystrokeRate =
    totalErrorsCount > 0 ? (lateKeystrokeCount / totalErrorsCount) * 100 : 0;

  // --- 공간적 오타 거리 (accumulator에서 직접 취득) ---
  const spatialErrors = keyEntry?.spatialErrors;
  let spatialErrorDistance = null;
  if (spatialErrors && spatialErrors.distancesU.length > 0) {
    const sorted = [...spatialErrors.distancesU].sort((a, b) => a - b);
    spatialErrorDistance = {
      sampleCount: sorted.length,
      quartilesU: {
        q1: getPercentile(sorted, 0.25),
        q2: getPercentile(sorted, 0.5),
        q3: getPercentile(sorted, 0.75),
      },
      typoCounts: { ...spatialErrors.typoCounts },
    };
  }

  // --- 빈번 순서쌍 top5 ---
  const allTopPairs = [...acc.pairCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  let commonPair = null;
  const matchIdx = allTopPairs.findIndex(([pair]) => pair.split("→")[1] === focusKey);
  if (matchIdx !== -1) {
    const [pair, count] = allTopPairs[matchIdx];
    const [from, to] = pair.split("→");
    commonPair = { rank: matchIdx + 1, from, to, count };
  }

  // --- 무의식적 오타 키 top3 ---
  const unconsciousKeys = [...acc.keyStats.entries()]
    .map(([key, stat]) => {
      const total = stat.correct + stat.incorrect;
      const errorRate = total > 0 ? (stat.incorrect / total) * 100 : 0;
      return { key, errorRate, errorCount: stat.incorrect, totalCount: total };
    })
    .filter((item) => item.errorRate > 0)
    .sort((a, b) => b.errorRate - a.errorRate || b.errorCount - a.errorCount)
    .slice(0, 3);

  let unconsciousKey = null;
  const matchUncIdx = unconsciousKeys.findIndex((item) => item.key === focusKey);
  if (matchUncIdx !== -1) {
    unconsciousKey = { rank: matchUncIdx + 1, ...unconsciousKeys[matchUncIdx] };
  }

  // --- Shift 지연 패널티 ---
  let shiftPenalty = null;
  if (acc.shiftLatencies.length >= 10) {
    const shiftMedian = getMedian(acc.shiftLatencies);
    const nonShiftMedian = getMedian(acc.nonShiftLatencies);
    const diff = shiftMedian - nonShiftMedian;
    if (diff > 0) {
      shiftPenalty = {
        shiftMedianMs: shiftMedian,
        nonShiftMedianMs: nonShiftMedian,
        differenceMs: diff,
        shiftCount: acc.shiftLatencies.length,
      };
    }
  }

  // --- Cloud Typing (누산된 outgoingSamples 사용) ---
  const cloudTyping = computeCloudTypingFromSamples(
    keyEntry?.outgoingSamples ?? [],
    focusKey,
  );

  // --- Contextual Typos (3-Gram) ---
  const fatalNgrams =
    keyEntry && keyEntry.contextualTypos.ngrams.size > 0
      ? selectFatalNgrams(keyEntry.contextualTypos.ngrams, focusKey)
      : [];

  // --- Reference transition 정답 기반 상세 통계 ---
  const latencies = keyEntry?.referenceLatencies ?? [];

  if (latencies.length === 0) {
    return {
      ...defaultDiagnostics,
      errorInducement: {
        rate: errorInducementRate,
        count: errorInducementCount,
        totalErrorStartsCount: acc.totalErrorStartsCount,
      },
      lateKeystroke: { rate: lateKeystrokeRate, count: lateKeystrokeCount, totalErrorsCount },
      commonPair,
      unconsciousKey,
      shiftPenalty,
      spatialErrorDistance,
      cloudTyping,
      fatalNgrams,
    };
  }

  // 반응 속도 & CPM
  const medianLatencyMs = getMedian(latencies);
  const equivalentCpm = medianLatencyMs > 0 ? Math.round(60000 / medianLatencyMs) : 0;
  const latencyConsistency = computeLatencyConsistency(latencies);

  // 머뭇거림 비율
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const q1 = getPercentile(sortedLatencies, 0.25);
  const q3Lat = getPercentile(sortedLatencies, 0.75);
  const iqr = q3Lat - q1;
  const iqrThreshold = q3Lat + 1.5 * iqr;
  const hesitationCount = latencies.filter((l) => l > iqrThreshold).length;
  const hesitationRatio = (hesitationCount / latencies.length) * 100;

  // 손가락 전환 비율
  const fingerCounts = keyEntry!.fingerCounts;
  const totalTransitions = fingerCounts.total || 1;
  const transitionRatios = {
    oppositeHand: (fingerCounts.oppositeHand / totalTransitions) * 100,
    sameHandPinky: (fingerCounts.sameHandPinky / totalTransitions) * 100,
    sameHandRing: (fingerCounts.sameHandRing / totalTransitions) * 100,
    sameHandMiddle: (fingerCounts.sameHandMiddle / totalTransitions) * 100,
    sameHandIndex: (fingerCounts.sameHandIndex / totalTransitions) * 100,
    other: (fingerCounts.other / totalTransitions) * 100,
  };

  // 동일 손 상대 속도
  let relativeSpeedMs = 0;
  let comparedToMedianMs = 0;
  const targetMeta = KEYBOARD_META[focusKey.toLowerCase()];
  if (targetMeta) {
    const targetHand = targetMeta.hand;
    const sameHandLatencies: number[] = [];
    for (const [key, entry] of acc.perKey) {
      if (key !== focusKey && getHand(key) === targetHand) {
        for (const l of entry.referenceLatencies) {
          sameHandLatencies.push(l);
        }
      }
    }
    if (sameHandLatencies.length > 0) {
      comparedToMedianMs = getMedian(sameHandLatencies);
      relativeSpeedMs = medianLatencyMs - comparedToMedianMs;
    }
  }

  return {
    errorInducement: {
      rate: errorInducementRate,
      count: errorInducementCount,
      totalErrorStartsCount: acc.totalErrorStartsCount,
    },
    lateKeystroke: { rate: lateKeystrokeRate, count: lateKeystrokeCount, totalErrorsCount },
    commonPair,
    unconsciousKey,
    shiftPenalty,
    speedMetrics: { medianLatencyMs, equivalentCpm },
    cloudTyping,
    hesitation: {
      ratio: hesitationRatio,
      hasTendency: hesitationRatio >= 5,
      thresholdMs: iqrThreshold,
    },
    fingerTransitions: {
      ratios: transitionRatios,
      counts: fingerCounts,
    },
    relativeSpeed: {
      speedDiffMs: relativeSpeedMs,
      handMedianMs: comparedToMedianMs,
    },
    latencyConsistency,
    spatialErrorDistance,
    fatalNgrams,
  };
}

export function selectFatalNgrams(
  ngrams: Map<string, { total: number; error: number }>,
  focusKey: string,
): FatalNgramEntry[] {
  return Array.from(ngrams.entries())
    .map(([seq, stat]) => ({
      seq,
      errorRate: stat.total > 0 ? (stat.error / stat.total) * 100 : 0,
      total: stat.total,
    }))
    .filter(
      (c) =>
        c.total >= FATAL_NGRAM_MIN_SAMPLES && c.errorRate > FATAL_NGRAM_ERROR_RATE_THRESHOLD,
    )
    .sort((a, b) => b.errorRate - a.errorRate || b.total - a.total)
    .map((top) => ({
      sequence: [...top.seq.split("→"), focusKey],
      errorRate: top.errorRate,
      totalCount: top.total,
    }));
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
