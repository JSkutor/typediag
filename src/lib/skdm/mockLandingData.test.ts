import { describe, it, expect } from "vitest";
import { getMockKeyStats, getMockCylindricalEvents } from "@/lib/skdm/mockLandingData";

describe("mockLandingData", () => {
  it("returns precomputed key stats with expected shape", () => {
    const stats = getMockKeyStats();
    expect(Object.keys(stats).length).toBeGreaterThan(20);

    const sample = stats.q ?? stats.a;
    expect(sample).toBeDefined();
    expect(sample).toMatchObject({
      key: expect.any(String),
      row: expect.any(Number),
      x: expect.any(Number),
      y: expect.any(Number),
      z: expect.any(Number),
      confidence: expect.any(Number),
    });
  });

  it("returns precomputed cylindrical events for landing demo", () => {
    const events = getMockCylindricalEvents();
    expect(events.length).toBeGreaterThan(10);

    const first = events[0];
    expect(first).toMatchObject({
      fromKey: expect.any(String),
      toKey: expect.any(String),
      latencyMs: expect.any(Number),
    });
  });
});
