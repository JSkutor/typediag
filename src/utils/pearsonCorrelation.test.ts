import { describe, expect, it } from "vitest";
import { computeCloudTypingFromSamples, computePearsonCorrelation } from "./cylindricalStats";
import type { OutgoingTransitionSample } from "./cylindricalStats";

describe("computePearsonCorrelation", () => {
  it("returns defaults when sample count is below minimum", () => {
    const result = computePearsonCorrelation([1, 2, 3, 4], [1, 2, 3, 4]);
    expect(result.sampleCount).toBe(4);
    expect(result.isSignificant).toBe(false);
    expect(result.pearsonR).toBe(0);
    expect(result.pValue).toBe(1);
  });

  it("detects perfect positive correlation", () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2, 4, 6, 8, 10];
    const result = computePearsonCorrelation(xs, ys);

    expect(result.pearsonR).toBeCloseTo(1, 5);
    expect(result.isSignificant).toBe(true);
    expect(result.pValue).toBeLessThan(0.05);
  });

  it("detects significant negative correlation", () => {
    const xs = [0.05, 0.08, 0.1, 0.12, 0.15];
    const ys = [300, 260, 220, 180, 140];
    const result = computePearsonCorrelation(xs, ys);

    expect(result.pearsonR).toBeLessThan(-0.3);
    expect(result.isSignificant).toBe(true);
  });

  it("returns neutral significance for near-zero correlation", () => {
    const xs = [0.1, 0.2, 0.15, 0.18, 0.12];
    const ys = [200, 205, 198, 202, 201];
    const result = computePearsonCorrelation(xs, ys);

    expect(result.isSignificant).toBe(false);
  });
});

describe("computeCloudTypingFromSamples · effectiveness", () => {
  function makeSamples(
    pairs: Array<{ holdMs: number; latencyMs: number }>,
  ): OutgoingTransitionSample[] {
    return pairs.map((pair, index) => ({
      fromKey: "f",
      toKey: `t${index}`,
      latencyMs: pair.latencyMs,
      fromHoldMs: pair.holdMs,
    }));
  }

  it("classifies effective when ND falls as latency rises (negative r)", () => {
    const samples = makeSamples([
      { holdMs: 20, latencyMs: 150 },
      { holdMs: 40, latencyMs: 180 },
      { holdMs: 60, latencyMs: 210 },
      { holdMs: 80, latencyMs: 240 },
      { holdMs: 100, latencyMs: 270 },
      { holdMs: 120, latencyMs: 300 },
      { holdMs: 140, latencyMs: 330 },
      { holdMs: 160, latencyMs: 360 },
      { holdMs: 180, latencyMs: 390 },
      { holdMs: 200, latencyMs: 420 },
      { holdMs: 220, latencyMs: 450 },
    ]);

    const result = computeCloudTypingFromSamples(samples, "f");

    expect(result.insufficientSample).toBe(false);
    expect(result.effectivenessCorrelation.pearsonR).toBeLessThan(-0.3);
    expect(result.effectivenessCorrelation.isSignificant).toBe(true);
    expect(result.effectiveness).toBe("effective");
  });

  it("classifies counterproductive when ND and latency rise together", () => {
    const samples = makeSamples([
      { holdMs: 20, latencyMs: 100 },
      { holdMs: 30, latencyMs: 130 },
      { holdMs: 40, latencyMs: 160 },
      { holdMs: 50, latencyMs: 190 },
      { holdMs: 60, latencyMs: 220 },
      { holdMs: 70, latencyMs: 250 },
      { holdMs: 80, latencyMs: 280 },
      { holdMs: 90, latencyMs: 310 },
      { holdMs: 100, latencyMs: 340 },
      { holdMs: 110, latencyMs: 370 },
      { holdMs: 120, latencyMs: 400 },
    ]);

    const result = computeCloudTypingFromSamples(samples, "f");

    expect(result.effectivenessCorrelation.pearsonR).toBeGreaterThan(0.3);
    expect(result.effectivenessCorrelation.isSignificant).toBe(true);
    expect(result.effectiveness).toBe("counterproductive");
  });
});
