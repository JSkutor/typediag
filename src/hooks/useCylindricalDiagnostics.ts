import { useMemo } from "react";
import { KeyEvent } from "@/lib/skdm";
import {
  buildDiagnosticsAccumulator,
  calculateChartData,
  finalizeKeystrokeDiagnostics,
} from "@/utils/cylindricalStats";
import { readSkdmFinalUpperBound } from "@/lib/skdm/outlierBoundStorage";
import { ensureFinalUpperBound } from "@/lib/dev/piecewiseDev";
import { fitPiecewiseFromLatencies } from "@/utils/piecewiseRegression";

export function useCylindricalDiagnostics(events: KeyEvent[], focusKey: string, fromKey?: string) {
  // O(N) 단일 패스 — events가 바뀔 때만 재실행
  const acc = useMemo(() => buildDiagnosticsAccumulator(events), [events]);

  // O(1) — accumulator에서 직접 파생, focusKey 변경 시에도 events 재순회 없음
  const focusKeyOptions = useMemo(
    () => [...acc.correctByKey.entries()].sort((a, b) => b[1] - a[1]),
    [acc],
  );

  // O(k) — focusKey reference latencies만 처리 (events 재순회 없음)
  const outcome = useMemo(() => {
    if (!focusKey || events.length === 0) return null;
    ensureFinalUpperBound(events);
    const perKeyData = acc.perKey.get(focusKey);
    const rawCorrectCount = acc.keyStats.get(focusKey)?.correct ?? 0;
    return fitPiecewiseFromLatencies(
      perKeyData?.referenceLatencies ?? [],
      focusKey,
      rawCorrectCount,
    );
  }, [acc, focusKey, events]);

  const chartData = useMemo(() => calculateChartData(outcome), [outcome]);

  // O(k) — accumulator 소비, events 재순회 없음. focusKey만 바뀌면 O(k) 재실행.
  const diagnostics = useMemo(() => {
    ensureFinalUpperBound(events);
    const bound = readSkdmFinalUpperBound();
    return finalizeKeystrokeDiagnostics(acc, focusKey, {
      histogramUpperBoundMs: bound?.final_upper_bound_ms,
      fromKey,
    });
  }, [acc, focusKey, fromKey, events]);

  return {
    focusKeyOptions,
    outcome,
    chartData,
    diagnostics,
  };
}
