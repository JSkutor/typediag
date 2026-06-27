import { describe, it, expect } from "vitest";
import {
  applyFreeformBackspace,
  applyFreeformChar,
  buildFeedbackAlignments,
  buildFeedbackEmptyAlignments,
  createInitialFreeformState,
} from "./freeformTyping";

describe("freeformTyping", () => {
  it("appends English characters", () => {
    const state = createInitialFreeformState("en");
    const afterH = applyFreeformChar(state, "h");
    const afterHi = applyFreeformChar({ ...state, ...afterH }, "i");
    expect(afterHi.typedText).toBe("hi");
    expect(afterHi.qwertyBuffer).toBe("hi");
  });

  it("assembles Korean input", () => {
    const state = createInitialFreeformState("ko");
    const afterR = applyFreeformChar(state, "r");
    const afterK = applyFreeformChar({ ...state, ...afterR }, "k");
    expect(afterK.typedText).toBe("가");
  });

  it("backspace removes the last character", () => {
    const state = createInitialFreeformState("en");
    const afterA = applyFreeformChar(state, "a");
    const next = applyFreeformBackspace({ ...state, ...afterA });
    expect(next?.typedText).toBe("");
  });

  it("returns null when backspace on empty buffer", () => {
    const state = createInitialFreeformState("ko");
    expect(applyFreeformBackspace(state)).toBeNull();
  });

  it("builds EQUAL alignments for practice rendering", () => {
    expect(buildFeedbackAlignments("hi")).toEqual([
      { op: "EQUAL", char: "h", targetChar: "h", inputIndex: 0, targetIndex: 0 },
      { op: "EQUAL", char: "i", targetChar: "i", inputIndex: 1, targetIndex: 1 },
    ]);
  });

  it("uses a pending anchor when feedback text is empty", () => {
    expect(buildFeedbackAlignments("")).toEqual(buildFeedbackEmptyAlignments());
    expect(buildFeedbackEmptyAlignments()[0]?.op).toBe("PENDING");
  });
});
