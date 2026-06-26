import { describe, expect, it } from "vitest";
import {
  computeCursorJumpIndex,
  findLineStartSpaceIndices,
  formatPracticeChar,
  isVisualLineStart,
  lineStartIndicesEqual,
  LINE_WRAP_LEFT_THRESHOLD,
  LINE_WRAP_TOP_THRESHOLD,
  buildPracticeWordGroups,
} from "./practiceTextLayout";

describe("practiceTextLayout", () => {
  it("detects a wrapped line via top offset", () => {
    const tops = [0, 0, 24, 24];
    const lefts = [0, 10, 0, 10];

    expect(isVisualLineStart(2, tops, lefts)).toBe(true);
  });

  it("detects a wrapped line when top offsets are tied but left resets", () => {
    const tops = [0, 0, 0, 0];
    const lefts = [0, 12, 0, 12];

    expect(isVisualLineStart(2, tops, lefts)).toBe(true);
  });

  it("finds spaces that begin a wrapped line", () => {
    const tops = [0, 0, 24, 24, 24];
    const lefts = [0, 12, 0, 12, 24];
    const isSpace = [false, false, true, false, false];

    expect(findLineStartSpaceIndices(tops, lefts, isSpace)).toEqual([2]);
  });

  it("ignores the first character even when it is a space", () => {
    const tops = [0, 0];
    const lefts = [0, 12];
    const isSpace = [true, false];

    expect(findLineStartSpaceIndices(tops, lefts, isSpace)).toEqual([]);
  });

  it("jumps the cursor when a typed space wraps onto the next line", () => {
    const tops = [0, 0, 24, 24];
    const lefts = [0, 12, 0, 12];
    const isSpace = [false, false, true, false];

    expect(computeCursorJumpIndex(2, tops, lefts, isSpace)).toBe(3);
  });

  it("jumps the cursor when a space stays on the previous line but the next word wraps", () => {
    const tops = [0, 0, 0, 24];
    const lefts = [0, 12, 24, 0];
    const isSpace = [false, false, true, false];

    expect(computeCursorJumpIndex(2, tops, lefts, isSpace)).toBe(3);
  });

  it("does not jump when the space and next character share a line", () => {
    const tops = [0, 0, 0, 0];
    const lefts = [0, 12, 24, 36];
    const isSpace = [false, false, true, false];

    expect(computeCursorJumpIndex(2, tops, lefts, isSpace)).toBeNull();
  });

  it("uses stable wrap thresholds", () => {
    const tops = [0, LINE_WRAP_TOP_THRESHOLD];
    const lefts = [0, LINE_WRAP_LEFT_THRESHOLD];
    const isSpace = [false, true];

    expect(isVisualLineStart(1, tops, lefts)).toBe(false);
    expect(
      isVisualLineStart(1, [0, LINE_WRAP_TOP_THRESHOLD + 1], [0, LINE_WRAP_LEFT_THRESHOLD]),
    ).toBe(true);
    expect(isVisualLineStart(1, [0, 0], [12, 0])).toBe(true);
  });

  it("renders wrap-hidden spaces as empty content", () => {
    expect(formatPracticeChar(" ", true)).toBe("");
    expect(formatPracticeChar(" ", false)).toBe("\u00A0");
    expect(formatPracticeChar("가", true)).toBe("가");
  });

  it("compares line-start index sets by value", () => {
    expect(lineStartIndicesEqual(new Set([2, 5]), [2, 5])).toBe(true);
    expect(lineStartIndicesEqual(new Set([2]), [2, 5])).toBe(false);
    expect(lineStartIndicesEqual(new Set([2, 5]), [5, 2])).toBe(true);
    expect(lineStartIndicesEqual(new Set(), [])).toBe(true);
  });

  it("keeps inter-word spaces attached to the preceding word group", () => {
    const diffResult = [
      { targetChar: "h", char: "h" },
      { targetChar: "i", char: "i" },
      { targetChar: " ", char: " " },
      { targetChar: "y", char: "y" },
      { targetChar: "o", char: "o" },
    ];

    expect(buildPracticeWordGroups(diffResult)).toEqual([
      { items: [{ index: 0 }, { index: 1 }, { index: 2 }] },
      { items: [{ index: 3 }, { index: 4 }] },
    ]);
  });

  it("isolates leading spaces into their own group", () => {
    const diffResult = [
      { targetChar: " ", char: " " },
      { targetChar: "h", char: "h" },
    ];

    expect(buildPracticeWordGroups(diffResult)).toEqual([
      { items: [{ index: 0 }] },
      { items: [{ index: 1 }] },
    ]);
  });
});
