import { describe, it, expect } from "vitest";
import { runPipeline, buildLayout, triangulate } from "./index";
import { KeyEvent } from "./types";

describe("SKDM Pipeline", () => {
  it("should process physical key events and return KeyStats and triangles without mutating logic", () => {
    // We explicitly avoid modifying mathematical logic, 
    // only verifying that it executes correctly.
    
    const events: KeyEvent[] = [
      { fromKey: "t", toKey: "h", latencyMs: 120 },
      { fromKey: "h", toKey: "e", latencyMs: 110 },
      { fromKey: "e", toKey: "space", latencyMs: 130 },
      { fromKey: "space", toKey: "q", latencyMs: 180 },
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
    expect(results).toHaveProperty("space");

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
    const keysWithData = Object.keys(results).filter(k => results[k].confidence > 0);
    expect(keysWithData).toHaveLength(0);

    const { triangles } = triangulate(results);
    expect(triangles).toBeDefined(); // Triangles are generated from the base layout coordinates
  });
});
