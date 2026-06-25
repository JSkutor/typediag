import { KEYBOARD_META, getHand } from "@/lib/skdm/keyboardMeta";
import { OUTLIER_HARD_CUTOFF_MS } from "@/lib/skdm/config";
import { getMAD, getMedian, getPercentile } from "@/utils/stats";
import {
  BURST_MIN_SAMPLES,
  BURST_TOP_N,
  FATAL_NGRAM_ERROR_RATE_THRESHOLD,
  FATAL_NGRAM_MIN_SAMPLES,
  LATENCY_CONSISTENCY_MIN_SAMPLES,
  LATENCY_HISTOGRAM_BINS,
  UNCONSCIOUS_KEY_MIN_SAMPLES,
} from "./constants";
import { computeCloudTypingFromSamples } from "./cloudTyping";
import { normalizeReferenceFromKey, resolveEffectiveFlowFromKey } from "./accumulator";
import type {
  BurstNgram,
  DiagnosticsAccumulator,
  FatalNgramEntry,
  KeystrokeDiagnostics,
  PerKeyAccumulator,
} from "./types";

const EMPTY_CLOUD_TYPING = {
  effectivenessCorrelation: { pearsonR: 0, pValue: 1.0, isSignificant: false, sampleCount: 0 },
  effectiveness: "neutral" as const,
  sessionCloudTypingRatio: 0,
  key: null,
  insufficientSample: false,
  analysisPoolCount: 0,
};

/** relativeMad = MAD/median 기준 일관성 등급 */
function classifyLatencyConsistency(relativeMad: number): "steady" | "moderate" | "erratic" {
  if (relativeMad < 0.2) return "steady";
  if (relativeMad < 0.35) return "moderate";
  return "erratic";
}

export interface FinalizeDiagnosticsOptions {
  /** SKDM final_upper_bound_ms. 미지정 시 OUTLIER_HARD_CUTOFF_MS fallback */
  histogramUpperBoundMs?: number;
  /**
   * Flow 패널 reference transition (fromKey → focusKey) 필터.
   * 미지정·빈 문자열이면 focusKey로 들어오는 전이 중 샘플 최다 fromKey를 사용.
   */
  fromKey?: string;
}

/** 0 ~ upperBoundMs 고정 구간으로 latency 히스토그램을 만든다 (키 간 비교 가능). */
export function buildLatencyHistogram(
  values: number[],
  binCount: number,
  upperBoundMs: number,
): number[] {
  if (values.length === 0 || upperBoundMs <= 0) return Array(binCount).fill(0);

  const counts = Array(binCount).fill(0);

  for (const value of values) {
    const clamped = Math.max(0, Math.min(value, upperBoundMs));
    const idx = Math.min(binCount - 1, Math.floor((clamped / upperBoundMs) * binCount));
    counts[idx]++;
  }

  const peak = Math.max(...counts, 1);
  return counts.map((count) => Math.round((count / peak) * 100));
}

function resolveCommonPair(
  acc: DiagnosticsAccumulator,
  focusKey: string,
  flowFromKey: string | undefined,
): KeystrokeDiagnostics["commonPair"] {
  const focusNorm = focusKey.toLowerCase();
  if (!flowFromKey) return null;

  const pairsToFocus = [...acc.pairCounts.entries()]
    .filter(([pair]) => {
      const [, to] = pair.split("→");
      return to.toLowerCase() === focusNorm;
    })
    .sort((a, b) => b[1] - a[1]);

  const matchIdx = pairsToFocus.findIndex(([pair]) => {
    const [from] = pair.split("→");
    return from.toLowerCase() === flowFromKey;
  });
  if (matchIdx === -1) return null;

  const [pair, count] = pairsToFocus[matchIdx]!;
  const [from, to] = pair.split("→");
  return { rank: matchIdx + 1, from, to, count };
}

function resolveFlowReferenceLatencies(
  keyEntry: PerKeyAccumulator | undefined,
  flowFromKey: string | undefined,
): number[] {
  if (!keyEntry || !flowFromKey) return [];
  return keyEntry.referenceLatenciesByFrom.get(flowFromKey) ?? [];
}

function resolveLateKeystroke(
  keyEntry: PerKeyAccumulator | undefined,
  focusKey: string,
  flowFromKey: string | undefined,
): KeystrokeDiagnostics["lateKeystroke"] {
  if (!flowFromKey) {
    return { rate: 0, count: 0, totalErrorsCount: 0 };
  }

  const refFrom = normalizeReferenceFromKey(flowFromKey, focusKey);
  const count = refFrom ? (keyEntry?.lateKeystrokeByFrom.get(refFrom) ?? 0) : 0;
  const totalErrorsCount = refFrom ? (keyEntry?.incorrectReferenceByFrom.get(refFrom) ?? 0) : 0;
  return {
    rate: totalErrorsCount > 0 ? (count / totalErrorsCount) * 100 : 0,
    count,
    totalErrorsCount,
  };
}

