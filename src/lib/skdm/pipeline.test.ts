import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { runPipeline, buildLayout, triangulate } from "./index";
import { readSkdmFinalUpperBound } from "./outlierBoundStorage";
import { KeyEvent } from "./types";

describe("SKDM Pipeline", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });
  it("should process physical key events and return KeyStats and triangles without mutating logic", () => {
    // We explicitly avoid modifying mathematical logic,
    // only verifying that it executes correctly.

    const events: KeyEvent[] = [
      { fromKey: "t", toKey: "h", latencyMs: 120 },
      { fromKey: "h", toKey: "e", latencyMs: 110 },
      { fromKey: "e", toKey: "q", latencyMs: 150 },
      { fromKey: "q", toKey: "u", latencyMs: 90 },
      { fromKey: "u", toKey: "i", latencyMs: 100 },
      { fromKey: "i", toKey: "c", latencyMs: 115 },
      { fromKey: "c", toKey: "k", latencyMs: 140 },
    ];

    const layout = buildLayout(); // Uses QWERTY by default

    // 1. Run pipeline
    const results = runPipeline(events, layout);

    // Validate some known keys were processed
    expect(results).toHaveProperty("t");
    expect(results).toHaveProperty("h");
    expect(results).toHaveProperty("e");

    // The result for 'h' should have computed latency based on its transition from 't'
    const hResult = results["h"];
    expect(hResult.z).toBeGreaterThanOrEqual(0);
    expect(hResult.stdev).toBeGreaterThanOrEqual(0);

    // 2. Triangulate the results for 3D surface
    const { triangles } = triangulate(results);

    // Triangles should be a flat Uint32Array (or Float32Array depending on implementation,
    // but the system expects an array-like structure divisible by 3)
    expect(triangles).toBeDefined();
    if (triangles) {
      expect(triangles.length % 3).toBe(0); // Every 3 indices form a triangle
    }
  });

  it("should handle empty event arrays gracefully", () => {
    const events: KeyEvent[] = [];
    const layout = buildLayout();

    const results = runPipeline(events, layout);
    const keysWithData = Object.keys(results).filter((k) => results[k].confidence > 0);
    expect(keysWithData).toHaveLength(0);

    const { triangles } = triangulate(results);
    expect(triangles).toBeDefined(); // Triangles are generated from the base layout coordinates
  });

  it("should persist finalUpperBound to localStorage when dynamic IQR is applied", () => {
    const events: KeyEvent[] = Array.from({ length: 60 }).map((_, i) => ({
      fromKey: i === 0 ? null : "a",
      toKey: "b",
      latencyMs: 100 + (i % 5),
      isCorrect: true,
    }));

    runPipeline(events, buildLayout());

    const stored = readSkdmFinalUpperBound();
    expect(stored).not.toBeNull();
    expect(stored?.final_upper_bound_ms).toBeGreaterThan(0);
    expect(stored?.max_clip_ms).toBeGreaterThan(0);
    expect(stored?.source_event_count).toBe(60);
    expect(stored?.updated_at).toBeTruthy();
  });

  it("should not persist finalUpperBound when dynamic IQR is not applied", () => {
    const events: KeyEvent[] = [
      { fromKey: "a", toKey: "b", latencyMs: 120 },
      { fromKey: "b", toKey: "c", latencyMs: 110 },
    ];

    runPipeline(events, buildLayout());

    expect(readSkdmFinalUpperBound()).toBeNull();
  });
});
