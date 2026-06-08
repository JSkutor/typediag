import { describe, it, expect } from "vitest";
import { mean, median, std, percentile } from "./stats";

describe("stats helpers", () => {
  describe("mean", () => {
    it("should return 0 for empty array", () => {
      expect(mean([])).toBe(0);
    });

    it("should calculate correct average", () => {
      expect(mean([1, 2, 3, 4, 5])).toBe(3);
      expect(mean([10, -10])).toBe(0);
    });
  });

  describe("median", () => {
    it("should return 0 for empty array", () => {
      expect(median([])).toBe(0);
    });

    it("should calculate correct median for odd length arrays", () => {
      expect(median([3, 1, 2])).toBe(2);
      expect(median([10])).toBe(10);
    });

    it("should calculate correct median for even length arrays", () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
      expect(median([4, 1, 3, 2])).toBe(2.5);
    });
  });

  describe("std", () => {
    it("should return 0 for empty array", () => {
      expect(std([])).toBe(0);
    });

    it("should calculate population standard deviation (ddof = 0)", () => {
      // Data: [2, 4, 4, 4, 5, 5, 7, 9], mean = 5
      // Squared differences: [9, 1, 1, 1, 0, 0, 4, 16], sum = 32
      // Variance = 32 / 8 = 4, Std = 2
      expect(std([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 12);
    });
  });

  describe("percentile", () => {
    it("should return 0 for empty array", () => {
      expect(percentile([], 50)).toBe(0);
    });

    it("should return the single value if length is 1", () => {
      expect(percentile([42], 90)).toBe(42);
    });

    it("should calculate linear-interpolated percentiles correctly", () => {
      const data = [15, 20, 35, 40, 50];
      // 40th percentile: index 1.6 -> between 20 and 35. 20 * 0.4 + 35 * 0.6 = 29
      expect(percentile(data, 40)).toBeCloseTo(29, 12);
      // 0th percentile
      expect(percentile(data, 0)).toBe(15);
      // 100th percentile
      expect(percentile(data, 100)).toBe(50);
      // 50th percentile (median)
      expect(percentile(data, 50)).toBe(35);
    });
  });
});
