import { describe, it, expect } from "vitest";
import {
  toCylindricalCartesian,
  generateSurfaceLayout,
  calculateSurfaceBorders,
  generateBoxPoints,
  CYLINDRICAL_MAX_RADIUS,
  CYLINDRICAL_MAX_HEIGHT,
} from "./geometryUtils";

describe("geometryUtils", () => {
  describe("toCylindricalCartesian", () => {
    it("converts cylindrical vector to cartesian properly", () => {
      // With raw values missing normalized fields, fallback math is used
      const v = { r: 10, theta: Math.PI / 2, thetaDeg: 90, z: 100, fromKey: "a" };
      const cartesian = toCylindricalCartesian(v as any);

      expect(cartesian.vy).toBe(100 * 0.015);
      // cos(PI/2) is close to 0
      expect(Math.abs(cartesian.vx)).toBeLessThan(1e-10);
      expect(cartesian.vz).toBeCloseTo(10 * 0.3, 5);
    });
  });

  describe("generateSurfaceLayout", () => {
    it("generates scaled surface layout and bounds", () => {
      const result = generateSurfaceLayout();
      expect(result.layoutMap).toBeDefined();
      expect(result.layoutMap["q"]).toBeDefined();
      expect(result.centerX).toBeTypeOf("number");
      expect(result.centerZ).toBeTypeOf("number");
      // ensure scaled correctly
      expect(result.layoutMap["q"].w).toBe(70);
    });
  });

  describe("calculateSurfaceBorders", () => {
    it("generates inner and outer border points based on layout", () => {
      const { layoutMap } = generateSurfaceLayout();
      const { innerBorderPoints, outerBorderPoints } = calculateSurfaceBorders(layoutMap);

      expect(Array.isArray(innerBorderPoints)).toBe(true);
      expect(innerBorderPoints.length).toBeGreaterThan(0);

      expect(Array.isArray(outerBorderPoints)).toBe(true);
      expect(outerBorderPoints.length).toBeGreaterThan(0);
    });
  });

  describe("generateBoxPoints", () => {
    it("generates perimeter points for a bounding box", () => {
      const points = generateBoxPoints(0, 10, 0, 10, 5);
      // step is 5, so x=0,5,10. At each x, z=0 and z=10 -> 6 points
      // plus z=5 for x=0 and x=10 -> 2 points
      // total 8 points
      expect(points.length).toBe(8);
      expect(points).toContainEqual([0, 0]);
      expect(points).toContainEqual([10, 10]);
    });
  });
});
