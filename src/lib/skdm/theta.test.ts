import { describe, it, expect, vi } from "vitest";
import { getTheta, THETA_ORDER } from "./theta";

describe("theta module", () => {
  it("should return the correct theta for a known pair", () => {
    const center = "e";
    const order = THETA_ORDER[center];
    expect(order).toBeDefined();

    // The order array length should be 25
    expect(order.length).toBe(25);

    // Let's find 'a' in the order
    const fromKey = "a";
    const index = order.indexOf(fromKey);
    expect(index).toBeGreaterThan(-1);

    const expectedTheta = (index / 25) * 2 * Math.PI;
    const theta = getTheta(center, fromKey);

    expect(theta).toBeCloseTo(expectedTheta);
  });

  it("should handle case insensitivity", () => {
    const center = "E";
    const fromKey = "A";

    const expectedTheta = getTheta("e", "a");
    const theta = getTheta(center, fromKey);

    expect(theta).toBe(expectedTheta);
  });

  it("should return 0 if center key is not in map", () => {
    const theta = getTheta("unknown_key", "a");
    expect(theta).toBe(0);
  });

  it("should return 0 if fromKey is not in the center key's order", () => {
    const theta = getTheta("e", "unknown_from_key");
    expect(theta).toBe(0);
  });
});
