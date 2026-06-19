import { useMemo } from "react";
import { KeyEvent } from "@/lib/skdm";
import {
  fitPiecewiseLinearWithDiagnostics,
} from "@/utils/piecewiseRegression";
import {
  countCorrectEventsByToKey,
  ensureFinalUpperBound,
} from "@/lib/dev/piecewiseDev";

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

  return {
    toKeyOptions,
    outcome,
    chartData,
    additionalStats,
    optionalStats,
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

