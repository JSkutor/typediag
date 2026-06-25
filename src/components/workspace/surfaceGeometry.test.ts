import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  buildInnerBorderLinePoints,
  buildMergedDropLines,
  computeZRange,
  subdivideSurfaceMesh,
  surfaceVertexColor,
} from "./surfaceGeometry";
import type { KeyResult } from "@/lib/skdm";

function mockKey(key: string, zSmoothed: number, confidence = 1): KeyResult {
  return {
    key,
    row: 0,
    x: 0,
    y: 0,
    z: zSmoothed,
    confidence,
    stdev: 0,
    zSmoothed,
    stdevSmoothed: 0,
  };
}

describe("surfaceVertexColor", () => {
  it("returns distinct colors for fast vs slow keys and dims low confidence", () => {
    const fast = surfaceVertexColor(0, 1);
    const slow = surfaceVertexColor(1, 1);
    const lowConf = surfaceVertexColor(0.5, 0);

    // fast should be cyan-ish (0x00f0ff: G & B high, R low)
    expect(fast.b).toBeGreaterThan(fast.r);
    expect(fast.g).toBeGreaterThan(fast.r);

    // slow should be magenta-ish (0xd946ef: R & B high, G low)
    expect(slow.r).toBeGreaterThan(slow.g);
    expect(slow.b).toBeGreaterThan(slow.g);

    expect(lowConf.r + lowConf.g + lowConf.b).toBeLessThan(
      surfaceVertexColor(0.5, 1).r + surfaceVertexColor(0.5, 1).g + surfaceVertexColor(0.5, 1).b,
    );
  });
});

describe("subdivideSurfaceMesh", () => {
  it("quadruples triangle count with one subdivision pass", () => {
    const positions = new Float32Array([
      0, 0, 0, 1, 0, 0, 0, 1, 0,
    ]);
    const colors = new Float32Array([
      1, 0, 0, 0, 1, 0, 0, 0, 1,
    ]);
    const indices = [0, 1, 2];

    const result = subdivideSurfaceMesh(positions, colors, indices);
    expect(result.indices.length).toBe(12);
    expect(result.positions.length / 3).toBeGreaterThan(3);
  });
});

describe("buildMergedDropLines", () => {
  it("merges active keys into one segment buffer", () => {
    const keys = [mockKey("a", 0.2), mockKey("b", 0.8)];
    const tops = new Map<string, THREE.Vector3>([
      ["a", new THREE.Vector3(0, 10, 0)],
      ["b", new THREE.Vector3(1, 20, 1)],
    ]);
    const { minZ, zRange } = computeZRange(keys);
    const merged = buildMergedDropLines(keys, tops, minZ, zRange, 1);

    expect(merged).not.toBeNull();
    expect(merged!.positions.length).toBe(12);
    expect(merged!.colors.length).toBe(12);
  });
});

describe("buildInnerBorderLinePoints", () => {
  it("closes the border loop", () => {
    const pts = buildInnerBorderLinePoints([
      [0, 0],
      [1, 0],
      [1, 1],
    ]);
    expect(pts.length).toBe(4);
    expect(pts[0].x).toBe(pts[3].x);
    expect(pts[0].z).toBe(pts[3].z);
  });
});
