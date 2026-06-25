import type { KeyEvent } from "@/lib/skdm";

import { countCorrectReferenceTransitions, selectDefaultFocusKey } from "./piecewiseDev";

export interface CloudTypingScatterPoint {
  /** reference transition 행(toKey === focusKey)의 holdDurationMs */
  durationMs: number;
  /** outgoing transition(fromKey === focusKey)의 latencyMs */
  latencyMs: number;
  toKey: string;
}

function hasValidHold(event: KeyEvent): event is KeyEvent & { holdDurationMs: number } {
  return (
    event.holdDurationMs !== undefined &&
    event.holdDurationMs !== null &&
    typeof event.holdDurationMs === "number"
  );
}

/**
 * focusKey에서 나가는 outgoing transition — effectiveness(엄격 풀)과 동일 필터.
 * - outgoingEvent.fromKey === focusKey
 * - outgoingEvent·referenceEvent 모두 정답
 * - referenceEvent.toKey === focusKey → duration = reference transition 홀드
 */
export function extractStrictOutgoingScatterPoints(
  events: KeyEvent[],
  focusKey: string,
): CloudTypingScatterPoint[] {
  const points: CloudTypingScatterPoint[] = [];

  for (let i = 1; i < events.length; i++) {
    const outgoingEvent = events[i];
    const referenceEvent = events[i - 1];

    if (outgoingEvent.fromKey !== focusKey) continue;
    if (outgoingEvent.isCorrect !== true || outgoingEvent.latencyMs <= 0) continue;
    if (referenceEvent.isCorrect !== true || referenceEvent.toKey !== focusKey) continue;
    if (!hasValidHold(referenceEvent)) continue;

    points.push({
      durationMs: referenceEvent.holdDurationMs,
      latencyMs: outgoingEvent.latencyMs,
      toKey: outgoingEvent.toKey,
    });
  }

  return points;
}

export { countCorrectReferenceTransitions, selectDefaultFocusKey };
