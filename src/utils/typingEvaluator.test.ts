import { describe, it, expect } from "vitest";
import { evaluateKeystroke } from "./typingEvaluator";

describe("evaluateKeystroke", () => {
  it("should evaluate english typing correctly", () => {
    const target = "Hello";
    
    // Press 'H' (correct)
    let res = evaluateKeystroke("KeyH", true, "", target, false);
    expect(res).toEqual({ keyChar: "H", isCorrect: true, expectedChar: null });

    // Press 'e' (correct)
    res = evaluateKeystroke("KeyE", false, "H", target, false);
    expect(res).toEqual({ keyChar: "e", isCorrect: true, expectedChar: null });

    // Press 'x' instead of 'l' (incorrect)
    res = evaluateKeystroke("KeyX", false, "He", target, false);
    expect(res).toEqual({ keyChar: "x", isCorrect: false, expectedChar: "l" });
  });

  it("should evaluate korean typing (jamo-level) correctly", () => {
    const target = "물"; // decomposed: ㅁㅜㄹ (qwerty keys: a, n, f)
    
    // Press 'a' (ㅁ) (correct)
    let res = evaluateKeystroke("KeyA", false, "", target, true);
    expect(res).toEqual({ keyChar: "ㅁ", isCorrect: true, expectedChar: null });

    // Press 'n' (ㅜ) (correct)
    res = evaluateKeystroke("KeyN", false, "a", target, true);
    expect(res).toEqual({ keyChar: "ㅜ", isCorrect: true, expectedChar: null });

    // Press 'x' (ㅌ) instead of 'f' (ㄹ) (incorrect)
    res = evaluateKeystroke("KeyX", false, "an", target, true);
    expect(res).toEqual({ keyChar: "ㅌ", isCorrect: false, expectedChar: "ㄹ" });

    // Press 'f' (ㄹ) (correct)
    res = evaluateKeystroke("KeyF", false, "an", target, true);
    expect(res).toEqual({ keyChar: "ㄹ", isCorrect: true, expectedChar: null });
  });

  it("should handle backspace correctly", () => {
    const res = evaluateKeystroke("Backspace", false, "he", "hello", false);
    expect(res).toEqual({ keyChar: "backspace", isCorrect: true, expectedChar: null });
  });

  it("should handle space correctly", () => {
    const target = "a b";
    
    // Space where space is expected
    let res = evaluateKeystroke("Space", false, "a", target, false);
    expect(res).toEqual({ keyChar: " ", isCorrect: true, expectedChar: null });

    // Space where character is expected
    res = evaluateKeystroke("Space", false, "", target, false);
    expect(res).toEqual({ keyChar: " ", isCorrect: false, expectedChar: "a" });
  });
});
