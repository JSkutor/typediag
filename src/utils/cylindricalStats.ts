import { KeyEvent } from "@/lib/skdm";
import { KEYBOARD_META, getHand, needsShift } from "@/lib/skdm/keyboardMeta";
import { getSpatialErrorDistance } from "@/lib/skdm/diagnostics";
import { getMAD, getMedian, getPercentile, getStudentTPValue } from "./stats";
import { PiecewiseFitOutcome } from "@/utils/piecewiseRegression";

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
  holdCorrelation: {
    pearsonR: number;
    pValue: number;
    isSignificant: boolean;
    sampleCount: number;
  };
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

export function calculateKeystrokeDiagnostics(
  events: KeyEvent[],
  selectedTo: string,
): KeystrokeDiagnostics {
  const defaultDiagnostics: KeystrokeDiagnostics = {
    errorInducement: { rate: 0, count: 0, totalErrorStartsCount: 0 },
    lateKeystroke: { rate: 0, count: 0, totalErrorsCount: 0 },
    commonPair: null,
    unconsciousKey: null,
    shiftPenalty: null,
    speedMetrics: { medianLatencyMs: 0, equivalentCpm: 0 },
    holdCorrelation: { pearsonR: 0, pValue: 1.0, isSignificant: false, sampleCount: 0 },
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

  if (!selectedTo || events.length === 0) {
    return defaultDiagnostics;
  }

  // 1) 오타 유발 및 순서 뒤바뀜 (additionalStats 대응)
  let totalErrorStartsCount = 0;
  let errorInducementCount = 0;
  let totalErrorsCount = 0;
  let lateKeystrokeCount = 0;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const prevEv = i > 0 ? events[i - 1] : null;
    const isErrorStart = ev.isCorrect === false && (prevEv === null || prevEv.isCorrect === true);

    if (isErrorStart) {
      totalErrorStartsCount++;
      if (ev.toKey === selectedTo) {
        errorInducementCount++;
      }
    }

    if (ev.toKey === selectedTo && ev.isCorrect === false) {
      totalErrorsCount++;
    }
  }

  for (let k = 0; k < events.length - 1; k++) {
    const prev = k > 0 ? events[k - 1] : null;
    const curr = events[k];
    const next = events[k + 1];
    const isPrevCorrect = prev ? prev.isCorrect === true : true;

    if (
      curr.isCorrect === false &&
      next.isCorrect === false &&
      isPrevCorrect &&
      next.toKey === selectedTo &&
      curr.expectedChar === selectedTo
    ) {
      lateKeystrokeCount++;
    }
  }

  const errorInducementRate =
    totalErrorStartsCount > 0 ? (errorInducementCount / totalErrorStartsCount) * 100 : 0;
  const lateKeystrokeRate =
    totalErrorsCount > 0 ? (lateKeystrokeCount / totalErrorsCount) * 100 : 0;

  const spatialErrorDistance = getSpatialErrorDistance(events, selectedTo);

  // 2) 선택적 진단 (optionalStats 대응)
  const EXCLUDE_KEYS = new Set(["shift_l", "shift_r", "backspace", "enter"]);
  const isAlphaKey = (k: string) => /^[a-zA-Z]$/.test(k);

  // (1) 빈번 순서쌍 top5
  const pairCounts = new Map<string, number>();
  for (const ev of events) {
    if (
      ev.isCorrect === true &&
      ev.fromKey &&
      ev.toKey &&
      isAlphaKey(ev.toKey) &&
      !EXCLUDE_KEYS.has(ev.fromKey) &&
      !EXCLUDE_KEYS.has(ev.toKey)
    ) {
      const pairKey = `${ev.fromKey}→${ev.toKey}`;
      pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);
    }
  }
  const allTopPairs = [...pairCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  let commonPair = null;
  const matchIdx = allTopPairs.findIndex(([pair]) => pair.split("→")[1] === selectedTo);
  if (matchIdx !== -1) {
    const [pair, count] = allTopPairs[matchIdx];
    const [from, to] = pair.split("→");
    commonPair = { rank: matchIdx + 1, from, to, count };
  }

  // (2) 무의식적 오타 키 top3
  const keyStats = new Map<string, { correct: number; incorrect: number }>();
  for (const ev of events) {
    if (ev.isCorrect === true || ev.isCorrect === false) {
      const key = ev.toKey;
      if (EXCLUDE_KEYS.has(key)) continue;
      if (!keyStats.has(key)) {
        keyStats.set(key, { correct: 0, incorrect: 0 });
      }
      const stat = keyStats.get(key)!;
      if (ev.isCorrect === true) {
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
  const matchUnconsciousIdx = unconsciousKeys.findIndex((item) => item.key === selectedTo);
  if (matchUnconsciousIdx !== -1) {
    unconsciousKey = { rank: matchUnconsciousIdx + 1, ...unconsciousKeys[matchUnconsciousIdx] };
  }

  // (3) 시프트 지연 패널티
  const correctEvents = events.filter((ev) => ev.isCorrect === true);
  const shiftLatencies: number[] = [];
  const nonShiftLatencies: number[] = [];

  for (const ev of correctEvents) {
    if (EXCLUDE_KEYS.has(ev.toKey)) continue;
    const char = ev.expectedChar || ev.keyChar;
    if (needsShift(char)) {
      shiftLatencies.push(ev.latencyMs);
    } else {
      nonShiftLatencies.push(ev.latencyMs);
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

  // 3) 상세 통계 (detailedStats 대응)
  const targetCorrectEvents = events.filter(
    (ev) => ev.toKey === selectedTo && ev.isCorrect === true,
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
    };
  }

  // 반응 속도 및 CPM
  const latencies = targetCorrectEvents.map((ev) => ev.latencyMs);
  const medianLatencyMs = getMedian(latencies);
  const equivalentCpm = medianLatencyMs > 0 ? Math.round(60000 / medianLatencyMs) : 0;
  const latencyConsistency = computeLatencyConsistency(latencies);

  // Hold Duration 상관계수
  const validPairs = targetCorrectEvents
    .filter(
      (ev) =>
        ev.holdDurationMs !== undefined &&
        ev.holdDurationMs !== null &&
        typeof ev.holdDurationMs === "number",
    )
    .map((ev) => ({ x: ev.holdDurationMs as number, y: ev.latencyMs }));

  let pearsonR = 0;
  let pValue = 1.0;
  let isCorrelationSignificant = false;

  if (validPairs.length >= 3) {
    const xs = validPairs.map((p) => p.x);
    const ys = validPairs.map((p) => p.y);
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;

    let num = 0;
    let denX = 0;
    let denY = 0;
    for (let i = 0; i < validPairs.length; i++) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    if (denX > 0 && denY > 0) {
      pearsonR = num / Math.sqrt(denX * denY);
      pearsonR = Math.max(-1, Math.min(1, pearsonR));

      const df = validPairs.length - 2;
      if (Math.abs(pearsonR) < 1.0) {
        const t = pearsonR * Math.sqrt(df / (1 - pearsonR * pearsonR));
        pValue = getStudentTPValue(t, df);
      } else {
        pValue = 0.0;
      }
      isCorrelationSignificant = pearsonR > 0.4 && pValue < 0.05;
    }
  }

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
  const targetMeta = KEYBOARD_META[selectedTo.toLowerCase()];
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

    for (const ev of targetCorrectEvents) {
      if (!ev.fromKey) {
        transitionCounts.other++;
        transitionCounts.total++;
        continue;
      }

      const fromKeyLower = ev.fromKey.toLowerCase();
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
        (ev) =>
          ev.isCorrect === true && ev.toKey !== selectedTo && getHand(ev.toKey) === targetHand,
      )
      .map((ev) => ev.latencyMs);

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
    holdCorrelation: {
      pearsonR,
      pValue,
      isSignificant: isCorrelationSignificant,
      sampleCount: validPairs.length,
    },
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
