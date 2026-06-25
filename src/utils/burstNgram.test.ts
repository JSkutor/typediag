import { describe, expect, it } from "vitest";
import type { KeyEvent } from "@/lib/skdm";
import {
  BURST_LATENCY_MAX_MS,
  BURST_MIN_SAMPLES,
  BURST_TOP_N,
  buildDiagnosticsAccumulator,
  finalizeKeystrokeDiagnostics,
  selectBurstNgrams,
} from "./cylindricalStats";

function burstStroke(
  fromKey: string,
  toKey: string,
  latencyMs: number,
): KeyEvent {
  return { fromKey, toKey, latencyMs, isCorrect: true };
}

function repeatBurstBlock(block: KeyEvent[], times: number): KeyEvent[] {
  return Array.from({ length: times }, () => block).flat();
}

describe("selectBurstNgrams", () => {
  it("exports burst constants", () => {
    expect(BURST_LATENCY_MAX_MS).toBe(30);
    expect(BURST_MIN_SAMPLES).toBe(10);
    expect(BURST_TOP_N).toBe(3);
  });

  it("filters by focusKey and minimum sample count", () => {
    const bursts = new Map([
      ["s→d", { count: 12, totalLatencyMs: 300 }],
      ["d→k", { count: 11, totalLatencyMs: 220 }],
      ["s→d→k", { count: 10, totalLatencyMs: 250 }],
      ["a→b", { count: 15, totalLatencyMs: 400 }],
    ]);

    const result = selectBurstNgrams(bursts, "k");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      sequence: ["d", "k"],
      avgLatencyMs: 220 / 11,
      count: 11,
    });
    expect(result[1]).toEqual({
      sequence: ["s", "d", "k"],
      avgLatencyMs: 25,
      count: 10,
    });
  });

  it("sorts by count desc then avgLatencyMs asc and caps at BURST_TOP_N", () => {
    const bursts = new Map([
      ["a→k", { count: 10, totalLatencyMs: 250 }],
      ["b→k", { count: 12, totalLatencyMs: 360 }],
      ["c→k", { count: 11, totalLatencyMs: 220 }],
      ["d→k", { count: 11, totalLatencyMs: 198 }],
    ]);

    const result = selectBurstNgrams(bursts, "k");

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.sequence.join("→"))).toEqual(["b→k", "d→k", "c→k"]);
  });
});

describe("buildDiagnosticsAccumulator · burst", () => {
  it("accumulates 2-gram and 3-gram burst patterns", () => {
    const events: KeyEvent[] = [
      burstStroke("x", "s", 50),
      burstStroke("s", "d", 25),
      burstStroke("d", "k", 20),
    ];

    const acc = buildDiagnosticsAccumulator(events);

    expect(acc.bursts.get("s→d")).toEqual({ count: 1, totalLatencyMs: 25 });
    expect(acc.bursts.get("d→k")).toEqual({ count: 1, totalLatencyMs: 20 });
    expect(acc.bursts.get("s→d→k")).toEqual({ count: 1, totalLatencyMs: 22.5 });
  });

  it("resets burst window when latency exceeds BURST_LATENCY_MAX_MS", () => {
    const events: KeyEvent[] = [
      burstStroke("x", "s", 20),
      burstStroke("s", "d", 40),
    ];

    const acc = buildDiagnosticsAccumulator(events);

    expect(acc.bursts.get("s→d")).toBeUndefined();
    expect(acc.bursts.size).toBe(0);
  });

  it("clears burst window on incorrect stroke", () => {
    const events: KeyEvent[] = [
      burstStroke("x", "s", 20),
      burstStroke("s", "d", 25),
      { fromKey: "d", toKey: "k", latencyMs: 20, isCorrect: false },
      burstStroke("k", "j", 20),
    ];

    const acc = buildDiagnosticsAccumulator(events);

    expect(acc.bursts.get("s→d")).toEqual({ count: 1, totalLatencyMs: 25 });
    expect(acc.bursts.get("d→k")).toBeUndefined();
  });

  it("finalizeKeystrokeDiagnostics includes burstNgrams when reference latencies are absent", () => {
    const block: KeyEvent[] = [
      burstStroke("x", "s", 50),
      burstStroke("s", "d", 25),
      { fromKey: "d", toKey: "k", latencyMs: 0, isCorrect: true },
      burstStroke("k", "j", 28),
    ];
    const events = repeatBurstBlock(block, BURST_MIN_SAMPLES);

    const diagnostics = finalizeKeystrokeDiagnostics(buildDiagnosticsAccumulator(events), "k");

    expect(diagnostics.burstNgrams.length).toBeGreaterThan(0);
    expect(diagnostics.burstNgrams.some((b) => b.sequence.includes("k"))).toBe(true);
    expect(diagnostics.speedMetrics.medianLatencyMs).toBe(0);
  });
});
