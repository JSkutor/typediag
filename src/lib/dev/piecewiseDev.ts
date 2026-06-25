import { buildLayout, runPipeline, type KeyEvent } from "@/lib/skdm";
import { readSkdmFinalUpperBound } from "@/lib/skdm/outlierBoundStorage";

/** reference transition(toKey === focusKey) 정답 건수를 focusKey 후보별로 집계한다. */
export function countCorrectReferenceTransitions(events: KeyEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.isCorrect !== true) continue;
    counts.set(event.toKey, (counts.get(event.toKey) ?? 0) + 1);
  }
  return counts;
}

/** reference transition 정답 수가 가장 많은 focusKey를 반환한다. */
export function selectDefaultFocusKey(events: KeyEvent[]): string | null {
  let topKey: string | null = null;
  let topCount = 0;

  for (const [focusKey, count] of countCorrectReferenceTransitions(events)) {
    if (count > topCount) {
      topCount = count;
      topKey = focusKey;
    }
  }

  return topKey;
}

/**
 * SKDM 파이프라인을 1회 실행해 finalUpperBound localStorage 스냅샷을 보장한다.
 * analysisEvents가 50개 미만이면 bound를 만들 수 없다.
 */
export function ensureFinalUpperBound(events: KeyEvent[]) {
  const existing = readSkdmFinalUpperBound();
  if (existing) return existing;
  if (events.length < 50) return null;

  runPipeline(events, buildLayout());
  return readSkdmFinalUpperBound();
}

export const PIECEWISE_FAILURE_LABEL: Record<string, string> = {
  no_bound: "finalUpperBound 없음 (SKDM 파이프라인 미실행 또는 이벤트 50개 미만)",
  insufficient_data: "필터 후 정답 이벤트 50개 미만",
  ols_failed: "OLS 역행렬 실패 (특이 행렬)",
};
