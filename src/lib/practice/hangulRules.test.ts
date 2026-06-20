import { describe, it, expect } from "vitest";
import { isValidHangulSequence } from "./hangulRules";

describe("isValidHangulSequence", () => {
  // 1. 문장기호 모음: 불가능
  it("should block Vowel immediately after Punctuation/Space", () => {
    expect(isValidHangulSequence(" ", " ", "ㅏ")).toBe(false);
    expect(isValidHangulSequence(" ", ".", "ㅗ")).toBe(false);
    // Should allow Consonant immediately after Punctuation/Space
    expect(isValidHangulSequence(" ", " ", "ㄱ")).toBe(true);
  });

  // 2. 자음 자음 자음(기준): 불가능
  it("should block three consecutive consonants", () => {
    expect(isValidHangulSequence("ㄱ", "ㅅ", "ㄷ")).toBe(false);
    expect(isValidHangulSequence("ㄴ", "ㅈ", "ㅁ")).toBe(false);
  });

  // 3. 모음 자음 자음(기준): 겹받침, 일부 쌍자음의 두번째 키만 가능
  it("should only allow second key of 겹받침/쌍자음 for V -> C -> C", () => {
    // Valid 겹받침 second keys (e.g. ㄱ + ㅅ = ㄳ, ㄹ + ㄱ = ㄺ)
    expect(isValidHangulSequence("ㅏ", "ㄱ", "ㅅ")).toBe(true);
    expect(isValidHangulSequence("ㅏ", "ㄹ", "ㄱ")).toBe(true);
    // Valid 쌍자음 second keys (ㄲ, ㅆ)
    expect(isValidHangulSequence("ㅏ", "ㄱ", "ㄱ")).toBe(true);
    expect(isValidHangulSequence("ㅏ", "ㅅ", "ㅅ")).toBe(true);

    // Invalid C -> C combination after V (e.g. ㅏ -> ㅁ -> ㄷ)
    expect(isValidHangulSequence("ㅏ", "ㅁ", "ㄷ")).toBe(false);
  });

  // 4. 모음 모음 자음(기준): 겹받침, 일부 쌍자음의 첫번째 키만 가능
  it("should only allow first key of 겹받침/쌍자음 for V -> V -> C", () => {
    // Allowed first keys: 'ㄱ', 'ㄴ', 'ㄹ', 'ㅂ', 'ㅅ'
    expect(isValidHangulSequence("ㅗ", "ㅏ", "ㄱ")).toBe(true);
    expect(isValidHangulSequence("ㅗ", "ㅏ", "ㄴ")).toBe(true);
    expect(isValidHangulSequence("ㅗ", "ㅏ", "ㄹ")).toBe(true);
    expect(isValidHangulSequence("ㅗ", "ㅏ", "ㅂ")).toBe(true);
    expect(isValidHangulSequence("ㅗ", "ㅏ", "ㅅ")).toBe(true);

    // Disallowed first keys (e.g. 'ㅁ', 'ㄷ')
    expect(isValidHangulSequence("ㅗ", "ㅏ", "ㅁ")).toBe(false);
    expect(isValidHangulSequence("ㅗ", "ㅏ", "ㄷ")).toBe(false);
  });

  // 5. 모음 모음(기준): 복모음의 두번째 키만 가능
  it("should only allow valid complex vowel transition for V -> V", () => {
    // Valid complex vowels (e.g. ㅗ + ㅏ = ㅘ, ㅜ + ㅓ = ㅝ, ㅡ + ㅣ = ㅢ)
    expect(isValidHangulSequence("ㄱ", "ㅗ", "ㅏ")).toBe(true);
    expect(isValidHangulSequence("ㄱ", "ㅜ", "ㅓ")).toBe(true);
    expect(isValidHangulSequence("ㄱ", "ㅡ", "ㅣ")).toBe(true);

    // Invalid complex vowels (e.g. ㅏ + ㅓ)
    expect(isValidHangulSequence("ㄱ", "ㅏ", "ㅓ")).toBe(false);
  });

  // 6. 스페이스나 문장부호 후보는 언제나 입력 가능
  it("should always allow space/punctuation as the next character", () => {
    expect(isValidHangulSequence("ㅏ", "ㄱ", " ")).toBe(true);
    expect(isValidHangulSequence("ㅏ", "ㄱ", ".")).toBe(true);
  });
});
