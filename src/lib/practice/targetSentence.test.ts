import { describe, expect, it } from "vitest";
import {
  cleanSentence,
  filterSubjectGeneratedSentences,
  getPureHangulCount,
  validateTargetSentence,
} from "./targetSentence";

describe("targetSentence", () => {
  it("counts pure hangul excluding spaces and punctuation", () => {
    expect(getPureHangulCount("안녕하세요, 반갑습니다!")).toBe(10);
  });

  it("cleans repeated whitespace", () => {
    expect(cleanSentence("  여러   공백   정리  ")).toBe("여러 공백 정리");
  });

  it("rejects fragments that are too short", () => {
    const result = validateTargetSentence("줍니다.", 60, 100);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("hangul_count");
  });

  it("accepts a sentence within subject generate range", () => {
    const sentence =
      "요즘 들어 날씨 변화가 심해져서 출근길에 우산을 챙길지 말지 고민하는 사람이 많고, 특히 장거리 이동이 예정된 날에는 미리 예보를 확인해 준비하는 습관이 도움이 됩니다.";
    const result = validateTargetSentence(sentence, 60, 100);
    expect(result.isValid).toBe(true);
    expect(result.pureHangulCount).toBeGreaterThanOrEqual(60);
    expect(result.pureHangulCount).toBeLessThanOrEqual(100);
  });

  it("filters invalid entries from generated arrays", () => {
    const valid =
      "요즘 들어 날씨 변화가 심해져서 출근길에 우산을 챙길지 말지 고민하는 사람이 많고, 특히 장거리 이동이 예정된 날에는 미리 예보를 확인해 준비하는 습관이 도움이 됩니다.";
    const filtered = filterSubjectGeneratedSentences([valid, "줍니다.", "", 123]);
    expect(filtered).toEqual([valid]);
  });
});
