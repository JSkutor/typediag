import { useMemo } from "react";
import { KeyEvent } from "@/lib/skdm";
import {
  fitPiecewiseLinearWithDiagnostics,
} from "@/utils/piecewiseRegression";
import {
  countCorrectEventsByToKey,
  ensureFinalUpperBound,
} from "@/lib/dev/piecewiseDev";
import { KEYBOARD_META, getHand } from "@/lib/skdm/keyboardMeta";

export function useCylindricalDiagnostics(events: KeyEvent[], selectedTo: string) {
  // 1. 키별로 올바르게 입력된 이벤트 개수를 집계하여 정렬된 옵션 목록 생성
  const toKeyOptions = useMemo(
    () => [...countCorrectEventsByToKey(events).entries()].sort((a, b) => b[1] - a[1]),
    [events],
  );

  // 2. 분절 선형 회귀(Piecewise Regression) 계산
  const outcome = useMemo(() => {
    if (!selectedTo || events.length === 0) return null;
    ensureFinalUpperBound(events);
    return fitPiecewiseLinearWithDiagnostics(events, selectedTo);
  }, [events, selectedTo]);

  // 3. 차트 렌더링에 필요한 가공 데이터 계산
  const chartData = useMemo(() => {
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

    // Y축 그리드 틱 생성 (4개)
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
  }, [outcome]);

  // 4. 추가 통계 계산: 오타 유발율 및 키 순서 뒤바뀜 오타율
  const additionalStats = useMemo(() => {
    if (!selectedTo || events.length === 0) {
      return {
        errorInducementRate: 0,
        errorInducementCount: 0,
        totalErrorStartsCount: 0,
        lateKeystrokeRate: 0,
        lateKeystrokeCount: 0,
        totalErrorsCount: 0,
      };
    }

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

    const errorInducementRate = totalErrorStartsCount > 0 ? (errorInducementCount / totalErrorStartsCount) * 100 : 0;
    const lateKeystrokeRate = totalErrorsCount > 0 ? (lateKeystrokeCount / totalErrorsCount) * 100 : 0;

    return {
      errorInducementRate,
      errorInducementCount,
      totalErrorStartsCount,
      lateKeystrokeRate,
      lateKeystrokeCount,
      totalErrorsCount,
    };
  }, [events, selectedTo]);

  // 5. 선택 진단 통계(Optional Stats) 계산
  const optionalStats = useMemo(() => {
    if (events.length === 0) {
      return {
        topPair: null,
        unconsciousKey: null,
        shiftPenalty: null,
      };
    }

    const EXCLUDE_KEYS = new Set(["shift_l", "shift_r", "backspace", "enter"]);
    const isAlphaKey = (k: string) => /^[a-zA-Z]$/.test(k);

    // (1) 가장 많이 치는 순서쌍 top5 (isCorrect === true, toKey가 알파벳인 것만)
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
    const allTopPairs = [...pairCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    let topPair = null;
    if (selectedTo) {
      const matchIdx = allTopPairs.findIndex(([pair]) => pair.split("→")[1] === selectedTo);
      if (matchIdx !== -1) {
        const [pair, count] = allTopPairs[matchIdx];
        const [from, to] = pair.split("→");
        topPair = { rank: matchIdx + 1, from, to, count };
      }
    }

    // (2) 무의식적으로 치는 키 top3 (오타율이 높은 toKey top3, 오타율 > 0)
    const keyStats = new Map<string, { correct: number; incorrect: number }>();
    for (const ev of events) {
      if (ev.isCorrect === true || ev.isCorrect === false) {
        const key = ev.toKey;
        if (EXCLUDE_KEYS.has(key)) continue; // 기능 키 제외
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
    if (selectedTo) {
      const matchIdx = unconsciousKeys.findIndex((item) => item.key === selectedTo);
      if (matchIdx !== -1) {
        unconsciousKey = { rank: matchIdx + 1, ...unconsciousKeys[matchIdx] };
      }
    }

    // (3) 시프트 지연 패널티
    const correctEvents = events.filter((ev) => ev.isCorrect === true);
    const shiftLatencies: number[] = [];
    const nonShiftLatencies: number[] = [];

    for (const ev of correctEvents) {
      if (EXCLUDE_KEYS.has(ev.toKey)) continue; // shift key 자체는 제외
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

    return {
      topPair,
      unconsciousKey,
      shiftPenalty,
    };
  }, [events, selectedTo]);

  // 6. 상세 진단 통계 (Right Panel Column 2)
  const detailedStats = useMemo(() => {
    const defaultStats = {
      medianLatencyMs: 0,
      equivalentCpm: 0,
      pearsonR: 0,
      pValue: 1.0,
      isCorrelationSignificant: false,
      correlationCount: 0,
      iqrThreshold: 0,
      hesitationRatio: 0,
      hasHesitationTendency: false,
      transitionRatios: {
        oppositeHand: 0,
        sameHandPinky: 0,
        sameHandRing: 0,
        sameHandMiddle: 0,
        sameHandIndex: 0,
        other: 0,
      },
      transitionCounts: {
        oppositeHand: 0,
        sameHandPinky: 0,
        sameHandRing: 0,
        sameHandMiddle: 0,
        sameHandIndex: 0,
        other: 0,
        total: 0,
      },
      relativeSpeedMs: 0,
      comparedToMedianMs: 0,
    };

    if (!selectedTo || events.length === 0) {
      return defaultStats;
    }

    const correctEvents = events.filter((ev) => ev.toKey === selectedTo && ev.isCorrect === true);
    if (correctEvents.length === 0) {
      return defaultStats;
    }

    // 1) Latency 중간값 및 환산 CPM
    const latencies = correctEvents.map((ev) => ev.latencyMs);
    const medianLatencyMs = getMedian(latencies);
    const equivalentCpm = medianLatencyMs > 0 ? Math.round(60000 / medianLatencyMs) : 0;

    // 2) Duration과의 피어슨 상관계수 및 p-value 검정
    const validPairs = correctEvents
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
        pearsonR = Math.max(-1, Math.min(1, pearsonR)); // Clamp to [-1, 1]

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

    // 3) 머뭇거림 (이상치 기준선 q3 + 1.5 IQR) 비율
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const q1 = getPercentile(sortedLatencies, 0.25);
    const q3 = getPercentile(sortedLatencies, 0.75);
    const iqr = q3 - q1;
    const iqrThreshold = q3 + 1.5 * iqr;

    const hesitationCount = latencies.filter((l) => l > iqrThreshold).length;
    const hesitationRatio = latencies.length > 0 ? (hesitationCount / latencies.length) * 100 : 0;
    const hasHesitationTendency = hesitationRatio >= 5;

    // 4) 어느 손가락에서 넘어오는지 비율
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

      for (const ev of correctEvents) {
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

    // 5) 같은 손 다른 키들과 비교해서 빠른지 느린지
    let relativeSpeedMs = 0;
    let comparedToMedianMs = 0;
    if (targetMeta) {
      const targetHand = targetMeta.hand;
      const otherKeysSameHandLatencies = events
        .filter((ev) => ev.isCorrect === true && ev.toKey !== selectedTo && getHand(ev.toKey) === targetHand)
        .map((ev) => ev.latencyMs);

      if (otherKeysSameHandLatencies.length > 0) {
        comparedToMedianMs = getMedian(otherKeysSameHandLatencies);
        relativeSpeedMs = medianLatencyMs - comparedToMedianMs;
      }
    }

    return {
      medianLatencyMs,
      equivalentCpm,
      pearsonR,
      pValue,
      isCorrelationSignificant,
      correlationCount: validPairs.length,
      iqrThreshold,
      hesitationRatio,
      hasHesitationTendency,
      transitionRatios,
      transitionCounts,
      relativeSpeedMs,
      comparedToMedianMs,
    };
  }, [events, selectedTo]);

  return {
    toKeyOptions,
    outcome,
    chartData,
    additionalStats,
    optionalStats,
    detailedStats,
  };
}

function needsShift(char: string | null | undefined): boolean {
  if (!char) return false;
  // 한글 쌍자음 / 모음 (ㅃ, ㅉ, ㄸ, ㄲ, ㅆ, ㅒ, ㅖ)
  const krShift = /[ㅃㅉㄸㄲㅆㅒㅖ]/;
  if (krShift.test(char)) return true;
  // 영어 대문자 (A-Z)
  const enUpper = /[A-Z]/;
  if (enUpper.test(char)) return true;
  // 특수문자 중 Shift가 필요한 것들
  const specialShift = /[~!@#$%^&*()_+{}|:"<>?]/;
  if (specialShift.test(char)) return true;
  return false;
}

function getMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculates the two-tailed p-value for Student's t-distribution.
 * Matches trigonometric series expansion for df <= 100 and Wilson-Hilferty normal approximation for df > 100.
 */
function getStudentTPValue(t: number, df: number): number {
  if (df <= 0) return 1.0;
  t = Math.abs(t);

  if (df > 100) {
    const term1 = 1 - 2 / (9 * df);
    const term2 = t * Math.pow(1 + (t * t) / df, -1 / 3);
    const z = term2 * term1 / Math.sqrt(2 / (9 * df));
    return 2 * (1 - normalCDF(Math.abs(z)));
  }

  const x = Math.atan(t / Math.sqrt(df));
  const c = Math.cos(x);
  const s = Math.sin(x);

  if (df % 2 === 1) {
    let term = c;
    let sum = c;
    for (let i = 3; i <= df - 2; i += 2) {
      term = (term * c * c * (i - 1)) / i;
      sum += term;
    }
    return 1 - (2 / Math.PI) * (x + (df > 1 ? s * sum : 0));
  } else {
    let term = 1;
    let sum = 1;
    for (let i = 2; i <= df - 2; i += 2) {
      term = (term * c * c * (i - 1)) / i;
      sum += term;
    }
    return 1 - s * sum;
  }
}

/**
 * High-precision standard normal Cumulative Distribution Function.
 * Evaluates standard normal CDF using A&S 7.1.26 erf approximation.
 */
function normalCDF(z: number): number {
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const erf = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * erf);
}

/**
 * Calculates a specific percentile of a sorted array using linear interpolation.
 */
function getPercentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const idx = p * (arr.length - 1);
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return arr[low];
  return arr[low] + (idx - low) * (arr[high] - arr[low]);
}

