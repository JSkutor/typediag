import { describe, it, expect } from "vitest";
import { validateTopic } from "./validation";

describe("validateTopic", () => {
  it("should fail on empty or whitespace-only inputs with '글자수가 적습니다.'", () => {
    expect(validateTopic("")).toEqual({
      isValid: false,
      reason: "글자수가 적습니다.",
    });
    expect(validateTopic("   ")).toEqual({
      isValid: false,
      reason: "글자수가 적습니다.",
    });
  });

  it("should fail on inputs shorter than 2 characters after trim with '글자수가 적습니다.'", () => {
    expect(validateTopic("가")).toEqual({
      isValid: false,
      reason: "글자수가 적습니다.",
    });
    expect(validateTopic(" 가 ")).toEqual({
      isValid: false,
      reason: "글자수가 적습니다.",
    });
  });

  it("should fail on inputs longer than 15 characters with '글자수가 많습니다.'", () => {
    expect(validateTopic("일이삼사오육칠팔구십일이삼사오육")).toEqual({
      isValid: false,
      reason: "글자수가 많습니다.",
    });
  });

  it("should fail on invalid characters (e.g. emoji, hanja) with '올바른 주제 입력이 아닙니다.'", () => {
    expect(validateTopic("한글🤖")).toEqual({
      isValid: false,
      reason: "올바른 주제 입력이 아닙니다.",
    });
    expect(validateTopic("한글漢字")).toEqual({
      isValid: false,
      reason: "올바른 주제 입력이 아닙니다.",
    });
  });

  it("should fail on inputs containing single consonants or vowels with '올바른 주제 입력이 아닙니다.'", () => {
    // Consonant/vowel-only inputs
    expect(validateTopic("ㄱㄱㄱ")).toEqual({
      isValid: false,
      reason: "올바른 주제 입력이 아닙니다.",
    });
    expect(validateTopic("ㅋㅋㅋ")).toEqual({
      isValid: false,
      reason: "올바른 주제 입력이 아닙니다.",
    });
    expect(validateTopic("ㅏㅏㅏ")).toEqual({
      isValid: false,
      reason: "올바른 주제 입력이 아닙니다.",
    });

    // Mixed jamo inputs (e.g. "ㄴㄴ나무")
    expect(validateTopic("ㄴㄴ나무")).toEqual({
      isValid: false,
      reason: "올바른 주제 입력이 아닙니다.",
    });
    expect(validateTopic("가나다ㄹㄹ")).toEqual({
      isValid: false,
      reason: "올바른 주제 입력이 아닙니다.",
    });
    expect(validateTopic("우주선ㅋ")).toEqual({
      isValid: false,
      reason: "올바른 주제 입력이 아닙니다.",
    });
    expect(validateTopic("가ㅁㄴㅇ라")).toEqual({
      isValid: false,
      reason: "올바른 주제 입력이 아닙니다.",
    });
  });

  it("should fail on 4 or more consecutive identical characters with '올바른 주제 입력이 아닙니다.'", () => {
    expect(validateTopic("가가가가")).toEqual({
      isValid: false,
      reason: "올바른 주제 입력이 아닙니다.",
    });
    expect(validateTopic("하하하하")).toEqual({
      isValid: false,
      reason: "올바른 주제 입력이 아닙니다.",
    });
  });

  it("should fail on 2-4 character patterns repeated 3 or more times with '올바른 주제 입력이 아닙니다.'", () => {
    expect(validateTopic("안녕안녕안녕")).toEqual({
      isValid: false,
      reason: "올바른 주제 입력이 아닙니다.",
    });
    expect(validateTopic("개발개발개발")).toEqual({
      isValid: false,
      reason: "올바른 주제 입력이 아닙니다.",
    });
    expect(validateTopic("우주선우주선우주선")).toEqual({
      isValid: false,
      reason: "올바른 주제 입력이 아닙니다.",
    });
  });

  it("should pass on valid inputs within the constraints", () => {
    expect(validateTopic("인공지능")).toEqual({ isValid: true });
    expect(validateTopic("우주 과학")).toEqual({ isValid: true });
    expect(validateTopic("웹 개발")).toEqual({ isValid: true });
    expect(validateTopic("리액트 타자")).toEqual({ isValid: true });
    expect(validateTopic("일이삼사오육칠팔구십일이삼사오")).toEqual({ isValid: true }); // Exactly 15 chars

    // New allowed inputs (English, numbers, common symbols)
    expect(validateTopic("hello")).toEqual({ isValid: true });
    expect(validateTopic("한글123")).toEqual({ isValid: true });
    expect(validateTopic("한글abc")).toEqual({ isValid: true });
    expect(validateTopic("웹 3.0")).toEqual({ isValid: true });
    expect(validateTopic("코로나-19")).toEqual({ isValid: true });
    expect(validateTopic("C++")).toEqual({ isValid: true });
  });
});
