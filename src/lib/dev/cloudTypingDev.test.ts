import { describe, expect, it } from "vitest";
import type { KeyEvent } from "@/lib/skdm";
import {
  buildCloudTypingDevData,
  computeDevCloudBandLatencies,
  computeDevNormalizedDifference,
  isDevCloudTypingStroke,
  traceDevCloudBandPolygon,
} from "@/lib/dev/cloudTypingDev";

describe("computeDevNormalizedDifference", () => {
  it("uses |L-D|/max(L+D, M)", () => {
    expect(computeDevNormalizedDifference(40, 20)).toBeCloseTo(20 / 300, 4);
    expect(computeDevNormalizedDifference(100, 100)).toBeCloseTo(0, 4);
    expect(computeDevNormalizedDifference(120, 80)).toBeCloseTo(40 / 300, 4);
  });
});

describe("isDevCloudTypingStroke", () => {
  it("classifies based on absolute tolerance when L+D <= M", () => {
    expect(isDevCloudTypingStroke(20, 40)).toBe(true);
    expect(isDevCloudTypingStroke(10, 100)).toBe(false);
  });

  it("classifies based on relative tolerance when L+D > M", () => {
    expect(isDevCloudTypingStroke(150, 200)).toBe(true);
    expect(isDevCloudTypingStroke(100, 250)).toBe(false);
  });
});

describe("computeDevCloudBandLatencies", () => {
  it("returns band bounds respecting minDenomMs", () => {
    // hold=20, M=80, ndMax=0.25. Absolute region: |L - 20| <= 20 => L in [0, 40]
    const { lowerMs, upperMs } = computeDevCloudBandLatencies(20, 0.25, 80);
    expect(lowerMs).toBeCloseTo(0, 4);
    expect(upperMs).toBeCloseTo(40, 4);
    
    // hold=100, L+D > 80. Relative region: L <= 100 * 1.25 / 0.75 = 166.6, L >= 100 * 0.75 / 1.25 = 60
    const { lowerMs: l2, upperMs: u2 } = computeDevCloudBandLatencies(100, 0.25, 80);
    expect(l2).toBeCloseTo(60, 4);
    expect(u2).toBeCloseTo(166.666, 2);
  });
});

describe("traceDevCloudBandPolygon", () => {
  it("traces valid polygon paths", () => {
    const polygon = traceDevCloudBandPolygon(200, 200, 0.25, 80);
    expect(polygon.length).toBeGreaterThan(0);
    expect(polygon[0].hold).toBe(0);
    expect(polygon.some((p) => p.hold > 0 && p.latency > 0)).toBe(true);
  });
});

describe("buildCloudTypingDevData", () => {
  it("maps duration to reference transition hold and latency to outgoing transition", () => {
    const events: KeyEvent[] = [
      { fromKey: null, toKey: "a", latencyMs: 0, holdDurationMs: 10, isCorrect: true },
      { fromKey: "a", toKey: "f", latencyMs: 50, holdDurationMs: 120, isCorrect: true },
      { fromKey: "f", toKey: "j", latencyMs: 80, holdDurationMs: 40, isCorrect: true },
    ];

    const { analysisPoints } = buildCloudTypingDevData(events, "f");
    expect(analysisPoints).toEqual([
      expect.objectContaining({
        holdMs: 120,
        latencyMs: 80,
        toKey: "j",
        inAnalysisPool: true,
      }),
    ]);
  });

  it("includes incorrect reference transition when outgoing is valid (diag §2.1.4)", () => {
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

    const { analysisPoints } = buildCloudTypingDevData(events, "f");
    expect(analysisPoints).toHaveLength(1);
  });

  it("excludes outgoing transitions to shift/backspace/enter", () => {
    const events: KeyEvent[] = [
      { fromKey: null, toKey: "a", latencyMs: 0, holdDurationMs: 10, isCorrect: true },
      { fromKey: "a", toKey: "f", latencyMs: 50, holdDurationMs: 120, isCorrect: true },
      { fromKey: "f", toKey: "enter", latencyMs: 80, holdDurationMs: 40, isCorrect: true },
    ];

    const { analysisPoints, rawOutgoingCount } = buildCloudTypingDevData(events, "f");
    expect(rawOutgoingCount).toBe(0);
    expect(analysisPoints).toEqual([]);
  });

  it("reflects minDenomMs in diagnostics and scatter cloud ratio", () => {
    const events: KeyEvent[] = [
      { fromKey: null, toKey: "x", latencyMs: 0, holdDurationMs: 10, isCorrect: true },
    ];

    for (let i = 0; i < 11; i++) {
      events.push({
        fromKey: i === 0 ? "x" : `t${i - 1}`,
        toKey: "f",
        latencyMs: 50,
        holdDurationMs: 20,
        isCorrect: true,
      });
      events.push({
        fromKey: "f",
        toKey: `k${i}`,
        latencyMs: 40,
        holdDurationMs: 30,
        isCorrect: true,
      });
    }

    const withMinDenom = buildCloudTypingDevData(events, "f", { minDenomMs: 80 });
    const withoutMinDenom = buildCloudTypingDevData(events, "f", { minDenomMs: 0 });

    const cloudCountWithM = withMinDenom.analysisPoints.filter((point) => point.isCloudStroke).length;
    const cloudCountWithoutM = withoutMinDenom.analysisPoints.filter(
      (point) => point.isCloudStroke,
    ).length;

    expect(withMinDenom.diagnostics.key?.cloudTypingRatio).toBeCloseTo(
      cloudCountWithM / withMinDenom.analysisPoints.length,
      6,
    );
    expect(withoutMinDenom.diagnostics.key?.cloudTypingRatio).toBeCloseTo(
      cloudCountWithoutM / withoutMinDenom.analysisPoints.length,
      6,
    );
    expect(cloudCountWithM).toBeGreaterThan(cloudCountWithoutM);
  });

  it("marks hesitation outliers as excluded from analysis pool", () => {
    const events: KeyEvent[] = [
      { fromKey: null, toKey: "x", latencyMs: 0, holdDurationMs: 10, isCorrect: true },
    ];

    for (let i = 0; i < 7; i++) {
      events.push({
        fromKey: i === 0 ? "x" : `t${i - 1}`,
        toKey: "f",
        latencyMs: 50,
        holdDurationMs: 80,
        isCorrect: true,
      });
      events.push({
        fromKey: "f",
        toKey: `k${i}`,
        latencyMs: 60 + i,
        holdDurationMs: 30,
        isCorrect: true,
      });
    }
    events.push({
      fromKey: "t6",
      toKey: "f",
      latencyMs: 50,
      holdDurationMs: 80,
      isCorrect: true,
    });
    events.push({
      fromKey: "f",
      toKey: "slow",
      latencyMs: 500,
      holdDurationMs: 30,
      isCorrect: true,
    });

    const { analysisPoints, excludedPoints } = buildCloudTypingDevData(events, "f");
    expect(excludedPoints).toHaveLength(1);
    expect(excludedPoints[0]?.latencyMs).toBe(500);
    expect(excludedPoints[0]?.inAnalysisPool).toBe(false);
    expect(analysisPoints.every((point) => point.inAnalysisPool)).toBe(true);
    expect(analysisPoints.map((point) => point.latencyMs)).not.toContain(500);
  });
});
