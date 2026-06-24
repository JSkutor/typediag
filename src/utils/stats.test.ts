import { describe, it, expect } from "vitest";
import { getMedian, getMAD } from "./stats";

describe("utils/stats", () => {
  describe("getMedian", () => {
    it("returns 0 for empty input", () => {
      expect(getMedian([])).toBe(0);
    });

    it("handles odd and even lengths", () => {
      expect(getMedian([3, 1, 2])).toBe(2);
      expect(getMedian([1, 2, 3, 4])).toBe(2.5);
    });
  });

  describe("getMAD", () => {
    it("returns 0 for empty input", () => {
      expect(getMAD([])).toBe(0);
    });

    it("computes MAD for a symmetric spread", () => {
      // median = 100, absolute deviations = [10, 0, 0, 10] → MAD = 5
      expect(getMAD([90, 100, 100, 110])).toBe(5);
    });

    it("is less sensitive to a single outlier than standard deviation", () => {
      const withOutlier = [100, 102, 98, 101, 99, 500];
      const withoutOutlier = [100, 102, 98, 101, 99];
      expect(getMAD(withOutlier)).toBeLessThan(5);
      expect(getMAD(withOutlier)).toBeGreaterThan(getMAD(withoutOutlier) - 1);
    });
  });
});
