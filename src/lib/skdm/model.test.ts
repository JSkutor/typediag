import { describe, expect, it } from "vitest";

import reference from "./__fixtures__/python-reference.json";
import { buildLayout } from "./layout";
import {
  aggregatePairs,
  buildAdjacency,
  filterBackspaces,
  filterOutliers,
  runPipeline,
  sigmoidLatency,
  summarizeKeys,
  triangulate,
} from "./model";
import type { KeyEvent } from "./types";

const EPS = 1e-9;

interface ReferenceEvent {
  fromKey: string;
  selfKey: string;
  latencyMs: number;
}

const events: KeyEvent[] = (reference.events as ReferenceEvent[]).map((ev) => ({
  fromKey: ev.fromKey,
  toKey: ev.selfKey,
  latencyMs: ev.latencyMs,
}));

describe("sigmoidLatency", () => {
  it("is 0.5 at the center (40% of clip)", () => {
    expect(sigmoidLatency(400, 1000)).toBeCloseTo(0.5, 12);
  });
  it("saturates near 1 at the clip bound", () => {
    expect(sigmoidLatency(1000, 1000)).toBeGreaterThan(0.99);
  });
  it("clips and stays in [0, 1]", () => {
    expect(sigmoidLatency(-50, 1000)).toBeGreaterThanOrEqual(0);
    expect(sigmoidLatency(99999, 1000)).toBeLessThanOrEqual(1);
  });
});


describe("layout parity", () => {
  it("matches Python coordinates for analysed keys", () => {
    const layout = buildLayout();
    for (const [key, ref] of Object.entries(reference.results)) {
      expect(layout[key].x).toBeCloseTo(ref.x, 12);
      expect(layout[key].y).toBeCloseTo(ref.y, 12);
      expect(layout[key].row).toBe(ref.row);
    }
  });
});

describe("Delaunay adjacency parity", () => {
  it("produces the same neighbour graph as scipy", () => {
    const layout = buildLayout();
    const cleaned = filterBackspaces(events);
    const [valid, maxClipMs] = filterOutliers(cleaned);
    const pairStats = aggregatePairs(valid, maxClipMs);
    const results = summarizeKeys(pairStats, layout, valid);

    const { keys, triangles } = triangulate(results);
    const adjIdx = buildAdjacency(triangles);

    const adjacency: Record<string, string[]> = {};
    for (const [i, neighbors] of adjIdx) {
      adjacency[keys[i]] = [...neighbors].map((j) => keys[j]).sort();
    }

    expect(adjacency).toEqual(reference.adjacency);
  });
});

describe("full pipeline parity", () => {
  it("matches the Python reference for every key", () => {
    const layout = buildLayout();
    const results = runPipeline(events, layout);

    const refKeys = Object.keys(reference.results).sort();
    expect(Object.keys(results).sort()).toEqual(refKeys);

    for (const [key, ref] of Object.entries(reference.results)) {
      const r = results[key];
      expect(r.z).toBeCloseTo(ref.z, 9);
      expect(Math.abs(r.confidence - ref.confidence)).toBeLessThan(EPS);
      expect(r.stdev).toBeCloseTo(ref.stdev, 6);
      expect(r.zSmoothed).toBeCloseTo(ref.zSmoothed, 9);
      expect(r.stdevSmoothed).toBeCloseTo(ref.stdevSmoothed, 6);
    }
  });
});
