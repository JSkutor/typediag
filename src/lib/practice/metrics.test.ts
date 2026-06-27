import { describe, it, expect } from "vitest";
import {
  calculateMetrics,
  calculateLatencyAfterGap,
  countTargetKeystrokes,
  countTargetWords,
} from "./metrics";

const enOpts = (targetText: string) => ({ targetText, language: "en" as const });
const koOpts = (targetText: string) => ({ targetText, language: "ko" as const });

describe("metrics module", () => {
  describe("countTargetKeystrokes", () => {
    it("counts English target by character length including spaces", () => {
      expect(countTargetKeystrokes("a b", "en")).toBe(3);
    });

    it("counts Korean target by disassemble length including spaces", () => {
      expect(countTargetKeystrokes("안녕", "ko")).toBeGreaterThan(0);
      expect(countTargetKeystrokes("a b", "ko")).toBe(3);
    });
  });

  describe("countTargetWords", () => {
    it("counts English words by whitespace", () => {
      expect(countTargetWords("hello world", "en")).toBe(2);
    });

    it("counts Korean words as pure hangul syllable blocks", () => {
      expect(countTargetWords("안녕 하세요", "ko")).toBe(5);
    });
  });

  describe("calculateMetrics", () => {
    it("should return default metrics for empty events", () => {
      const result = calculateMetrics([], enOpts("abc"));
      expect(result).toEqual({
        elapsed_time_ms: 0,
        cpm: 0,
        wpm: 0,
        accuracy: 100,
      });
    });

    it("should calculate CPM from target keystroke count, not raw event count", () => {
      const targetText = "abc";
      const events = [
        { fromKey: null, toKey: "a", latencyMs: 0, isCorrect: true },
        { fromKey: "a", toKey: "b", latencyMs: 200, isCorrect: true },
        { fromKey: "b", toKey: "c", latencyMs: 200, isCorrect: true },
      ];
      const result = calculateMetrics(events, enOpts(targetText));
      expect(result.elapsed_time_ms).toBe(400);
      expect(result.cpm).toBe(450);
      expect(result.wpm).toBe(150);
    });

    it("should not inflate CPM when extra backspace events exist", () => {
      const targetText = "abc";
      const events = [
        { fromKey: null, toKey: "a", latencyMs: 0, isCorrect: true },
        { fromKey: "a", toKey: "x", latencyMs: 200, isCorrect: false },
        { fromKey: "x", toKey: "backspace", latencyMs: 200, isCorrect: true },
        { fromKey: "backspace", toKey: "b", latencyMs: 200, isCorrect: true },
        { fromKey: "b", toKey: "c", latencyMs: 200, isCorrect: true },
      ];
      const result = calculateMetrics(events, enOpts(targetText));
      expect(result.cpm).toBe(225);
    });

    it("should evaluate accuracy correctly when mistakes are present", () => {
      const events = [
        { fromKey: null, toKey: "a", latencyMs: 0, isCorrect: true },
        { fromKey: "a", toKey: "b", latencyMs: 200, isCorrect: false },
        { fromKey: "b", toKey: "c", latencyMs: 200, isCorrect: true },
        { fromKey: "c", toKey: "d", latencyMs: 200, isCorrect: true },
      ];
      const result = calculateMetrics(events, enOpts("abcd"));
      expect(result.accuracy).toBe(75);
    });

    it("should correct outlier latency with average of normal latencies excluding zero", () => {
      const events = [
        { fromKey: null, toKey: "a", latencyMs: 0, isCorrect: true },
        { fromKey: "a", toKey: "b", latencyMs: 200, isCorrect: true },
        { fromKey: "b", toKey: "c", latencyMs: 60000, isCorrect: true },
        { fromKey: "c", toKey: "d", latencyMs: 300, isCorrect: true },
      ];
      const result = calculateMetrics(events, { ...enOpts("abcd"), outlierThresholdMs: 3000 });
      expect(result.elapsed_time_ms).toBe(750);
    });

    it("should return zero metrics for statistically meaningless pages (where all real transitions are outliers)", () => {
      const events = [
        { fromKey: null, toKey: "a", latencyMs: 0, isCorrect: true },
        { fromKey: "a", toKey: "b", latencyMs: 5000, isCorrect: true },
        { fromKey: "b", toKey: "c", latencyMs: 6000, isCorrect: true },
      ];
      const result = calculateMetrics(events, { ...enOpts("abc"), outlierThresholdMs: 3000 });
      expect(result.elapsed_time_ms).toBe(0);
      expect(result.cpm).toBe(0);
      expect(result.wpm).toBe(0);
      expect(result.accuracy).toBe(100);
    });

    it("should compute Korean WPM from pure hangul syllable count", () => {
      const targetText = "안녕";
      const events = [
        { fromKey: null, toKey: "d", latencyMs: 0, isCorrect: true },
        { fromKey: "d", toKey: "k", latencyMs: 600, isCorrect: true },
        { fromKey: "k", toKey: "s", latencyMs: 600, isCorrect: true },
      ];
      const keystrokes = countTargetKeystrokes(targetText, "ko");
      const words = countTargetWords(targetText, "ko");
      const result = calculateMetrics(events, koOpts(targetText));
      expect(words).toBe(2);
      expect(result.cpm).toBe(Math.round(keystrokes / (1200 / 60000)));
      expect(result.wpm).toBe(Math.round(words / (1200 / 60000)));
    });
  });

  describe("calculateLatencyAfterGap", () => {
    it("should return sum of all latencies if there is no gap", () => {
      const events = [{ latencyMs: 100 }, { latencyMs: 200 }, { latencyMs: 150 }];
      expect(calculateLatencyAfterGap(events, 5000)).toBe(450);
    });

    it("should sum only latencies after the last gap, excluding the gap latency itself", () => {
      const events = [
        { latencyMs: 100 },
        { latencyMs: 600000 },
        { latencyMs: 120 },
        { latencyMs: 130 },
      ];
      expect(calculateLatencyAfterGap(events, 300000)).toBe(250);
    });
  });
});
