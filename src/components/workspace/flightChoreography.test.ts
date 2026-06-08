import { describe, it, expect } from "vitest";
import { buildFlightKeyframes, Flight } from "./flightChoreography";

describe("flightChoreography buildFlightKeyframes", () => {
  it("should generate resolved keyframes for a given flight trajectory", () => {
    const mockFlight: Flight = {
      id: 1,
      char: "a",
      sx: 100,
      sy: 200,
      hx: 100,
      hy: 200,
      detachStart: 0,
      detachEnd: 0.1,
      w1x: 100,
      w1y: 200,
      w2x: 500,
      w2y: 600,
      ax: 500,
      ay: 600,
      tx: 500,
      ty: 600,
      rotA: 10,
      rotB: -5,
      rotC: 0,
      landOffset: 0.8,
      textIdx: 0,
    };

    const keyframes = buildFlightKeyframes(mockFlight);

    // Verify keyframes count and structure
    expect(keyframes).toBeDefined();
    expect(keyframes.length).toBe(6);

    // Verify offsets are in correct chronological order
    const offsets = keyframes.map((k) => k.offset);
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBe(0.15);
    expect(offsets[2]).toBe(0.3);
    expect(offsets[3]).toBe(0.8); // landOffset
    expect(offsets[4]).toBeCloseTo(0.85); // landOffset + 0.05
    expect(offsets[5]).toBe(1);

    // Verify transforms contain starting coordinate mapping
    const transformStart = keyframes[0].transform as string;
    expect(transformStart).toContain("translate3d(100.0px, 200.0px, 0)");
    expect(transformStart).toContain("scale(1)");

    // Verify transforms contain target coordinate mapping at landing
    const transformLand = keyframes[3].transform as string;
    expect(transformLand).toContain("translate3d(500.0px, 600.0px, 0)");
    expect(transformLand).toContain("scale(0.47)");

    // Verify opacity transitions
    expect(keyframes[0].opacity).toBe(1);
    expect(keyframes[3].opacity).toBe(1);
    expect(keyframes[4].opacity).toBe(0); // Fades out after landing
    expect(keyframes[5].opacity).toBe(0);
  });
});
