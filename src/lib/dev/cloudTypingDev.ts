import type { KeyEvent } from "@/lib/skdm";

import { countCorrectEventsByToKey, selectTopToKey } from "./piecewiseDev";

export interface CloudTypingScatterPoint {
  /** reference transition 행(toKey === centerKey)의 holdDurationMs */
  durationMs: number;
  /** outgoing transition(fromKey === centerKey)의 latencyMs */
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
 * centerKey(focusKey)에서 나가는 outgoing transition — effectiveness(엄격 풀)과 동일 필터.
 * - outgoingEvent.fromKey === centerKey
 * - outgoingEvent·referenceEvent 모두 정답
 * - referenceEvent.toKey === centerKey → duration = focusKey 홀드
 */
export function extractStrictOutgoingScatterPoints(
  events: KeyEvent[],
  centerKey: string,
): CloudTypingScatterPoint[] {
  const points: CloudTypingScatterPoint[] = [];

  for (let i = 1; i < events.length; i++) {
    const outgoingEvent = events[i];
    const referenceEvent = events[i - 1];

    if (outgoingEvent.fromKey !== centerKey) continue;
    if (outgoingEvent.isCorrect !== true || outgoingEvent.latencyMs <= 0) continue;
    if (referenceEvent.isCorrect !== true || referenceEvent.toKey !== centerKey) continue;
    if (!hasValidHold(referenceEvent)) continue;

    points.push({
      durationMs: referenceEvent.holdDurationMs,
      latencyMs: outgoingEvent.latencyMs,
      toKey: outgoingEvent.toKey,
    });
  }

  return points;
}

export { countCorrectEventsByToKey, selectTopToKey };
