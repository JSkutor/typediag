import { describe, it, expect } from "vitest";
import { KEY_PITCH_MM } from "./config";
import { buildLayout } from "./layout";
import { classifySpatialTypoDistance, keyDistanceMm, keyDistanceU } from "./geometry";
import { SPATIAL_ADJACENT_MAX_DISTANCE_U } from "./config";

describe("geometry", () => {
  const layout = buildLayout();

  it("computes known U distance between adjacent keys on same row", () => {
    // q (0.5, 3) → w (1.5, 3) on default 4-row layout
    const d = keyDistanceU("q", "w", layout);
    expect(d).toBeCloseTo(1.0);
    expect(keyDistanceMm("q", "w", layout)).toBeCloseTo(KEY_PITCH_MM);
  });

  it("returns null when a key is missing from layout", () => {
    expect(keyDistanceU("shift_l", "a", layout)).toBeNull();
    expect(keyDistanceU("a", "unknown", layout)).toBeNull();
  });

  it("classifies typo distance as adjacent vs cognitive", () => {
    expect(classifySpatialTypoDistance(1.0)).toBe("adjacent");
    expect(classifySpatialTypoDistance(SPATIAL_ADJACENT_MAX_DISTANCE_U)).toBe("adjacent");
    expect(classifySpatialTypoDistance(SPATIAL_ADJACENT_MAX_DISTANCE_U + 0.01)).toBe("cognitive");
    expect(classifySpatialTypoDistance(keyDistanceU("f", "q", layout)!)).toBe("cognitive");
  });
});
