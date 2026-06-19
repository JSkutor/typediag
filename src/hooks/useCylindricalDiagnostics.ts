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

  return {
    toKeyOptions,
    outcome,
    chartData,
    additionalStats,
  };
}
