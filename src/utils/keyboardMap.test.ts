import { describe, it, expect } from "vitest";
import { getQwertyChar, assembleHangulWithPunctuation } from "./keyboardMap";

describe("getQwertyChar", () => {
  it("should return correct digit without shift", () => {
    expect(getQwertyChar("Digit1", false)).toBe("1");
    expect(getQwertyChar("Digit0", false)).toBe("0");
  });

  it("should return correct digit with shift", () => {
    expect(getQwertyChar("Digit1", true)).toBe("!");
    expect(getQwertyChar("Digit0", true)).toBe(")");
  });

  it("should return correct alphabet without shift", () => {
    expect(getQwertyChar("KeyA", false)).toBe("a");
    expect(getQwertyChar("KeyZ", false)).toBe("z");
  });

  it("should return correct alphabet with shift", () => {
    expect(getQwertyChar("KeyA", true)).toBe("A");
    expect(getQwertyChar("KeyZ", true)).toBe("Z");
  });

  it("should return correct punctuation", () => {
    expect(getQwertyChar("Comma", false)).toBe(",");
    expect(getQwertyChar("Comma", true)).toBe("<");
    expect(getQwertyChar("Minus", false)).toBe("-");
    expect(getQwertyChar("Minus", true)).toBe("_");
  });

  it("should return space", () => {
    expect(getQwertyChar("Space", false)).toBe(" ");
    expect(getQwertyChar("Space", true)).toBe(" ");
  });

  it("should return null for unknown codes", () => {
    expect(getQwertyChar("UnknownKey", false)).toBeNull();
    expect(getQwertyChar("AltLeft", false)).toBeNull();
  });
});

describe("assembleHangulWithPunctuation", () => {
  it("should assemble standard hangul correctly", () => {
    expect(assembleHangulWithPunctuation("gksrmf")).toBe("한글");
    expect(assembleHangulWithPunctuation("안녕하세요")).toBe("안녕하세요"); // already hangul? wait, qwerty to alphabet expects english qwerty strings. 
    // Actually, convertQwertyToAlphabet("dkssud") -> 안녕
    expect(assembleHangulWithPunctuation("dkssud")).toBe("안녕");
  });

  it("should handle spaces between hangul characters", () => {
    expect(assembleHangulWithPunctuation("gksrmf dustmq")).toBe("한글 연습");
    expect(assembleHangulWithPunctuation("gksrmf ")).toBe("한글 ");
  });

  it("should handle punctuation at the end", () => {
    expect(assembleHangulWithPunctuation("gksrmf!")).toBe("한글!");
    expect(assembleHangulWithPunctuation("dkssudgktpdy?")).toBe("안녕하세요?");
  });

  it("should handle punctuation in the middle", () => {
    expect(assembleHangulWithPunctuation("gks,rmf")).toBe("한,글");
  });

  it("should assemble complex double consonants/vowels", () => {
    expect(assembleHangulWithPunctuation("Rk")).toBe("까");
    expect(assembleHangulWithPunctuation("ghl")).toBe("회");
  });
});
