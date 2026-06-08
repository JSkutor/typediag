import { describe, it, expect } from "vitest";
import { normalizeCode } from "./normalize";

describe("normalizeCode", () => {
  it("should normalize letter codes to lowercase single letters", () => {
    expect(normalizeCode("KeyA")).toBe("a");
    expect(normalizeCode("KeyZ")).toBe("z");
    expect(normalizeCode("KeyQ")).toBe("q");
    expect(normalizeCode("KeyP")).toBe("p");
  });

  it("should normalize digit codes to numeric strings", () => {
    expect(normalizeCode("Digit1")).toBe("1");
    expect(normalizeCode("Digit9")).toBe("9");
    expect(normalizeCode("Digit0")).toBe("0");
  });

  it("should normalize special mapping codes", () => {
    expect(normalizeCode("Backspace")).toBe("backspace");
    expect(normalizeCode("Space")).toBe("space");
    expect(normalizeCode("Comma")).toBe(",");
    expect(normalizeCode("Period")).toBe(".");
  });

  it("should return null for unmapped codes", () => {
    expect(normalizeCode("Enter")).toBeNull();
    expect(normalizeCode("ShiftLeft")).toBeNull();
    expect(normalizeCode("ShiftRight")).toBeNull();
    expect(normalizeCode("Tab")).toBeNull();
    expect(normalizeCode("Escape")).toBeNull();
    expect(normalizeCode("ArrowUp")).toBeNull();
  });
});
