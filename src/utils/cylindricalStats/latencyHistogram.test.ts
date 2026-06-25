import { describe, expect, it } from "vitest";
import { buildLatencyHistogram } from "./finalize";

describe("buildLatencyHistogram", () => {
  const upperBoundMs = 500;

  it("uses a fixed 0..upperBoundMs range across keys", () => {
    const fastKey = buildLatencyHistogram([20, 40, 60, 80, 100], 12, upperBoundMs);
    const slowKey = buildLatencyHistogram([300, 350, 400, 450, 480], 12, upperBoundMs);

    expect(fastKey).toHaveLength(12);
    expect(slowKey).toHaveLength(12);
    expect(fastKey[0]).toBeGreaterThan(0);
    expect(slowKey[9]).toBeGreaterThan(0);
    expect(fastKey[9]).toBe(0);
    expect(slowKey[0]).toBe(0);
  });

  it("clamps values above upperBoundMs into the last bin", () => {
    const histogram = buildLatencyHistogram([100, 600, 900], 12, upperBoundMs);

    const lastBinIdx = 11;
    expect(histogram[lastBinIdx]).toBeGreaterThan(0);
    expect(histogram.slice(0, lastBinIdx).every((count) => count === 0 || count > 0)).toBe(true);
  });

  it("normalizes bin heights relative to the peak count", () => {
    const histogram = buildLatencyHistogram([100, 100, 100, 200], 12, upperBoundMs);

    expect(Math.max(...histogram)).toBe(100);
  });
});
