import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { persistSkdmFinalUpperBound, readSkdmFinalUpperBound } from "./outlierBoundStorage";

describe("outlierBoundStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should return null when no record exists", () => {
    expect(readSkdmFinalUpperBound()).toBeNull();
  });

  it("should persist and read the latest final upper bound record", () => {
    const record = {
      final_upper_bound_ms: 812.4,
      max_clip_ms: 450.2,
      source_event_count: 1600,
      updated_at: "2026-06-19T00:00:00.000Z",
    };

    persistSkdmFinalUpperBound(record);

    expect(readSkdmFinalUpperBound()).toEqual(record);
  });

  it("should overwrite the previous record on update", () => {
    persistSkdmFinalUpperBound({
      final_upper_bound_ms: 500,
      max_clip_ms: 300,
      source_event_count: 80,
      updated_at: "2026-06-19T00:00:00.000Z",
    });

    const updated = {
      final_upper_bound_ms: 920.1,
      max_clip_ms: 410.7,
      source_event_count: 2000,
      updated_at: "2026-06-19T01:00:00.000Z",
    };
    persistSkdmFinalUpperBound(updated);

    expect(readSkdmFinalUpperBound()).toEqual(updated);
  });
});
