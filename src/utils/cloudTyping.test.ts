import { describe, expect, it } from "vitest";
import type { KeyEvent } from "@/lib/skdm";
import {
  computeCloudTypingDiagnostics,
  computeNormalizedDifference,
  extractOutgoingSamples,
  filterOutgoingHesitation,
  isCloudTypingStroke,
} from "./cylindricalStats";

function buildFocusOutgoingEvents(
  focusKey: string,
  outgoingCount: number,
  options?: { holdMs?: number; latencyMs?: number },
): KeyEvent[] {
  const holdMs = options?.holdMs ?? 80;
  const latencyMs = options?.latencyMs ?? 70;
  const events: KeyEvent[] = [
    { fromKey: null, toKey: "x", latencyMs: 0, holdDurationMs: 10, isCorrect: true },
  ];

  for (let i = 0; i < outgoingCount; i++) {
    const toKey = `t${i}`;
    const refFrom = i === 0 ? "x" : `t${i - 1}`;
    events.push({
      fromKey: refFrom,
      toKey: focusKey,
      latencyMs: 50,
      holdDurationMs: holdMs,
      isCorrect: true,
    });
    events.push({
      fromKey: focusKey,
      toKey,
      latencyMs: latencyMs,
      holdDurationMs: 30,
      isCorrect: true,
    });
  }

  return events;
}

describe("computeNormalizedDifference", () => {
  it("uses |L-D|/max(L+D, M) with default M=300", () => {
    expect(computeNormalizedDifference(100, 80)).toBeCloseTo(20 / 300, 4);
    expect(computeNormalizedDifference(20, 100)).toBeCloseTo(80 / 300, 4);
    expect(computeNormalizedDifference(120, 80)).toBeCloseTo(40 / 300, 4);
  });
});

describe("isCloudTypingStroke", () => {
  it("classifies ND <= 0.25 as cloud stroke", () => {
    expect(isCloudTypingStroke(100, 80)).toBe(true);
    expect(isCloudTypingStroke(70, 100)).toBe(true);
    expect(isCloudTypingStroke(60, 100)).toBe(true);
    expect(isCloudTypingStroke(20, 100)).toBe(false);
    expect(isCloudTypingStroke(10, 200)).toBe(false);
  });
});

describe("extractOutgoingSamples", () => {
  it("pairs reference hold with outgoing latency", () => {
    const events: KeyEvent[] = [
      { fromKey: null, toKey: "a", latencyMs: 0, holdDurationMs: 10, isCorrect: true },
      { fromKey: "a", toKey: "f", latencyMs: 50, holdDurationMs: 120, isCorrect: true },
      { fromKey: "f", toKey: "j", latencyMs: 80, holdDurationMs: 40, isCorrect: true },
    ];

    expect(extractOutgoingSamples(events, "f")).toEqual([
      { fromKey: "f", toKey: "j", latencyMs: 80, fromHoldMs: 120 },
    ]);
  });

  it("does not require reference transition to be correct", () => {
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

    expect(extractOutgoingSamples(events, "f")).toHaveLength(1);
  });

  it("excludes outgoing transitions to special keys", () => {
    const events: KeyEvent[] = [
      { fromKey: null, toKey: "a", latencyMs: 0, holdDurationMs: 10, isCorrect: true },
      { fromKey: "a", toKey: "f", latencyMs: 50, holdDurationMs: 120, isCorrect: true },
      { fromKey: "f", toKey: "enter", latencyMs: 80, holdDurationMs: 40, isCorrect: true },
    ];

    expect(extractOutgoingSamples(events, "f")).toEqual([]);
  });
});

describe("filterOutgoingHesitation", () => {
  it("removes latencies above Q3 + 1.5 * IQR", () => {
    const samples = [50, 55, 60, 65, 70, 75, 200].map((latencyMs, index) => ({
      fromKey: "f",
      toKey: `k${index}`,
      latencyMs,
      fromHoldMs: 80,
    }));

    const filtered = filterOutgoingHesitation(samples);
    expect(filtered).toHaveLength(6);
    expect(filtered.map((sample) => sample.latencyMs)).not.toContain(200);
  });
});

describe("computeCloudTypingDiagnostics", () => {
  it("returns insufficientSample when analysis pool has at most 10 events", () => {
    const events = buildFocusOutgoingEvents("f", 10);
    const result = computeCloudTypingDiagnostics(events, "f");

    expect(result.insufficientSample).toBe(true);
    expect(result.analysisPoolCount).toBe(10);
    expect(result.key).toBeNull();
  });

  it("computes cloud typing metrics when analysis pool exceeds 10 events", () => {
    const events = buildFocusOutgoingEvents("f", 11, { holdMs: 80, latencyMs: 70 });
    const result = computeCloudTypingDiagnostics(events, "f");

    expect(result.insufficientSample).toBe(false);
    expect(result.analysisPoolCount).toBe(11);
    expect(result.key).not.toBeNull();
    expect(result.key?.sampleCount).toBe(11);
    expect(result.key?.cloudTypingRatio).toBe(1);
    expect(result.key?.level).toBe("strong");
    expect(result.key?.dwellMs).toBe(80);
    expect(result.key?.latencyMs).toBe(70);
  });

  it("returns empty diagnostics when no outgoing samples exist", () => {
    const events: KeyEvent[] = [
      { fromKey: null, toKey: "a", latencyMs: 0, holdDurationMs: 10, isCorrect: true },
      { fromKey: "a", toKey: "b", latencyMs: 50, holdDurationMs: 40, isCorrect: true },
    ];

    const result = computeCloudTypingDiagnostics(events, "f");
    expect(result.key).toBeNull();
    expect(result.insufficientSample).toBe(false);
    expect(result.analysisPoolCount).toBe(0);
  });

  it("assigns not_applied level for low cloud ratio", () => {
    const events = buildFocusOutgoingEvents("f", 11, { holdMs: 20, latencyMs: 100 });
    const result = computeCloudTypingDiagnostics(events, "f");

    expect(result.key?.cloudTypingRatio).toBe(0);
    expect(result.key?.level).toBe("not_applied");
  });
});
