import { describe, it, expect } from "vitest";
import {
  getShiftOverhead,
  getFirstErrorStats,
  getPhysicalVariance,
  getSlowestFromKeys,
} from "./diagnostics";
import type { KeyEvent } from "./types";
import type { CylindricalVector } from "./cylindrical";

describe("Diagnostics module", () => {
  describe("getShiftOverhead", () => {
    it("should calculate shift overhead correctly for valid transitions", () => {
      const targetKey = "E";
      const events: KeyEvent[] = [
        // Direct transition: a -> e
        {
          fromKey: "a",
          toKey: "e",
          keyChar: "e",
          latencyMs: 100,
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: null,
        },
        // Direct transition: s -> e
        {
          fromKey: "s",
          toKey: "e",
          keyChar: "e",
          latencyMs: 120,
          holdDurationMs: 60,
          isCorrect: true,
          expectedChar: null,
        },
        // Shift transition: d -> shift_l -> E
        {
          fromKey: "d",
          toKey: "shift_l",
          keyChar: "shift_l",
          latencyMs: 80,
          holdDurationMs: 100,
          isCorrect: true,
          expectedChar: null,
        },
        {
          fromKey: "d", // Previous alpha key
          toKey: "E",
          keyChar: "E",
          latencyMs: 150,
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: null,
        },
      ];

      const result = getShiftOverhead(events, targetKey);

      expect(result.applicable).toBe(true);
      expect(result.directCount).toBe(2);
      expect(result.directAvgMs).toBe(110); // (100 + 120) / 2
      expect(result.shiftCount).toBe(1);
      expect(result.shiftAvgMs).toBe(230); // 80 + 150
      expect(result.overheadMs).toBe(120); // 230 - 110
      expect(result.leftShiftRatio).toBe(1);
      expect(result.rightShiftRatio).toBe(0);
    });

    it("should return applicable false for keys without shift combinability", () => {
      const result = getShiftOverhead([], "enter");
      expect(result.applicable).toBe(false);
      expect(result.overheadMs).toBe(0);
    });
  });

  describe("getFirstErrorStats", () => {
    it("should count first errors and average cascades correctly", () => {
      const events: KeyEvent[] = [
        // Correct streak
        {
          fromKey: null,
          toKey: "a",
          keyChar: "a",
          latencyMs: 100,
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: null,
        },
        {
          fromKey: "a",
          toKey: "b",
          keyChar: "b",
          latencyMs: 100,
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: null,
        },

        // First Error (break) on target "c"
        {
          fromKey: "b",
          toKey: "c",
          keyChar: "c",
          latencyMs: 100,
          holdDurationMs: 50,
          isCorrect: false,
          expectedChar: "x",
        },
        // Cascade 1
        {
          fromKey: "c",
          toKey: "d",
          keyChar: "d",
          latencyMs: 100,
          holdDurationMs: 50,
          isCorrect: false,
          expectedChar: "y",
        },
        // Cascade 2 (backspace)
        {
          fromKey: "d",
          toKey: "backspace",
          keyChar: "backspace",
          latencyMs: 100,
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: null,
        },

        // Recovery
        {
          fromKey: "backspace",
          toKey: "e",
          keyChar: "e",
          latencyMs: 100,
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: null,
        },

        // Second Error on a different key "f", immediate backspace correction
        {
          fromKey: "e",
          toKey: "f",
          keyChar: "f",
          latencyMs: 100,
          holdDurationMs: 50,
          isCorrect: false,
          expectedChar: "z",
        },
        {
          fromKey: "f",
          toKey: "backspace",
          keyChar: "backspace",
          latencyMs: 100,
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: null,
        },
      ];

      const resultC = getFirstErrorStats(events, "c");
      expect(resultC.breakCount).toBe(1);
      expect(resultC.totalBreaks).toBe(2);
      expect(resultC.avgCascade).toBe(2); // "d" and "backspace" before recovery
      expect(resultC.immediateCorrectionRate).toBe(0); // next was "d", not backspace

      const resultF = getFirstErrorStats(events, "f");
      expect(resultF.breakCount).toBe(1);
      expect(resultF.avgCascade).toBe(1); // just "backspace" before recovery or end
      expect(resultF.immediateCorrectionRate).toBe(1); // immediate backspace
    });
  });

  describe("getPhysicalVariance", () => {
    it("should compute row/finger/hand variances correctly", () => {
      const events: KeyEvent[] = [
        // Same row, diff finger, same hand (a -> s)
        {
          fromKey: "a",
          toKey: "s",
          keyChar: "s",
          latencyMs: 100,
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: null,
        },
        // Diff row, same finger, same hand (w -> s)
        {
          fromKey: "w",
          toKey: "s",
          keyChar: "s",
          latencyMs: 150,
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: null,
        },
        // Diff row, diff finger, alt hand (j -> s)
        {
          fromKey: "j",
          toKey: "s",
          keyChar: "s",
          latencyMs: 200,
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: null,
        },
      ];

      const result = getPhysicalVariance(events, "s");

      // Same row (a -> s, j -> s) vs Diff row (w -> s)
      expect(result.sameRowCount).toBe(2);
      expect(result.sameRowAvgMs).toBe(150); // (100 + 200) / 2
      expect(result.diffRowCount).toBe(1);
      expect(result.diffRowAvgMs).toBe(150); // 150

      // Same finger (w -> s) vs Diff finger (a -> s, j -> s)
      expect(result.sameFingerCount).toBe(1);
      expect(result.sameFingerAvgMs).toBe(150);
      expect(result.diffFingerCount).toBe(2);
      expect(result.diffFingerAvgMs).toBe(150); // (100 + 200) / 2

      // Same hand (a -> s, w -> s) vs Alt hand (j -> s)
      expect(result.sameHandCount).toBe(2);
      expect(result.sameHandAvgMs).toBe(125); // (100 + 150) / 2
      expect(result.altHandCount).toBe(1);
      expect(result.altHandAvgMs).toBe(200);
    });
  });

  describe("getSlowestFromKeys", () => {
    it("should return the top N slowest keys", () => {
      const vectors: CylindricalVector[] = [
        { fromKey: "a", theta: 0, thetaDeg: 0, r: 10, z: 100 },
        { fromKey: "b", theta: 0, thetaDeg: 0, r: 10, z: 300 },
        { fromKey: "c", theta: 0, thetaDeg: 0, r: 10, z: 200 },
        { fromKey: "d", theta: 0, thetaDeg: 0, r: 0, z: 500 }, // r = 0, should be filtered
      ];

      const result = getSlowestFromKeys(vectors, 2);

      expect(result).toHaveLength(2);
      expect(result[0].fromKey).toBe("b"); // z = 300
      expect(result[0].avgLatencyMs).toBe(300);
      expect(result[1].fromKey).toBe("c"); // z = 200
      expect(result[1].avgLatencyMs).toBe(200);
    });
  });
});
