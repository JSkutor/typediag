import { describe, expect, it } from "vitest";
import type { KeyEvent } from "@/lib/skdm";
import { extractStrictOutgoingScatterPoints } from "@/lib/dev/cloudTypingDev";

describe("extractStrictOutgoingScatterPoints", () => {
  it("maps duration to reference transition hold and latency to outgoing transition", () => {
    const events: KeyEvent[] = [
      { fromKey: null, toKey: "a", latencyMs: 0, holdDurationMs: 10, isCorrect: true },
      { fromKey: "a", toKey: "f", latencyMs: 50, holdDurationMs: 120, isCorrect: true },
      { fromKey: "f", toKey: "j", latencyMs: 80, holdDurationMs: 40, isCorrect: true },
    ];

    expect(extractStrictOutgoingScatterPoints(events, "f")).toEqual([
      { durationMs: 120, latencyMs: 80, toKey: "j" },
    ]);
  });

  it("excludes when reference transition keystroke was incorrect", () => {
    const events: KeyEvent[] = [
      { fromKey: null, toKey: "a", latencyMs: 0, holdDurationMs: 10, isCorrect: true },
      {
        fromKey: "a",
        toKey: "f",
        latencyMs: 50,
        holdDurationMs: 120,
        isCorrect: false,
        expectedChar: "g",
      },
      { fromKey: "f", toKey: "j", latencyMs: 80, holdDurationMs: 40, isCorrect: true },
    ];

    expect(extractStrictOutgoingScatterPoints(events, "f")).toEqual([]);
  });
});
