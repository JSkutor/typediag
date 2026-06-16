import { describe, it, expect } from "vitest";
import { computeDiff, optimizeDiff } from "./wordDiff";

describe("wordDiff", () => {
  it("should match identical strings", () => {
    const diff = optimizeDiff(computeDiff("마우스가", "마우스가"));
    expect(diff).toEqual([
      { op: "EQUAL", char: "마", targetChar: "마", targetIndex: 0, inputIndex: 0 },
      { op: "EQUAL", char: "우", targetChar: "우", targetIndex: 1, inputIndex: 1 },
      { op: "EQUAL", char: "스", targetChar: "스", targetIndex: 2, inputIndex: 2 },
      { op: "EQUAL", char: "가", targetChar: "가", targetIndex: 3, inputIndex: 3 },
    ]);
  });

  it("should handle inserted characters without breaking alignment", () => {
    const diff = optimizeDiff(computeDiff("마우스가", "ㅁ마우스가"));
    expect(diff).toEqual([
      { op: "INSERT", char: "ㅁ", inputIndex: 0 },
      { op: "EQUAL", char: "마", targetChar: "마", targetIndex: 0, inputIndex: 1 },
      { op: "EQUAL", char: "우", targetChar: "우", targetIndex: 1, inputIndex: 2 },
      { op: "EQUAL", char: "스", targetChar: "스", targetIndex: 2, inputIndex: 3 },
      { op: "EQUAL", char: "가", targetChar: "가", targetIndex: 3, inputIndex: 4 },
    ]);
  });

  it("should convert DELETE+INSERT to REPLACE", () => {
    const diff = optimizeDiff(computeDiff("마우스가", "마고스가"));
    expect(diff).toEqual([
      { op: "EQUAL", char: "마", targetChar: "마", targetIndex: 0, inputIndex: 0 },
      { op: "REPLACE", char: "고", targetChar: "우", targetIndex: 1, inputIndex: 1 },
      { op: "EQUAL", char: "스", targetChar: "스", targetIndex: 2, inputIndex: 2 },
      { op: "EQUAL", char: "가", targetChar: "가", targetIndex: 3, inputIndex: 3 },
    ]);
  });

  it("should recognize partial jamo match at the end", () => {
    const diff = optimizeDiff(computeDiff("마우스", "마우ㅅ"));
    expect(diff).toEqual([
      { op: "EQUAL", char: "마", targetChar: "마", targetIndex: 0, inputIndex: 0 },
      { op: "EQUAL", char: "우", targetChar: "우", targetIndex: 1, inputIndex: 1 },
      { op: "PARTIAL", char: "ㅅ", targetChar: "스", targetIndex: 2, inputIndex: 2 },
    ]);
  });

  it("should NOT recognize partial jamo match if not at the end", () => {
    const diff = optimizeDiff(computeDiff("마우스가", "마우ㅅ가"));
    // target: 마우스가, input: 마우ㅅ가
    expect(diff).toEqual([
      { op: "EQUAL", char: "마", targetChar: "마", targetIndex: 0, inputIndex: 0 },
      { op: "EQUAL", char: "우", targetChar: "우", targetIndex: 1, inputIndex: 1 },
      { op: "REPLACE", char: "ㅅ", targetChar: "스", targetIndex: 2, inputIndex: 2 },
      { op: "EQUAL", char: "가", targetChar: "가", targetIndex: 3, inputIndex: 3 },
    ]);
  });

  it("should handle double spaces by marking one as INSERT", () => {
    const diff = optimizeDiff(computeDiff("A B", "A  B"));
    expect(diff).toEqual([
      { op: "EQUAL", char: "A", targetChar: "A", targetIndex: 0, inputIndex: 0 },
      { op: "INSERT", char: " ", inputIndex: 1 },
      { op: "EQUAL", char: " ", targetChar: " ", targetIndex: 1, inputIndex: 2 },
      { op: "EQUAL", char: "B", targetChar: "B", targetIndex: 2, inputIndex: 3 },
    ]);
  });

  it("should mark pending targets as DELETE when input is shorter", () => {
    const diff = optimizeDiff(computeDiff("마우스가", "마"));
    expect(diff).toEqual([
      { op: "EQUAL", char: "마", targetChar: "마", targetIndex: 0, inputIndex: 0 },
      { op: "DELETE", char: "우", targetChar: "우", targetIndex: 1 },
      { op: "DELETE", char: "스", targetChar: "스", targetIndex: 2 },
      { op: "DELETE", char: "가", targetChar: "가", targetIndex: 3 },
    ]);
  });
});
