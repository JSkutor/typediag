import { disassemble, convertQwertyToAlphabet } from "es-hangul";
import { getQwertyChar } from "./keyboardMap";

export interface KeyEvaluation {
  keyChar: string; // The character or token this key maps to (e.g., "ㅂ", "a", " ", "backspace")
  isCorrect: boolean;
  expectedChar: string | null;
}

/**
 * Evaluates the correctness of a keystroke in relation to the target text.
 *
 * @param code The KeyboardEvent.code (e.g., 'KeyQ', 'Space', 'Backspace')
 * @param shiftKey Whether shift was active
 * @param qwertyBuffer The QWERTY character buffer representing typed text before this keystroke
 * @param targetText The text the user is supposed to type
 * @param isKorean Whether the target language is Korean
 */
export function evaluateKeystroke(
  code: string,
  shiftKey: boolean,
  qwertyBuffer: string,
  targetText: string,
  isKorean: boolean,
): KeyEvaluation {
  // 1. Handle Backspace (correction key)
  if (code === "Backspace") {
    return {
      keyChar: "backspace",
      isCorrect: true, // Deemed correct as it's a valid corrective action
      expectedChar: null,
    };
  }

  // 2. Handle Space
  if (code === "Space") {
    const nextIdx = qwertyBuffer.length;
    const decomposedTarget = isKorean ? disassemble(targetText) : targetText;
    const expected = decomposedTarget[nextIdx] || null;

    return {
      keyChar: " ",
      isCorrect: expected === " ",
      expectedChar: expected === " " ? null : expected,
    };
  }

  // Handle Shift
  if (code === "ShiftLeft" || code === "ShiftRight") {
    return {
      keyChar: code === "ShiftLeft" ? "shift_l" : "shift_r",
      isCorrect: true, // Function keys do not invalidate correct text progression
      expectedChar: null,
    };
  }

  // Handle Enter
  if (code === "Enter") {
    return {
      keyChar: "enter",
      isCorrect: true, // Function/control keys do not invalidate correct text progression
      expectedChar: null,
    };
  }

  // 3. Handle regular character codes
  const rawChar = getQwertyChar(code, shiftKey);
  if (rawChar === null) {
    // Non-character producing keys
    return {
      keyChar: code.toLowerCase().replace("key", ""),
      isCorrect: false,
      expectedChar: null,
    };
  }

  // 4. Map to layout character (convert English key to Hangul jamo if Korean)
  const keyChar = isKorean && /[a-zA-Z]/.test(rawChar) ? convertQwertyToAlphabet(rawChar) : rawChar;

  // 5. Compare with decomposed target
  const nextIdx = qwertyBuffer.length;
  const decomposedTarget = isKorean ? disassemble(targetText) : targetText;
  const expected = decomposedTarget[nextIdx] || null;

  const isCorrect = keyChar === expected;

  return {
    keyChar,
    isCorrect,
    expectedChar: isCorrect ? null : expected,
  };
}
