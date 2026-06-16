import { describe, it, expect } from "vitest";
import { calculateMetrics, calculateLatencyAfterGap } from "./metrics";

describe("metrics module", () => {
  describe("calculateMetrics", () => {
    it("should return default metrics for empty events", () => {
      const result = calculateMetrics([]);
      expect(result).toEqual({
        elapsed_time_ms: 0,
        cpm: 0,
        wpm: 0,
        accuracy: 100,
      });
    });

    it("should calculate correct accuracy and metrics for basic correct keystrokes", () => {
      const events = [
        { fromKey: null, toKey: "a", latencyMs: 0, isCorrect: true },
        { fromKey: "a", toKey: "b", latencyMs: 200, isCorrect: true },
        { fromKey: "b", toKey: "c", latencyMs: 200, isCorrect: true },
      ];
      // total latency = 400ms. 3 keystrokes.
      // 400ms = 0.4 seconds = 0.006666 minutes
      // CPM = 3 / 0.006666 = 450
      // WPM = 450 / 5 = 90
      const result = calculateMetrics(events);
      expect(result.accuracy).toBe(100);
      expect(result.elapsed_time_ms).toBe(400);
      expect(result.cpm).toBe(450);
      expect(result.wpm).toBe(90);
    });

    it("should evaluate accuracy correctly when mistakes are present", () => {
      const events = [
        { fromKey: null, toKey: "a", latencyMs: 0, isCorrect: true },
        { fromKey: "a", toKey: "b", latencyMs: 200, isCorrect: false },
        { fromKey: "b", toKey: "c", latencyMs: 200, isCorrect: true },
        { fromKey: "c", toKey: "d", latencyMs: 200, isCorrect: true },
      ];
      // 3 correct out of 4 events -> 75% accuracy
      const result = calculateMetrics(events);
      expect(result.accuracy).toBe(75);
    });

    it("should correct outlier latency with average of normal latencies", () => {
      const events = [
        { fromKey: null, toKey: "a", latencyMs: 0, isCorrect: true },
        { fromKey: "a", toKey: "b", latencyMs: 200, isCorrect: true },
        { fromKey: "b", toKey: "c", latencyMs: 60000, isCorrect: true }, // Outlier: 60 seconds
        { fromKey: "c", toKey: "d", latencyMs: 300, isCorrect: true },
      ];
      // normal latencies: 0, 200, 300 (average = 500 / 3 = 166.66ms)
      // The 60,000ms outlier is replaced by ~167ms.
      // Total elapsed = 0 + 200 + 167 + 300 = 667ms
      const result = calculateMetrics(events, 3000);
      expect(result.elapsed_time_ms).toBe(667);
      expect(result.cpm).toBeGreaterThan(0);
    });

    it("should return zero metrics for statistically meaningless pages (where all real transitions are outliers)", () => {
      const events = [
        { fromKey: null, toKey: "a", latencyMs: 0, isCorrect: true },
        { fromKey: "a", toKey: "b", latencyMs: 5000, isCorrect: true }, // Outlier
        { fromKey: "b", toKey: "c", latencyMs: 6000, isCorrect: true }, // Outlier
      ];
      const result = calculateMetrics(events, 3000);
      expect(result.elapsed_time_ms).toBe(0);
      expect(result.cpm).toBe(0);
      expect(result.wpm).toBe(0);
      expect(result.accuracy).toBe(100);
    });
  });

  describe("calculateLatencyAfterGap", () => {
    it("should return sum of all latencies if there is no gap", () => {
      const events = [
        { latencyMs: 100 },
        { latencyMs: 200 },
        { latencyMs: 150 },
      ];
      expect(calculateLatencyAfterGap(events, 5000)).toBe(450);
    });

    it("should sum only latencies after the last gap, excluding the gap latency itself", () => {
      const events = [
        { latencyMs: 100 },
        { latencyMs: 600000 }, // 10 minutes gap
        { latencyMs: 120 },
        { latencyMs: 130 },
      ];
      // Should sum 120 and 130, ignoring 100 and the 600000 gap event's latency
      expect(calculateLatencyAfterGap(events, 300000)).toBe(250);
    });
  });
});
