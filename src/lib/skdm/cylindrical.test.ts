import { describe, it, expect } from "vitest";
import {
  buildCylindricalVectors,
  getAvailableCenterKeys,
  getDefaultCylindricalSelection,
  getGlobalCylindricalMax,
} from "./cylindrical";
import type { KeyEvent } from "./types";

describe("cylindrical module", () => {
  const mockEvents: KeyEvent[] = [
    {
      fromKey: "a",
      toKey: "e",
      keyChar: "e",
      latencyMs: 100,
      holdDurationMs: 50,
      isCorrect: true,
      expectedChar: null,
    },
    {
      fromKey: "a",
      toKey: "e",
      keyChar: "e",
      latencyMs: 200,
      holdDurationMs: 50,
      isCorrect: true,
      expectedChar: null,
    },
    {
      fromKey: "b",
      toKey: "e",
      keyChar: "e",
      latencyMs: 150,
      holdDurationMs: 50,
      isCorrect: true,
      expectedChar: null,
    },
    {
      fromKey: "e",
      toKey: "e",
      keyChar: "e",
      latencyMs: 50,
      holdDurationMs: 50,
      isCorrect: true,
      expectedChar: null,
    }, // Same key, should be filtered
    {
      fromKey: null,
      toKey: "e",
      keyChar: "e",
      latencyMs: 100,
      holdDurationMs: 50,
      isCorrect: true,
      expectedChar: null,
    }, // Null fromKey, should be filtered
    {
      fromKey: "shift_l",
      toKey: "e",
      keyChar: "E",
      latencyMs: 100,
      holdDurationMs: 50,
      isCorrect: true,
      expectedChar: null,
    }, // Non-alphabetic fromKey, should be filtered
    {
      fromKey: "a",
      toKey: "shift_l",
      keyChar: "shift_l",
      latencyMs: 100,
      holdDurationMs: 50,
      isCorrect: true,
      expectedChar: null,
    }, // Non-alphabetic toKey
  ];

  describe("getAvailableCenterKeys", () => {
    it("should extract unique alphabetic center keys", () => {
      const keys = getAvailableCenterKeys(mockEvents);
      // 'e' and 'shift_l' are the toKeys. 'shift_l' is non-alphabetic so it's excluded.
      expect(keys).toEqual(["e"]);
    });
  });

  describe("getGlobalCylindricalMax", () => {
    it("should correctly compute max frequency (R) and latency (Z)", () => {
      const max = getGlobalCylindricalMax(mockEvents);

      // a -> e: 2 events, avg latency: (100+200)/2 = 150
      // b -> e: 1 event, avg latency: 150

      expect(max.maxR).toBe(2);
      expect(max.maxZ).toBe(150);
    });
  });

  describe("getDefaultCylindricalSelection", () => {
    it("should pick the To key with the most incoming data and its slowest From key", () => {
      const events: KeyEvent[] = [
        ...mockEvents,
        {
          fromKey: "c",
          toKey: "t",
          keyChar: "t",
          latencyMs: 120,
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: null,
        },
        {
          fromKey: "h",
          toKey: "t",
          keyChar: "t",
          latencyMs: 130,
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: null,
        },
        {
          fromKey: "h",
          toKey: "t",
          keyChar: "t",
          latencyMs: 140,
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: null,
        },
        {
          fromKey: "e",
          toKey: "t",
          keyChar: "t",
          latencyMs: 150,
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: null,
        },
      ];

      const selection = getDefaultCylindricalSelection(events);
      expect(selection).toEqual({ toKey: "t", fromKey: "e" });
    });

    it("should honor a preferred To key when it has data and pick highest latency From key", () => {
      const selection = getDefaultCylindricalSelection(mockEvents, "e");
      expect(selection).toEqual({ toKey: "e", fromKey: "a" });
    });

    it("should fall back to the richest To key when preferred key has no data", () => {
      const events: KeyEvent[] = [
        ...mockEvents,
        {
          fromKey: "x",
          toKey: "y",
          keyChar: "y",
          latencyMs: 100,
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: null,
        },
      ];

      const selection = getDefaultCylindricalSelection(events, "z");
      expect(selection?.toKey).toBe("e");
      expect(selection?.fromKey).toBe("a");
    });
  });

  describe("buildCylindricalVectors", () => {
    it("should build correct vectors for a given center key", () => {
      const vectors = buildCylindricalVectors(mockEvents, "e");

      // Verify that vectors for 'a' and 'b' have expected data
      const aVec = vectors.find((v) => v.fromKey === "a");
      expect(aVec).toBeDefined();
      expect(aVec?.r).toBe(2);
      expect(aVec?.z).toBe(150);
      expect(aVec?.theta).toBeGreaterThanOrEqual(0);
      expect(aVec?.thetaDeg).toBeGreaterThanOrEqual(0);

      const bVec = vectors.find((v) => v.fromKey === "b");
      expect(bVec).toBeDefined();
      expect(bVec?.r).toBe(1);
      expect(bVec?.z).toBe(150);

      // Other alphabetic keys in order should have 0 data
      const zVec = vectors.find((v) => v.fromKey === "z");
      expect(zVec).toBeDefined();
      expect(zVec?.r).toBe(0);
      expect(zVec?.z).toBe(0);
    });

    it("should apply global normalization correctly if globalMax is provided", () => {
      const globalMax = getGlobalCylindricalMax(mockEvents);
      const vectors = buildCylindricalVectors(mockEvents, "e", globalMax);

      const aVec = vectors.find((v) => v.fromKey === "a");

      expect(aVec?.normalizedR).toBe(Math.sqrt(2 / globalMax.maxR)); // maxR = 2 -> sqrt(1) = 1
      expect(aVec?.normalizedZ).toBe(150 / globalMax.maxZ); // maxZ = 150 -> 1

      const zVec = vectors.find((v) => v.fromKey === "z");
      expect(zVec?.normalizedR).toBe(0.15); // Default minimum
      expect(zVec?.normalizedZ).toBe(0.05); // Default minimum
    });
  });
});
