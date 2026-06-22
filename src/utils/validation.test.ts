import { describe, it, expect } from "vitest";
import { validateSubject } from "./validation";

describe("validateSubject", () => {
  it("should fail on empty or whitespace-only inputs with '글자수가 적습니다.'", () => {
    expect(validateSubject("")).toEqual({
      isValid: false,
      reason: "글자수가 적습니다.",
    });
    expect(validateSubject("   ")).toEqual({
      isValid: false,
      reason: "글자수가 적습니다.",
    });
  });

  it("should fail on inputs shorter than 2 characters after trim with '글자수가 적습니다.'", () => {
    expect(validateSubject("가")).toEqual({
      isValid: false,
      reason: "글자수가 적습니다.",
    });
    expect(validateSubject(" 가 ")).toEqual({
      isValid: false,
      reason: "글자수가 적습니다.",
    });
  });

  it("should fail on inputs longer than 15 characters with '글자수가 많습니다.'", () => {
    expect(validateSubject("일이삼사오육칠팔구십일이삼사오육")).toEqual({
      isValid: false,
      reason: "글자수가 많습니다.",
    });
  });

  it("should fail on non-Korean characters with '올바른 한글 입력이 아닙니다.'", () => {
    expect(validateSubject("hello")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });
    expect(validateSubject("한글123")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });
    expect(validateSubject("한글!!!")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });
    expect(validateSubject("한글abc")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });
  });

  it("should fail on inputs containing single consonants or vowels with '올바른 한글 입력이 아닙니다.'", () => {
    // Consonant/vowel-only inputs
    expect(validateSubject("ㄱㄱㄱ")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });
    expect(validateSubject("ㅋㅋㅋ")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });
    expect(validateSubject("ㅏㅏㅏ")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });

    // Mixed jamo inputs (e.g. "ㄴㄴ나무")
    expect(validateSubject("ㄴㄴ나무")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });
    expect(validateSubject("가나다ㄹㄹ")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });
    expect(validateSubject("우주선ㅋ")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });
    expect(validateSubject("가ㅁㄴㅇ라")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });
  });

  it("should fail on 4 or more consecutive identical characters with '올바른 한글 입력이 아닙니다.'", () => {
    expect(validateSubject("가가가가")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });
    expect(validateSubject("하하하하")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });
  });

  it("should fail on 2-4 character patterns repeated 3 or more times with '올바른 한글 입력이 아닙니다.'", () => {
    expect(validateSubject("안녕안녕안녕")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });
    expect(validateSubject("개발개발개발")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });
    expect(validateSubject("우주선우주선우주선")).toEqual({
      isValid: false,
      reason: "올바른 한글 입력이 아닙니다.",
    });
  });

  it("should pass on valid Korean inputs within the constraints", () => {
    expect(validateSubject("인공지능")).toEqual({ isValid: true });
    expect(validateSubject("우주 과학")).toEqual({ isValid: true });
    expect(validateSubject("웹 개발")).toEqual({ isValid: true });
    expect(validateSubject("리액트 타자")).toEqual({ isValid: true });
    expect(validateSubject("일이삼사오육칠팔구십일이삼사오")).toEqual({ isValid: true }); // Exactly 15 chars
  });
});
