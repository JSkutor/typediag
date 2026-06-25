import { KEYBOARD_META, getHand } from "@/lib/skdm/keyboardMeta";
import { getMAD, getMedian, getPercentile } from "@/utils/stats";
import {
  BURST_MIN_SAMPLES,
  BURST_TOP_N,
  FATAL_NGRAM_ERROR_RATE_THRESHOLD,
  FATAL_NGRAM_MIN_SAMPLES,
  LATENCY_CONSISTENCY_MIN_SAMPLES,
  LATENCY_HISTOGRAM_BINS,
} from "./constants";
import { computeCloudTypingFromSamples } from "./cloudTyping";
import type {
  BurstNgram,
  DiagnosticsAccumulator,
  FatalNgramEntry,
  KeystrokeDiagnostics,
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
    burstNgrams: [],
  };

  if (!focusKey) return defaultDiagnostics;

  const keyEntry = acc.perKey.get(focusKey);
  const keyStat = acc.keyStats.get(focusKey) ?? { correct: 0, incorrect: 0 };

  const errorInducementCount = keyEntry?.errorInducementCount ?? 0;
  const lateKeystrokeCount = keyEntry?.lateKeystrokeCount ?? 0;
  const totalErrorsCount = keyStat.incorrect;

  const errorInducementRate =
    acc.totalErrorStartsCount > 0
      ? (errorInducementCount / acc.totalErrorStartsCount) * 100
      : 0;
  const lateKeystrokeRate =
    totalErrorsCount > 0 ? (lateKeystrokeCount / totalErrorsCount) * 100 : 0;

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

  const allTopPairs = [...acc.pairCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  let commonPair = null;
  const matchIdx = allTopPairs.findIndex(([pair]) => pair.split("→")[1] === focusKey);
  if (matchIdx !== -1) {
    const [pair, count] = allTopPairs[matchIdx];
    const [from, to] = pair.split("→");
    commonPair = { rank: matchIdx + 1, from, to, count };
  }

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

  const latencies = keyEntry?.referenceLatencies ?? [];

  const sharedFields = {
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
    burstNgrams,
  };

  if (latencies.length === 0) {
    return {
      ...defaultDiagnostics,
      ...sharedFields,
    };
  }

  const medianLatencyMs = getMedian(latencies);
  const equivalentCpm = medianLatencyMs > 0 ? Math.round(60000 / medianLatencyMs) : 0;
  const latencyConsistency = computeLatencyConsistency(latencies);

  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const q1 = getPercentile(sortedLatencies, 0.25);
  const q3Lat = getPercentile(sortedLatencies, 0.75);
  const iqr = q3Lat - q1;
  const iqrThreshold = q3Lat + 1.5 * iqr;
  const hesitationCount = latencies.filter((l) => l > iqrThreshold).length;
  const hesitationRatio = (hesitationCount / latencies.length) * 100;

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
      relativeSpeedMs = medianLatencyMs - comparedToMedianMs;
    }
  }

  return {
    ...sharedFields,
    speedMetrics: { medianLatencyMs, equivalentCpm },
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
  };
}
