import { useMemo } from "react";
import { KeyEvent } from "@/lib/skdm";
import { calculateChartData, calculateKeystrokeDiagnostics } from "@/utils/cylindricalStats";
import { countCorrectReferenceTransitions, ensureFinalUpperBound } from "@/lib/dev/piecewiseDev";
import { fitPiecewiseLinearWithDiagnostics } from "@/utils/piecewiseRegression";

export function useCylindricalDiagnostics(events: KeyEvent[], focusKey: string) {
  // 1. focusKey 후보별 reference transition 정답 수 → 선택 옵션
  const focusKeyOptions = useMemo(
    () => [...countCorrectReferenceTransitions(events).entries()].sort((a, b) => b[1] - a[1]),
    [events],
  );

  // 2. 분절 선형 회귀(Piecewise Regression) — reference transition(toKey === focusKey) 정답만
  const outcome = useMemo(() => {
    if (!focusKey || events.length === 0) return null;
    ensureFinalUpperBound(events);
    return fitPiecewiseLinearWithDiagnostics(events, focusKey);
  }, [events, focusKey]);

  const chartData = useMemo(() => calculateChartData(outcome), [outcome]);

  const diagnostics = useMemo(
    () => calculateKeystrokeDiagnostics(events, focusKey),
    [events, focusKey],
  );

  return {
    focusKeyOptions,
    outcome,
    chartData,
    diagnostics,
  };
}