function computeLatencyConsistency(latencies: number[], histogramUpperBoundMs: number) {
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
    histogram: buildLatencyHistogram(latencies, LATENCY_HISTOGRAM_BINS, histogramUpperBoundMs),
    histogramUpperBoundMs,
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

export function selectBurstNgrams(
  bursts: Map<string, { count: number; totalLatencyMs: number }>,
  focusKey: string,
): BurstNgram[] {
  const burstNgrams: BurstNgram[] = [];
  for (const [seq, stat] of bursts.entries()) {
    if (stat.count >= BURST_MIN_SAMPLES) {
      const keys = seq.split("→");
      if (keys.includes(focusKey)) {
        burstNgrams.push({
          sequence: keys,
          avgLatencyMs: stat.totalLatencyMs / stat.count,
          count: stat.count,
        });
      }
    }
  }
  burstNgrams.sort((a, b) => b.count - a.count || a.avgLatencyMs - b.avgLatencyMs);
  return burstNgrams.slice(0, BURST_TOP_N);
}

/**
 * DiagnosticsAccumulator에서 focusKey에 대한 KeystrokeDiagnostics를 O(k)에 생성합니다.
 * events 재순회 없음.
 */
export function finalizeKeystrokeDiagnostics(
  acc: DiagnosticsAccumulator,
  focusKey: string,
  options: FinalizeDiagnosticsOptions = {},
): KeystrokeDiagnostics {
  const histogramUpperBoundMs = options.histogramUpperBoundMs ?? OUTLIER_HARD_CUTOFF_MS;

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
    burstNgrams: [],
  };

  if (!focusKey) return defaultDiagnostics;

  const keyEntry = acc.perKey.get(focusKey);
  const flowFromKey = resolveEffectiveFlowFromKey(keyEntry, focusKey, options.fromKey);

  const errorInducementCount = keyEntry?.errorInducementCount ?? 0;

  const errorInducementRate =
    acc.totalErrorStartsCount > 0
      ? (errorInducementCount / acc.totalErrorStartsCount) * 100
      : 0;

  const lateKeystroke = resolveLateKeystroke(keyEntry, focusKey, flowFromKey);
  const commonPair = resolveCommonPair(acc, focusKey, flowFromKey);

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

  const unconsciousKeys = [...acc.keyStats.entries()]
    .map(([key, stat]) => {
      const total = stat.correct + stat.incorrect;
      const errorRate = total > 0 ? (stat.incorrect / total) * 100 : 0;
      return { key, errorRate, errorCount: stat.incorrect, totalCount: total };
    })
    .filter((item) => item.errorRate > 0 && item.totalCount > UNCONSCIOUS_KEY_MIN_SAMPLES)
    .sort((a, b) => b.errorRate - a.errorRate || b.errorCount - a.errorCount)
    .slice(0, 3);

  let unconsciousKey = null;
  const matchUncIdx = unconsciousKeys.findIndex((item) => item.key === focusKey);
  if (matchUncIdx !== -1) {
    unconsciousKey = { rank: matchUncIdx + 1, ...unconsciousKeys[matchUncIdx] };
  }

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

  const cloudTyping = computeCloudTypingFromSamples(
    keyEntry?.outgoingSamples ?? [],
    focusKey,
  );

  const fatalNgrams =
    keyEntry && keyEntry.contextualTypos.ngrams.size > 0
      ? selectFatalNgrams(keyEntry.contextualTypos.ngrams, focusKey)
      : [];

  const burstNgrams = selectBurstNgrams(acc.bursts, focusKey);

  const keyPanelLatencies = keyEntry?.referenceLatencies ?? [];
  const flowLatencies = resolveFlowReferenceLatencies(keyEntry, flowFromKey);

  const sharedFields = {
    errorInducement: {
      rate: errorInducementRate,
      count: errorInducementCount,
      totalErrorStartsCount: acc.totalErrorStartsCount,
    },
    lateKeystroke,
    commonPair,
    unconsciousKey,
    shiftPenalty,
    spatialErrorDistance,
    cloudTyping,
    fatalNgrams,
    burstNgrams,
  };

  const flowMedianLatencyMs =
    flowLatencies.length > 0 ? getMedian(flowLatencies) : 0;
  const flowEquivalentCpm =
    flowMedianLatencyMs > 0 ? Math.round(60000 / flowMedianLatencyMs) : 0;

  let flowHesitation = defaultDiagnostics.hesitation;
  if (flowLatencies.length > 0) {
    const sortedFlow = [...flowLatencies].sort((a, b) => a - b);
    const q1Flow = getPercentile(sortedFlow, 0.25);
    const q3Flow = getPercentile(sortedFlow, 0.75);
    const iqrFlow = q3Flow - q1Flow;
    const flowThreshold = q3Flow + 1.5 * iqrFlow;
    const flowHesitationCount = flowLatencies.filter((l) => l > flowThreshold).length;
    const flowHesitationRatio = (flowHesitationCount / flowLatencies.length) * 100;
    flowHesitation = {
      ratio: flowHesitationRatio,
      hasTendency: flowHesitationRatio >= 5,
      thresholdMs: flowThreshold,
    };
  }

  if (keyPanelLatencies.length === 0) {
    return {
      ...defaultDiagnostics,
      ...sharedFields,
      speedMetrics: { medianLatencyMs: flowMedianLatencyMs, equivalentCpm: flowEquivalentCpm },
      hesitation: flowHesitation,
    };
  }

  const latencyConsistency = computeLatencyConsistency(keyPanelLatencies, histogramUpperBoundMs);

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
      relativeSpeedMs = getMedian(keyPanelLatencies) - comparedToMedianMs;
    }
  }

  return {
    ...sharedFields,
    speedMetrics: { medianLatencyMs: flowMedianLatencyMs, equivalentCpm: flowEquivalentCpm },
    hesitation: flowHesitation,
    fingerTransitions: {
      ratios: transitionRatios,
      counts: fingerCounts,
    },
    relativeSpeed: {
      speedDiffMs: relativeSpeedMs,
      handMedianMs: comparedToMedianMs,
    },
    latencyConsistency,
  };
}
