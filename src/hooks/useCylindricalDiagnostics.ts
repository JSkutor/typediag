import { useMemo } from "react";
import { KeyEvent } from "@/lib/skdm";
import { fitPiecewiseLinearWithDiagnostics } from "@/utils/piecewiseRegression";
import { countCorrectEventsByToKey, ensureFinalUpperBound } from "@/lib/dev/piecewiseDev";
import { calculateKeystrokeDiagnostics, calculateChartData } from "@/utils/cylindricalStats";

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
  const chartData = useMemo(() => calculateChartData(outcome), [outcome]);

  // 4. 단일 진단 통계 (Keystroke Diagnostics) 계산
  const diagnostics = useMemo(
    () => calculateKeystrokeDiagnostics(events, selectedTo),
    [events, selectedTo],
  );

  return {
    toKeyOptions,
    outcome,
    chartData,
    diagnostics,
  };
}
