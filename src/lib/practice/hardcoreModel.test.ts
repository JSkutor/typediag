import { describe, it, expect } from "vitest";
import { applyMask, sampleNextId, generateHardcorePracticeText } from "./hardcoreModel";
import vocab from "./hardcore_vocab.json";

describe("hardcoreModel applyMask", () => {
  it("should force a space after punctuation characters (., ?, !)", () => {
    const spaceId = vocab.indexOf(" ");
    const logits = new Array(vocab.length).fill(1.0);

    // 1. When the last character is '.'
    const masked1 = applyMask(["."], logits);
    expect(masked1[spaceId]).toBe(1.0);
    for (let i = 0; i < masked1.length; i++) {
      if (i !== spaceId) {
        expect(masked1[i]).toBe(-Infinity);
      }
    }

    // 2. When the last character is ','
    const masked2 = applyMask([","], logits);
    expect(masked2[spaceId]).toBe(1.0);
    for (let i = 0; i < masked2.length; i++) {
      if (i !== spaceId) {
        expect(masked2[i]).toBe(-Infinity);
      }
    }

    // 3. When the last character is '?'
    const masked3 = applyMask(["?"], logits);
    expect(masked3[spaceId]).toBe(1.0);
    for (let i = 0; i < masked3.length; i++) {
      if (i !== spaceId) {
        expect(masked3[i]).toBe(-Infinity);
      }
    }

    // 4. When the last character is '!'
    const masked4 = applyMask(["!"], logits);
    expect(masked4[spaceId]).toBe(1.0);
    for (let i = 0; i < masked4.length; i++) {
      if (i !== spaceId) {
        expect(masked4[i]).toBe(-Infinity);
      }
    }
  });

  it("should not force a space if the last character is not a punctuation", () => {
    const logits = new Array(vocab.length).fill(1.0);

    // When the last character is a regular hangul key 'ㄱ'
    const masked = applyMask(["ㄱ"], logits);
    const nonInfiniteCount = masked.filter((l) => l !== -Infinity).length;
    expect(nonInfiniteCount).toBeGreaterThan(1);
  });

  it("should mask non-jongseong double consonants (Q, W, E) if it is the last character and the previous is a vowel", () => {
    const logits = new Array(vocab.length).fill(1.0);
    // 'k' (ㅏ) is a vowel
    const masked = applyMask(["k"], logits, true);

    const qId = vocab.indexOf("Q");
    const wId = vocab.indexOf("W");
    const eId = vocab.indexOf("E");
    const rId = vocab.indexOf("R"); // 'ㄲ' (jongseong allowed)

    expect(masked[qId]).toBe(-Infinity);
    expect(masked[wId]).toBe(-Infinity);
    expect(masked[eId]).toBe(-Infinity);
    expect(masked[rId]).not.toBe(-Infinity);
  });
});

describe("hardcoreModel sampleNextId", () => {
  it("should process logits with symmetric log scaling and sample valid index", () => {
    // Standard logits with one -Infinity
    const logits = [-Infinity, 100.0, 10.0, 0.0];

    // Run multiple times to verify no runtime error and that it never samples the -Infinity index (index 0)
    for (let i = 0; i < 50; i++) {
      const sampledIndex = sampleNextId(logits, 1.0, 0, 1.0, true);
      expect(sampledIndex).toBeGreaterThan(0);
      expect(sampledIndex).toBeLessThan(4);
    }
  });

  it("should support disabling symmetric log scaling", () => {
    const logits = [-Infinity, 50.0, 20.0];
    const sampledIndex = sampleNextId(logits, 1.0, 0, 1.0, false);
    expect(sampledIndex).toBeGreaterThan(0);
    expect(sampledIndex).toBeLessThan(3);
  });
});

describe("hardcoreModel generateHardcorePracticeText", () => {
  it("should not end with an incomplete Hangul consonant or vowel", () => {
    for (let i = 0; i < 50; i++) {
      const text = generateHardcorePracticeText(70);
      expect(text.length).toBeGreaterThan(0);
      const lastChar = text[text.length - 1];
      // 마지막 글자가 단독 자음/모음이 아니어야 함
      expect(/[ㄱ-ㅎㅏ-ㅣ]/.test(lastChar)).toBe(false);
    }
  });
});
