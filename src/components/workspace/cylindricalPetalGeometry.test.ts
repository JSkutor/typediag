import { describe, expect, it } from "vitest";
import type { CylindricalVector } from "@/lib/skdm/cylindrical";
import { buildSmoothPetalGeometry, offsetHudLabelsFromAnchor } from "./cylindricalPetalGeometry";

function mockVector(fromKey: string, theta: number, z = 200): CylindricalVector {
  return {
    fromKey,
    theta,
    thetaDeg: (theta * 180) / Math.PI,
    r: 10,
    z,
    normalizedR: 0.5,
    normalizedZ: 0.3,
  };
}

describe("buildSmoothPetalGeometry", () => {
  it("produces more rim vertices than flat fan triangulation", () => {
    const sorted = [
      mockVector("a", 0),
      mockVector("b", Math.PI / 2),
      mockVector("c", Math.PI),
      mockVector("d", (3 * Math.PI) / 2),
    ];
    const { positions, indices, borderPoints } = buildSmoothPetalGeometry(sorted, "b");

    // origin + 4 keys * 10 spline steps
    expect(positions.length / 3).toBe(1 + 4 * 10);
    expect(indices.length / 3).toBe(4 * 10);
    expect(borderPoints.length).toBeGreaterThan(sorted.length);
  });
});

describe("offsetHudLabelsFromAnchor", () => {
  it("pushes labels away from the projected origin", () => {
    const coords = [{ fromKey: "a", x: 120, y: 100, visible: true }];
    const [shifted] = offsetHudLabelsFromAnchor(coords, 100, 100, 20);
    expect(Math.hypot(shifted.x - 100, shifted.y - 100)).toBeGreaterThan(25);
  });
});
