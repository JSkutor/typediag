import { describe, expect, it } from "vitest";
import {
  cleanSentence,
  filterTopicGeneratedSentences,
  getPureHangulCount,
  validateTargetSentence,
  BATCH_HANGUL_RANGE,
} from "./targetSentence";

describe("targetSentence", () => {
  it("counts pure hangul excluding spaces and punctuation", () => {
    expect(getPureHangulCount("안녕하세요, 반갑습니다!")).toBe(10);
  });

  it("cleans repeated whitespace", () => {
    expect(cleanSentence("  여러   공백   정리  ")).toBe("여러 공백 정리");
  });

  it("cleanSentence handles empty string", () => {
    expect(cleanSentence("")).toBe("");
  });

  it("rejects fragments that are too short", () => {
    const result = validateTargetSentence("줍니다.", 60, 100);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("hangul_count");
  });

  it("rejects sentences with control characters", () => {
    const result = validateTargetSentence("정상 문장\x01제어문자포함", 60, 100);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("control_char");
  });

  it("rejects multiline sentences with \\n", () => {
    const result = validateTargetSentence("첫번째 줄\n두번째 줄", 1, 100);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("multiline");
  });

  it("rejects sentences with invalid characters (e.g. English)", () => {
    const result = validateTargetSentence("한글에 english 가 포함됨", 1, 100);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("invalid_char");
  });

  it("accepts a sentence within topic generate range", () => {
    const sentence =
      "요즘 들어 날씨 변화가 심해져서 출근길에 우산을 챙길지 말지 고민하는 사람이 많고, 특히 장거리 이동이 예정된 날에는 미리 예보를 확인해 준비하는 습관이 도움이 됩니다.";
    const result = validateTargetSentence(sentence, 60, 100);
    expect(result.isValid).toBe(true);
    expect(result.pureHangulCount).toBeGreaterThanOrEqual(60);
    expect(result.pureHangulCount).toBeLessThanOrEqual(100);
  });

  it("accepts a sentence within batch range boundaries", () => {
    const { minPureHangul, maxPureHangul } = BATCH_HANGUL_RANGE;
    // 50자 경계: 정확히 minPureHangul 글자인 문장은 통과
    const minBoundarySentence = "가".repeat(minPureHangul);
    const minResult = validateTargetSentence(minBoundarySentence, minPureHangul, maxPureHangul);
    expect(minResult.isValid).toBe(true);

    // maxPureHangul + 1자: 거부
    const tooLong = "가".repeat(maxPureHangul + 1);
    const longResult = validateTargetSentence(tooLong, minPureHangul, maxPureHangul);
    expect(longResult.isValid).toBe(false);
    expect(longResult.reason).toBe("hangul_count");
  });

  it("filters invalid entries from generated arrays", () => {
    const valid =
      "요즘 들어 날씨 변화가 심해져서 출근길에 우산을 챙길지 말지 고민하는 사람이 많고, 특히 장거리 이동이 예정된 날에는 미리 예보를 확인해 준비하는 습관이 도움이 됩니다.";
    const filtered = filterTopicGeneratedSentences([valid, "줍니다.", "", 123]);
    expect(filtered).toEqual([valid]);
  });

  it("returns empty array for filterTopicGeneratedSentences with empty input", () => {
    expect(filterTopicGeneratedSentences([])).toEqual([]);
  });

  it("rejects sentences containing forbidden quotes and apostrophes", () => {
    // 홑따옴표가 포함된 경우
    const result1 = validateTargetSentence("한글 연습 문장에 '홑따옴표'가 포함된 경우입니다.", 1, 100);
    expect(result1.isValid).toBe(false);
    expect(result1.reason).toBe("invalid_char");

    // 쌍따옴표가 포함된 경우
    const result2 = validateTargetSentence('한글 연습 문장에 "쌍따옴표"가 포함된 경우입니다.', 1, 100);
    expect(result2.isValid).toBe(false);
    expect(result2.reason).toBe("invalid_char");

    // 백틱이 포함된 경우
    const result3 = validateTargetSentence("한글 연습 문장에 `백틱`이 포함된 경우입니다.", 1, 100);
    expect(result3.isValid).toBe(false);
    expect(result3.reason).toBe("invalid_char");

    // 스마트 아포스트로피 및 스마트 따옴표가 포함된 경우
    const result4 = validateTargetSentence("한글 연습 문장에 ’스마트아포스트로피’가 포함된 경우입니다.", 1, 100);
    expect(result4.isValid).toBe(false);
    expect(result4.reason).toBe("invalid_char");
  });
});

