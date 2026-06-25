import { describe, expect, it } from "vitest";
import { calculateChartData } from "./cylindricalStats";
import type { PiecewiseFitSuccess } from "@/utils/piecewiseRegression";

function makeSuccessOutcome(
  points: Array<{ x: number; y: number }>,
  predict: (x: number) => number,
  c = 5,
): PiecewiseFitSuccess {
  return {
    result: {
      c,
      beta0: 120,
      beta1: -2,
      beta2: 0,
      slopeBefore: -2,
      slopeAfter: -2,
      n: points.length,
      predict,
      sampleDots: points,
    },
    diagnostics: {
      focusKey: "f",
      boundRecord: {
        final_upper_bound_ms: 500,
        max_clip_ms: 750,
        source_event_count: 100,
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      upperBoundMs: 500,
      rawCorrectCount: 100,
      excludedByBoundCount: 0,
      c0: c,
      points,
    },
  };
}

describe("calculateChartData", () => {
  it("returns null for failure or empty outcomes", () => {
    expect(calculateChartData(null)).toBeNull();
    expect(
      calculateChartData({
        reason: "insufficient_data",
        focusKey: "f",
        boundRecord: null,
        rawCorrectCount: 5,
        excludedByBoundCount: 0,
        filteredCount: 0,
      }),
    ).toBeNull();
    expect(calculateChartData(makeSuccessOutcome([], (x) => 100 - x))).toBeNull();
  });

  it("computes regression samples and padded y domain", () => {
    const outcome = makeSuccessOutcome(
      [
        { x: 1, y: 120 },
        { x: 5, y: 100 },
        { x: 10, y: 80 },
      ],
      (x) => 120 - x * 2,
      5,
    );

    const chart = calculateChartData(outcome);

    expect(chart).not.toBeNull();
    expect(chart!.xMax).toBe(10);
    expect(chart!.points).toHaveLength(3);
    expect(chart!.regressionSamples).toEqual([
      { x: 0, y: 120 },
      { x: 5, y: 110 },
      { x: 10, y: 100 },
    ]);
    expect(chart!.domainYMin).toBeLessThan(80);
    expect(chart!.domainYMax).toBeGreaterThan(120);
    expect(chart!.yTickValues).toHaveLength(4);
  });
});
