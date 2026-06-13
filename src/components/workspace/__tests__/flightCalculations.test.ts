import { describe, it, expect } from "vitest";
import { calculateFlights } from "../flightCalculations";

describe("flightCalculations", () => {
  it("should calculate flights correctly for valid text", () => {
    const targetText = "Hello, world.";
    
    // Mock rects
    const keycapRects = {
      "h": { left: 10, top: 10, width: 20, height: 20 } as DOMRect,
      "e": { left: 30, top: 10, width: 20, height: 20 } as DOMRect,
      "l": { left: 50, top: 10, width: 20, height: 20 } as DOMRect,
      "o": { left: 70, top: 10, width: 20, height: 20 } as DOMRect,
      ",": { left: 90, top: 10, width: 20, height: 20 } as DOMRect,
      "w": { left: 10, top: 30, width: 20, height: 20 } as DOMRect,
      "r": { left: 30, top: 30, width: 20, height: 20 } as DOMRect,
      "d": { left: 50, top: 30, width: 20, height: 20 } as DOMRect,
      ".": { left: 70, top: 30, width: 20, height: 20 } as DOMRect,
    };

    const charRects: Record<number, { left: number; top: number; width: number; height: number }> = {};
    for (let i = 0; i < targetText.length; i++) {
      charRects[i] = { left: i * 10, top: 0, width: 10, height: 10 };
    }

    const winW = 1000;
    const winH = 800;

    const { flights, targetKeys } = calculateFlights(targetText, keycapRects, charRects, winW, winH);

    expect(flights).toBeDefined();
    // Unique valid characters: h, e, l, o, ,, w, r, d, .
    expect(flights.length).toBe(9);
    
    expect(targetKeys.has("h")).toBe(true);
    expect(targetKeys.has("l")).toBe(true);
    
    const hFlight = flights.find(f => f.char.toLowerCase() === "h");
    expect(hFlight).toBeDefined();
    // tx = left + width/2 = 10 + 10 = 20
    expect(hFlight?.tx).toBe(20);
    // ty = top + height/2 = 10 + 10 = 20
    expect(hFlight?.ty).toBe(20);
  });

  it("should ignore invalid characters", () => {
    const targetText = " 123!@# ";
    const keycapRects = {};
    const charRects = {};
    const { flights } = calculateFlights(targetText, keycapRects, charRects, 1000, 800);
    expect(flights.length).toBe(0);
  });
});
