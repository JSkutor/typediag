import { describe, it, expect } from "vitest";
import { runMvsa, getCharQwertyIndices } from "./mvsa";

describe("MVSA (Maximum Valid Sequence Aligner)", () => {
  it("should match identical strings (Normal mode)", () => {
    // target: 마우스가, typed: 마우스가 (akdntm rk -> akdntmrk)
    const qwerty = "akdntmrk";
    const result = runMvsa("마우스가", qwerty, true);

    expect(result).toEqual([
      { op: "EQUAL", char: "마", targetChar: "마", targetIndex: 0, inputIndex: 1 },
      { op: "EQUAL", char: "우", targetChar: "우", targetIndex: 1, inputIndex: 3 },
      { op: "EQUAL", char: "스", targetChar: "스", targetIndex: 2, inputIndex: 5 },
      { op: "EQUAL", char: "가", targetChar: "가", targetIndex: 3, inputIndex: 7 },
    ]);
  });

  it("should handle partial match (도깨비불)", () => {
    // target: 마우스, typed: 마우ㅅ (akdnt)
    const qwerty = "akdnt";
    const result = runMvsa("마우스", qwerty, true);

    expect(result).toEqual([
      { op: "EQUAL", char: "마", targetChar: "마", targetIndex: 0, inputIndex: 1 },
      { op: "EQUAL", char: "우", targetChar: "우", targetIndex: 1, inputIndex: 3 },
      { op: "PARTIAL", char: "ㅅ", targetChar: "스", targetIndex: 2, inputIndex: 4 },
    ]);
  });

  it("should handle inserted typo and recover (정말로 -> 정엉말로)", () => {
    // target: 정말로 (wjdakffh), typed: 정엉말로 (wjd djd akf fh -> wjddjdakffh)
    const qwerty = "wjddjdakffh";
    const result = runMvsa("정말로", qwerty, true);

    expect(result).toEqual([
      { op: "EQUAL", char: "정", targetChar: "정", targetIndex: 0, inputIndex: 2 },
      { op: "INSERT", char: "엉", inputIndex: 5 },
      { op: "EQUAL", char: "말", targetChar: "말", targetIndex: 1, inputIndex: 8 },
      { op: "EQUAL", char: "로", targetChar: "로", targetIndex: 2, inputIndex: 10 },
    ]);
  });

  it("should handle replaced typo and recover (가나다라마 -> 가가가라마)", () => {
    // target: 가나다라마 (rkskekfkak), typed: 가가가라마 (rkrkrkfkak)
    const qwerty = "rkrkrkfkak";
    const result = runMvsa("가나다라마", qwerty, true);

    expect(result).toEqual([
      { op: "EQUAL", char: "가", targetChar: "가", targetIndex: 0, inputIndex: 1 },
      { op: "REPLACE", char: "가가", targetChar: "나다", targetIndex: 1, inputIndex: 5 },
      { op: "EQUAL", char: "라", targetChar: "라", targetIndex: 3, inputIndex: 7 },
      { op: "EQUAL", char: "마", targetChar: "마", targetIndex: 4, inputIndex: 9 },
    ]);
  });

  it("should handle omission (가나다라 -> 간다라)", () => {
    // target: 가나다라 (rkskekfk), typed: 간다라 (rks ek fk -> rksekfk)
    const qwerty = "rksekfk";
    const result = runMvsa("가나다라", qwerty, true);

    expect(result).toEqual([
      { op: "EQUAL", char: "가", targetChar: "가", targetIndex: 0, inputIndex: 1 },
      { op: "REPLACE", char: "ㄴ", targetChar: "나", targetIndex: 1, inputIndex: 2 },
      { op: "EQUAL", char: "다", targetChar: "다", targetIndex: 2, inputIndex: 4 },
      { op: "EQUAL", char: "라", targetChar: "라", targetIndex: 3, inputIndex: 6 },
    ]);
  });

  it("should isolate errors per word", () => {
    // target: 가나다라 마바사 (rkskekfk akqktk)
    // typed: 간다라 마바사 (rksekfk akqktk)
    const qwerty = "rksekfk akqktk";
    const result = runMvsa("가나다라 마바사", qwerty, true);

    expect(result).toEqual([
      // First word
      { op: "EQUAL", char: "가", targetChar: "가", targetIndex: 0, inputIndex: 1 },
      { op: "REPLACE", char: "ㄴ", targetChar: "나", targetIndex: 1, inputIndex: 2 },
      { op: "EQUAL", char: "다", targetChar: "다", targetIndex: 2, inputIndex: 4 },
      { op: "EQUAL", char: "라", targetChar: "라", targetIndex: 3, inputIndex: 6 },
      // Space
      { op: "EQUAL", char: " ", targetChar: " ", targetIndex: 4, inputIndex: 7 },
      // Second word
      { op: "EQUAL", char: "마", targetChar: "마", targetIndex: 5, inputIndex: 9 },
      { op: "EQUAL", char: "바", targetChar: "바", targetIndex: 6, inputIndex: 11 },
      { op: "EQUAL", char: "사", targetChar: "사", targetIndex: 7, inputIndex: 13 },
    ]);
  });

  it("should handle English words natively", () => {
    const result = runMvsa("hello", "heXlo", false);
    expect(result).toEqual([
      { op: "EQUAL", char: "h", targetChar: "h", targetIndex: 0, inputIndex: 0 },
      { op: "EQUAL", char: "e", targetChar: "e", targetIndex: 1, inputIndex: 1 },
      { op: "REPLACE", char: "X", targetChar: "l", targetIndex: 2, inputIndex: 2 },
      { op: "EQUAL", char: "l", targetChar: "l", targetIndex: 3, inputIndex: 3 },
      { op: "EQUAL", char: "o", targetChar: "o", targetIndex: 4, inputIndex: 4 },
    ]);
  });
});
