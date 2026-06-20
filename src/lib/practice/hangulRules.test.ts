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

  // 1-2. 문장부호 자음 자음: 불가능
  it("should block consecutive consonants immediately after Punctuation/Space", () => {
    // 허용되지 않는 경우 (쌍자음 연속 입력 및 겹받침 모두 불가능)
    expect(isValidHangulSequence(" ", "ㄱ", "ㄱ")).toBe(false);
    expect(isValidHangulSequence(" ", "ㅅ", "ㅅ")).toBe(false);
    expect(isValidHangulSequence(".", "ㄱ", "ㄱ")).toBe(false);
    expect(isValidHangulSequence(" ", "ㄱ", "ㅅ")).toBe(false);
    expect(isValidHangulSequence(" ", "ㄹ", "ㄱ")).toBe(false);
    expect(isValidHangulSequence(".", "ㅁ", "ㄷ")).toBe(false);
  });

  // 2. 자음 자음 자음(기준): 불가능
  it("should block three consecutive consonants", () => {
    expect(isValidHangulSequence("ㄱ", "ㅅ", "ㄷ")).toBe(false);
    expect(isValidHangulSequence("ㄴ", "ㅈ", "ㅁ")).toBe(false);
  });

  // 3. 모음 자음 자음(기준): 겹받침의 두번째 키만 가능
  it("should only allow second key of 겹받침 for V -> C -> C", () => {
    // Valid 겹받침 second keys (e.g. ㄱ + ㅅ = ㄳ, ㄹ + ㄱ = ㄺ)
    expect(isValidHangulSequence("ㅏ", "ㄱ", "ㅅ")).toBe(true);
    expect(isValidHangulSequence("ㅏ", "ㄹ", "ㄱ")).toBe(true);

    // Invalid double consonant key inputs (ㄲ, ㅆ)
    expect(isValidHangulSequence("ㅏ", "ㄱ", "ㄱ")).toBe(false);
    expect(isValidHangulSequence("ㅏ", "ㅅ", "ㅅ")).toBe(false);

    // Invalid C -> C combination after V (e.g. ㅏ -> ㅁ -> ㄷ)
    expect(isValidHangulSequence("ㅏ", "ㅁ", "ㄷ")).toBe(false);
  });

  // 4. 모음 모음 자음(기준): 겹받침의 첫번째 키만 가능
  it("should only allow first key of 겹받침 for V -> V -> C", () => {
    // Allowed first keys: 'ㄱ', 'ㄴ', 'ㄹ', 'ㅂ'
    expect(isValidHangulSequence("ㅗ", "ㅏ", "ㄱ")).toBe(true);
    expect(isValidHangulSequence("ㅗ", "ㅏ", "ㄴ")).toBe(true);
    expect(isValidHangulSequence("ㅗ", "ㅏ", "ㄹ")).toBe(true);
    expect(isValidHangulSequence("ㅗ", "ㅏ", "ㅂ")).toBe(true);

    // Disallowed first keys (e.g. 'ㅁ', 'ㄷ', 'ㅅ')
    expect(isValidHangulSequence("ㅗ", "ㅏ", "ㅁ")).toBe(false);
    expect(isValidHangulSequence("ㅗ", "ㅏ", "ㄷ")).toBe(false);
    expect(isValidHangulSequence("ㅗ", "ㅏ", "ㅅ")).toBe(false);
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

  // 6. 스페이스나 문장부호 후보는 이전 문맥에 따라 제한됨
  it("should conditionally allow space/punctuation as the next character based on context", () => {
    // 일반적인 상황: 모음 -> 자음 -> 부호 (가능)
    expect(isValidHangulSequence("ㅏ", "ㄱ", " ")).toBe(true);
    expect(isValidHangulSequence("ㅏ", "ㄱ", ".")).toBe(true);

    // A. 문장부호 다음에 문장부호: 불가능
    expect(isValidHangulSequence(".", ".", ".")).toBe(false);
    expect(isValidHangulSequence(" ", " ", ".")).toBe(false);
    expect(isValidHangulSequence("ㅏ", ".", ".")).toBe(false);
    expect(isValidHangulSequence("ㅏ", " ", ".")).toBe(false);
    expect(isValidHangulSequence("ㅏ", ".", " ")).toBe(false);
    expect(isValidHangulSequence("ㅏ", " ", " ")).toBe(false);

    // D. 문장부호 자음 문장부호: 불가능
    expect(isValidHangulSequence(".", "ㄱ", ".")).toBe(false);
    expect(isValidHangulSequence(" ", "ㅅ", ".")).toBe(false);
    expect(isValidHangulSequence(".", "ㄷ", " ")).toBe(false);

    // B. 자음 자음 자음 부호: 불가능
    // prevPrevPrev="ㄱ", prevPrev="ㅅ", prev="ㄷ", next="." -> C -> C -> C -> Punct
    expect(isValidHangulSequence("ㅅ", "ㄷ", ".", "ㄱ")).toBe(false);
    expect(isValidHangulSequence("ㅈ", "ㅁ", " ", "ㄴ")).toBe(false);

    // C. 자음 자음 부호: 자음 2개가 겹받침 순서쌍인 경우만 가능
    // C-1. 허용되는 경우 (ㄱ+ㅅ=ㄳ, ㄹ+ㄱ=ㄺ)
    expect(isValidHangulSequence("ㄱ", "ㅅ", " ")).toBe(true);
    expect(isValidHangulSequence("ㄹ", "ㄱ", ".")).toBe(true);
    // C-2. 허용되지 않는 경우 (쌍자음 연속 입력 ㄲ/ㅆ, ㅁ+ㄷ, ㅈ+ㅁ 등)
    expect(isValidHangulSequence("ㄱ", "ㄱ", " ")).toBe(false);
    expect(isValidHangulSequence("ㅅ", "ㅅ", ".")).toBe(false);
    expect(isValidHangulSequence("ㅁ", "ㄷ", " ")).toBe(false);
    expect(isValidHangulSequence("ㅈ", "ㅁ", ".")).toBe(false);

    // E. 모음 + 받침불가자음 + 문장부호: 불가능 (예: ㅔ + ㅃ + 공백 -> '에ㅃ ')
    expect(isValidHangulSequence("ㅔ", "ㅃ", " ")).toBe(false);
    expect(isValidHangulSequence("ㅏ", "ㅉ", ".")).toBe(false);
    expect(isValidHangulSequence("ㅗ", "ㄸ", " ")).toBe(false);
    // 받침 가능 쌍자음은 허용됨
    expect(isValidHangulSequence("ㅏ", "ㄲ", " ")).toBe(true);
    expect(isValidHangulSequence("ㅏ", "ㅆ", ".")).toBe(true);
  });

  // 7. QWEROP 중복 방지 규칙: 이전 2글자 내에 QWEROP 키 중 하나가 포함되어 있으면 또 나오는 것 금지
  it("should block duplicate QWEROP characters within 2 characters spacing", () => {
    // 7-1. 바로 연달아 오는 경우: 불가능
    expect(isValidHangulSequence("ㅏ", "ㅃ", "ㅉ")).toBe(false);
    expect(isValidHangulSequence("ㅏ", "ㄲ", "ㄲ")).toBe(false);
    expect(isValidHangulSequence("ㅏ", "ㅒ", "ㅖ")).toBe(false);
    expect(isValidHangulSequence("ㅏ", "ㄸ", "ㄸ")).toBe(false);

    // 7-2. 한 글자 건너뛰어 오는 경우: 불가능
    expect(isValidHangulSequence("ㅃ", "ㅏ", "ㅉ")).toBe(false);
    expect(isValidHangulSequence("ㄲ", "ㅏ", "ㄲ")).toBe(false);
    expect(isValidHangulSequence("ㅒ", "ㄱ", "ㅖ")).toBe(false);
    expect(isValidHangulSequence("ㄸ", "ㄴ", "ㅃ")).toBe(false);

    // 7-3. 3글자 이상 떨어진 경우: 가능
    // prevPrevPrev="ㅃ", prevPrev="ㄱ", prev="ㅏ", next="ㅉ" -> 'ㅃ'이 3글자 앞이므로 허용됨
    expect(isValidHangulSequence("ㄱ", "ㅏ", "ㅉ", "ㅃ")).toBe(true);
    expect(isValidHangulSequence("ㄱ", "ㅏ", "ㄲ", "ㄸ")).toBe(true);

    // QWEROP가 아닌 일반 자음/모음은 2글자 내 중복 가능
    expect(isValidHangulSequence("ㄴ", "ㅏ", "ㄴ")).toBe(true);
  });
});
