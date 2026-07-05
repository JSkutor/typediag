import { disassemble, convertQwertyToAlphabet, assemble } from "es-hangul";
import { assembleHangulWithPunctuation, isCompleteHangul } from "./keyboardMap";

export type AlignOp = "EQUAL" | "PARTIAL" | "REPLACE" | "INSERT" | "OMIT" | "PENDING";

export interface AlignResult {
  op: AlignOp;
  char: string;
  targetChar?: string;
  targetIndex?: number;
  inputIndex?: number;
}

/**
 * MvsaCache: runMvsa()에 외부에서 전달하는 단일 캐시 Map.
 *
 * 내부적으로 두 종류의 엔트리를 구분하여 저장한다:
 *
 * 1. Word-level 캐시 (완성 어절 - 스페이스 뒤):
 *    키: `${wordStart}:${qOffset}:${wordQwerty}:true`
 *    - 어절이 스페이스로 완전히 끝난 뒤 저장. 이후 동일 어절 재계산 생략.
 *
 * 진행 중인 어절은 외부 캐시를 사용하지 않고 내부 O(N²) 시뮬레이션을 통해
 * 패닉 복구 지점을 고정합니다.
 */
export type MvsaCache = Map<string, AlignResult[]>;

export function getCharQwertyIndices(qwerty: string): number[] {
  const alphabet = convertQwertyToAlphabet(qwerty);
  const indices: number[] = [];

  let jamoBuffer: string[] = [];
  let jamoStartIdx = 0;

  const isJamo = (char: string) => /[ㄱ-ㅎㅏ-ㅣ]/.test(char);

  for (let i = 0; i < alphabet.length; i++) {
    const char = alphabet[i];

    if (isJamo(char)) {
      if (jamoBuffer.length === 0) {
        jamoStartIdx = i;
      }
      jamoBuffer.push(char);
    } else {
      if (jamoBuffer.length > 0) {
        const assembled = assemble(jamoBuffer);
        for (const assembledChar of assembled) {
          const dis = disassemble(assembledChar);
          jamoStartIdx += dis.length;
          indices.push(jamoStartIdx - 1);
        }
        jamoBuffer = [];
      }
      indices.push(i);
    }
  }

  if (jamoBuffer.length > 0) {
    const assembled = assemble(jamoBuffer);
    for (const assembledChar of assembled) {
      const dis = disassemble(assembledChar);
      jamoStartIdx += dis.length;
      indices.push(jamoStartIdx - 1);
    }
  }

  return indices;
}

export class MaximumValidSequenceAligner {
  private targetText: string;
  private qwertyBuffer: string;
  private isKorean: boolean;
  private cache?: MvsaCache;

  constructor(targetText: string, qwertyBuffer: string, isKorean: boolean, cache?: MvsaCache) {
    this.targetText = targetText;
    this.qwertyBuffer = qwertyBuffer;
    this.isKorean = isKorean;
    this.cache = cache;
  }

  public align(): AlignResult[] {
    if (!this.isKorean) {
      return this.runEnglishFallback();
    }
    return this.alignKoreanText();
  }

  private runEnglishFallback(): AlignResult[] {
    const result: AlignResult[] = [];
    const len = Math.max(this.targetText.length, this.qwertyBuffer.length);
    for (let i = 0; i < len; i++) {
      if (i < this.targetText.length && i < this.qwertyBuffer.length) {
        result.push({
          op: this.targetText[i] === this.qwertyBuffer[i] ? "EQUAL" : "REPLACE",
          char: this.qwertyBuffer[i],
          targetChar: this.targetText[i],
          targetIndex: i,
          inputIndex: i,
        });
      } else if (i < this.targetText.length) {
        result.push({
          op: "PENDING",
          char: "",
          targetChar: this.targetText[i],
          targetIndex: i,
        });
      } else {
        result.push({ op: "INSERT", char: this.qwertyBuffer[i], inputIndex: i });
      }
    }
    return result;
  }

  private splitIntoWords(target: string) {
    const parts = target.split(/(\s+)/);
    const result = [];
    let offset = 0;
    for (const part of parts) {
      if (part.length > 0) {
        result.push({ text: part, start: offset });
        offset += part.length;
      }
    }
    return result;
  }

  private alignKoreanText(): AlignResult[] {
    const words = this.splitIntoWords(this.targetText);
    const result: AlignResult[] = [];
    let qPtr = 0;

    for (const word of words) {
      if (qPtr >= this.qwertyBuffer.length) {
        for (let i = 0; i < word.text.length; i++) {
          result.push({
            op: "PENDING",
            char: "",
            targetChar: word.text[i],
            targetIndex: word.start + i,
          });
        }
        continue;
      }

      if (word.text.trim() === "") {
        for (let i = 0; i < word.text.length; i++) {
          if (qPtr < this.qwertyBuffer.length && this.qwertyBuffer[qPtr] === " ") {
            result.push({
              op: "EQUAL",
              char: " ",
              targetChar: " ",
              targetIndex: word.start + i,
              inputIndex: qPtr,
            });
            qPtr++;
          } else {
            result.push({
              op: "PENDING",
              char: "",
              targetChar: " ",
              targetIndex: word.start + i,
            });
          }
        }
      } else {
        let endQPtr = qPtr;
        while (endQPtr < this.qwertyBuffer.length && this.qwertyBuffer[endQPtr] !== " ") {
          endQPtr++;
        }
        const wordQwerty = this.qwertyBuffer.slice(qPtr, endQPtr);
        const isCompleted = endQPtr < this.qwertyBuffer.length;

        let wordResults: AlignResult[];

        if (isCompleted) {
          // 완성 어절: word-level 캐시 조회
          const wordKey = `${word.start}:${qPtr}:${wordQwerty}:true`;
          if (this.cache?.has(wordKey)) {
            wordResults = this.cache.get(wordKey)!;
          } else {
            wordResults = this.alignWordIncremental(word.text, wordQwerty, word.start, qPtr, true);
            this.cache?.set(wordKey, wordResults);
          }
        } else {
          // 진행 중 어절: 상태 저장 없이 O(N²) 시뮬레이션
          wordResults = this.alignWordIncremental(
            word.text,
            wordQwerty,
            word.start,
            qPtr,
            false,
          );
        }

        result.push(...wordResults);
        qPtr = endQPtr;
      }
    }

    if (qPtr < this.qwertyBuffer.length) {
      const excessQBuffer = this.qwertyBuffer.slice(qPtr);
      const excessTyped = assembleHangulWithPunctuation(excessQBuffer);
      const charToQwertyIdx = getCharQwertyIndices(excessQBuffer);
      for (let i = 0; i < excessTyped.length; i++) {
        result.push({
          op: "INSERT",
          char: excessTyped[i],
          inputIndex: qPtr + charToQwertyIdx[i],
        });
      }
    }

    return result;
  }

  /**
   * O(N²) Prefix Simulation
   *
   * 외부 상태(캐시) 없이 내부적으로 1글자부터 N글자까지 타이핑 과정을 시뮬레이션합니다.
   * 매 단계에서 완벽히 일치한 지점(EQUAL)의 타겟 인덱스(tIdx)와 입력 인덱스(qIdx)를
   * '복구 지점(Anchor)'으로 기억하고, 다음 글자 계산 시 이 복구 지점 이후의
   * 짧은 문자열만 재계산합니다.
   * 이를 통해 오타나 삽입(INSERT)으로 인해 글자수가 변하더라도
   * 패닉 복구 경계가 절대 뒤틀리지 않습니다.
   */
  private alignWordIncremental(
    wordTarget: string,
    wordQwerty: string,
    targetOffset: number,
    qOffset: number,
    isCompleted: boolean,
  ): AlignResult[] {
    if (wordQwerty.length === 0) {
      return this.alignWord(wordTarget, "", targetOffset, qOffset, isCompleted);
    }

    let results: AlignResult[] = [];

    for (let i = 1; i <= wordQwerty.length; i++) {
      const prefix = wordQwerty.slice(0, i);
      const isLast = i === wordQwerty.length && isCompleted;

      if (results.length === 0) {
        results = this.alignWord(wordTarget, prefix, targetOffset, qOffset, isLast);
        continue;
      }

      // 이전 prefix 결과에서 마지막으로 확정된 복구 지점(EQUAL) 찾기
      let lastEqualIdx = -1;
      for (let j = results.length - 1; j >= 0; j--) {
        if (results[j].op === "EQUAL") {
          lastEqualIdx = j;
          break;
        }
      }

      const confirmedResults = lastEqualIdx === -1 ? [] : results.slice(0, lastEqualIdx + 1);

      // 복구 지점(Anchor)의 두 인덱스(tIdx, qIdx) 기억
      let confirmedTIdx = 0;
      let confirmedQIdx = 0;

      for (const r of confirmedResults) {
        if (r.inputIndex !== undefined) {
          const localQ = r.inputIndex - qOffset;
          if (localQ >= confirmedQIdx) {
            confirmedQIdx = localQ + 1;
          }
        }
        if (r.targetIndex !== undefined && r.op !== "PENDING") {
          const localT = r.targetIndex - targetOffset;
          if (localT >= confirmedTIdx) {
            confirmedTIdx = localT + 1;
          }
        }
      }

      const remainingTarget = wordTarget.slice(confirmedTIdx);
      const remainingQwerty = prefix.slice(confirmedQIdx);

      let tailResults: AlignResult[] = [];
      if (remainingTarget.length > 0 || remainingQwerty.length > 0) {
        tailResults = this.alignWord(
          remainingTarget,
          remainingQwerty,
          targetOffset + confirmedTIdx,
          qOffset + confirmedQIdx,
          isLast,
        );
      }

      results = [...confirmedResults, ...tailResults];
    }

    return results;
  }

  private alignWord(
    wordTarget: string,
    wordQwerty: string,
    targetOffset: number,
    qOffset: number,
    isCompleted: boolean = false,
  ): AlignResult[] {
    let tIdx = 0;
    let qIdx = 0;
    const results: AlignResult[] = [];
    const qStarts: number[] = [];

    while (tIdx < wordTarget.length && qIdx < wordQwerty.length) {
      if (qStarts.length === tIdx) {
        qStarts.push(qIdx);
      } else {
        qStarts[tIdx] = qIdx;
      }

      const { isMismatch, newQIdx, partialResult } = this.runNormalMode(
        wordTarget[tIdx],
        wordQwerty,
        qIdx,
        targetOffset + tIdx,
        qOffset,
      );

      if (!isMismatch) {
        if (isCompleted && partialResult!.op === "PARTIAL") {
          partialResult!.op = "REPLACE";
        }
        results.push(partialResult!);
        qIdx = newQIdx;
        tIdx++;
        continue;
      }

      const panicResult = this.runPanicMode(
        wordTarget,
        wordQwerty,
        tIdx,
        qIdx,
        targetOffset,
        qOffset,
      );

      results.push(...panicResult.results);
      tIdx = panicResult.newTIdx;
      qIdx = panicResult.newQIdx;
    }

    // Process excess typing or remaining targets
    if (qIdx < wordQwerty.length) {
      const excessQBuffer = wordQwerty.slice(qIdx);
      const excessTyped = assembleHangulWithPunctuation(excessQBuffer);
      const charToQwertyIdx = getCharQwertyIndices(excessQBuffer);
      for (let i = 0; i < excessTyped.length; i++) {
        results.push({
          op: "INSERT",
          char: excessTyped[i],
          inputIndex: qOffset + qIdx + charToQwertyIdx[i],
        });
      }
    }

    if (tIdx < wordTarget.length) {
      for (let t = tIdx; t < wordTarget.length; t++) {
        results.push({
          op: isCompleted ? "OMIT" : "PENDING",
          char: "",
          targetChar: wordTarget[t],
          targetIndex: targetOffset + t,
        });
      }
    }

    return results;
  }

  private runNormalMode(
    targetChar: string,
    wordQwerty: string,
    qIdx: number,
    absoluteTargetIdx: number,
    qOffset: number,
  ) {
    const tDis = disassemble(targetChar);
    let matchedDisLen = 0;
    let tempQIdx = qIdx;
    let isMismatch = false;

    while (matchedDisLen < tDis.length && tempQIdx < wordQwerty.length) {
      const inputChar = convertQwertyToAlphabet(wordQwerty[tempQIdx]);
      if (inputChar === tDis[matchedDisLen]) {
        matchedDisLen++;
        tempQIdx++;
      } else {
        isMismatch = true;
        break;
      }
    }

    if (!isMismatch) {
      if (matchedDisLen === tDis.length) {
        return {
          isMismatch: false,
          newQIdx: tempQIdx,
          partialResult: {
            op: "EQUAL",
            char: targetChar,
            targetChar,
            targetIndex: absoluteTargetIdx,
            inputIndex: qOffset + tempQIdx - 1,
          } as AlignResult,
        };
      } else {
        const typedSub = wordQwerty.slice(qIdx, tempQIdx);
        const typedChar = assembleHangulWithPunctuation(typedSub);
        return {
          isMismatch: false,
          newQIdx: tempQIdx,
          partialResult: {
            op: "PARTIAL",
            char: typedChar,
            targetChar,
            targetIndex: absoluteTargetIdx,
            inputIndex: qOffset + tempQIdx - 1,
          } as AlignResult,
        };
      }
    }

    return { isMismatch: true, newQIdx: qIdx };
  }

  private runPanicMode(
    wordTarget: string,
    wordQwerty: string,
    tIdx: number,
    qIdx: number,
    targetOffset: number,
    qOffset: number,
  ) {
    const results: AlignResult[] = [];
    const panicQBuffer = wordQwerty.slice(qIdx);
    const charToQwertyIdx = getCharQwertyIndices(panicQBuffer);
    const panicTyped = assembleHangulWithPunctuation(panicQBuffer);

    const maxLookahead = this.calculateLookaheadWindow(panicTyped);
    const targetLookaheadEnd = Math.min(wordTarget.length, tIdx + maxLookahead);

    let matchFound = false;
    let bestMatchInputIdx = -1;
    let bestMatchTargetIdx = -1;

    for (let pIdx = 0; pIdx < panicTyped.length && !matchFound; pIdx++) {
      const pChar = panicTyped[pIdx];
      if (!this.isComparableCompleteUnit(pChar)) {
        // 단독 자음인 경우, 뒤에 완성 한글이 없을 때만 target 글자의 초성 자소와 비교
        // (뒤에 완성 한글이 있으면 받침 문맥이므로 초성으로 사용 불가)
        // 예: 'ㄴ다라'의 ㄴ → 뒤에 '다'(완성 한글)가 있으므로 받침 → 초성 비교 X
        //     'ㅎㄹ'의 ㄹ → 뒤에 완성 한글 없음, 미완성 초성 → 초성 비교 O
        const hasCompleteHangulAfter = panicTyped
          .slice(pIdx + 1)
          .split("")
          .some((c) => isCompleteHangul(c));
        if (/[ㄱ-ㅎ]/.test(pChar) && !hasCompleteHangulAfter) {
          for (let lookTIdx = targetLookaheadEnd - 1; lookTIdx >= tIdx; lookTIdx--) {
            const targetDis = disassemble(wordTarget[lookTIdx]);
            if (targetDis[0] === pChar) {
              matchFound = true;
              bestMatchInputIdx = pIdx;
              bestMatchTargetIdx = lookTIdx;
              break;
            }
          }
        }
        continue;
      }

      for (let lookTIdx = targetLookaheadEnd - 1; lookTIdx >= tIdx; lookTIdx--) {
        if (wordTarget[lookTIdx] === pChar) {
          matchFound = true;
          bestMatchInputIdx = pIdx;
          bestMatchTargetIdx = lookTIdx;
          break;
        }
      }
    }

    if (matchFound) {
      this.recoverFromPanic(
        results,
        bestMatchInputIdx,
        bestMatchTargetIdx,
        charToQwertyIdx,
        panicQBuffer,
        wordTarget,
        tIdx,
        qIdx,
        targetOffset,
        qOffset,
        panicTyped,
      );

      return {
        results,
        newTIdx: bestMatchTargetIdx + 1,
        newQIdx: qIdx + charToQwertyIdx[bestMatchInputIdx] + 1,
      };
    } else {
      this.handleUnrecoverablePanic(
        results,
        panicTyped,
        wordTarget,
        tIdx,
        targetOffset,
        qOffset,
        qIdx,
        charToQwertyIdx,
      );

      return {
        results,
        newTIdx: wordTarget.length,
        newQIdx: wordQwerty.length,
      };
    }
  }

  private calculateLookaheadWindow(panicTyped: string): number {
    let completeCharCount = 0;
    for (const char of panicTyped) {
      if (this.isComparableCompleteUnit(char)) completeCharCount++;
    }
    return completeCharCount + 1;
  }

  private isComparableCompleteUnit(char: string): boolean {
    return isCompleteHangul(char) || /[a-zA-Z0-9.,?!]/.test(char);
  }

  private recoverFromPanic(
    results: AlignResult[],
    bestMatchInputIdx: number,
    bestMatchTargetIdx: number,
    charToQwertyIdx: number[],
    panicQBuffer: string,
    wordTarget: string,
    tIdx: number,
    qIdx: number,
    targetOffset: number,
    qOffset: number,
    panicTyped: string,
  ) {
    const endTypoQIdx = bestMatchInputIdx > 0 ? charToQwertyIdx[bestMatchInputIdx - 1] : -1;

    if (endTypoQIdx >= 0) {
      const typoQBuffer = panicQBuffer.slice(0, endTypoQIdx + 1);
      const typoTyped = assembleHangulWithPunctuation(typoQBuffer);
      const targetChars = wordTarget.slice(tIdx, bestMatchTargetIdx);

      const M = typoTyped.length;
      const N = targetChars.length;
      const minLen = Math.min(M, N);

      // 1. 개수가 같은 부분은 1:1 REPLACE (또는 PARTIAL)
      for (let i = 0; i < minLen; i++) {
        const typedC = typoTyped[i];
        const targetC = targetChars[i];

        if (!this.isComparableCompleteUnit(typedC)) {
          results.push({
            op: "OMIT",
            char: typedC,
            targetChar: targetC,
            targetIndex: targetOffset + tIdx + i,
            inputIndex: qOffset + qIdx + charToQwertyIdx[i],
          });
          continue;
        }

        results.push({
          op: "REPLACE",
          char: typedC,
          targetChar: targetC,
          targetIndex: targetOffset + tIdx + i,
          inputIndex: qOffset + qIdx + charToQwertyIdx[i],
        });
      }

      // 2. 입력된 오타가 더 길다면 초과분은 INSERT
      for (let i = minLen; i < M; i++) {
        results.push({
          op: "INSERT",
          char: typoTyped[i],
          inputIndex: qOffset + qIdx + charToQwertyIdx[i],
        });
      }

      // 3. 복구 지점 앞에서 입력 없이 건너뛴 타겟은 생략 오타
      for (let i = minLen; i < N; i++) {
        results.push({
          op: "OMIT",
          char: "",
          targetChar: targetChars[i],
          targetIndex: targetOffset + tIdx + i,
        });
      }
    } else {
      // 복구 글자가 바로 입력되었다면 그 앞의 타겟은 생략 오타
      for (let t = tIdx; t < bestMatchTargetIdx; t++) {
        results.push({
          op: "OMIT",
          char: "",
          targetChar: wordTarget[t],
          targetIndex: targetOffset + t,
        });
      }
    }

    // 일치한 글자(동기화 지점) 처리
    const matchedChar = panicTyped[bestMatchInputIdx];
    const targetC = wordTarget[bestMatchTargetIdx];
    results.push({
      op: matchedChar === targetC ? "EQUAL" : "PARTIAL",
      char: matchedChar,
      targetChar: targetC,
      targetIndex: targetOffset + bestMatchTargetIdx,
      inputIndex: qOffset + qIdx + charToQwertyIdx[bestMatchInputIdx],
    });
  }

  private handleUnrecoverablePanic(
    results: AlignResult[],
    panicTyped: string,
    wordTarget: string,
    tIdx: number,
    targetOffset: number,
    qOffset: number,
    qIdx: number,
    charToQwertyIdx: number[],
  ) {
    const targetChars = wordTarget.slice(tIdx);
    const M = panicTyped.length;
    const N = targetChars.length;

    if (N > 0) {
      const minLen = Math.min(M, N);

      // 1. 개수가 같은 부분은 1:1 REPLACE
      for (let i = 0; i < minLen; i++) {
        results.push({
          op: "REPLACE",
          char: panicTyped[i],
          targetChar: targetChars[i],
          targetIndex: targetOffset + tIdx + i,
          inputIndex: qOffset + qIdx + charToQwertyIdx[i],
        });
      }

      // 2. 입력된 오타가 더 길다면 초과분은 INSERT
      for (let i = minLen; i < M; i++) {
        results.push({
          op: "INSERT",
          char: panicTyped[i],
          inputIndex: qOffset + qIdx + charToQwertyIdx[i],
        });
      }

      // 3. 아직 복구 지점을 찾지 못했으므로 남은 타겟은 대기 상태로 둔다
      for (let i = minLen; i < N; i++) {
        results.push({
          op: "PENDING",
          char: "",
          targetChar: targetChars[i],
          targetIndex: targetOffset + tIdx + i,
        });
      }
    } else {
      // 매칭될 타겟이 없으면 전부 INSERT
      for (let i = 0; i < M; i++) {
        results.push({
          op: "INSERT",
          char: panicTyped[i],
          inputIndex: qOffset + qIdx + charToQwertyIdx[i],
        });
      }
    }
  }
}

export function groupAlignResultsByVisualCharacters(
  results: AlignResult[],
  qwertyBuffer: string,
): AlignResult[] {
  const typedChars = assembleHangulWithPunctuation(qwertyBuffer);
  const qEnds = getCharQwertyIndices(qwertyBuffer);

  const qIdxToVCharIdx = new Array(qwertyBuffer.length).fill(-1);
  let start = 0;
  for (let i = 0; i < typedChars.length; i++) {
    const end = qEnds[i] + 1;
    for (let q = start; q < end; q++) {
      qIdxToVCharIdx[q] = i;
    }
    start = end;
  }

  const vCharIdxToResult = new Map<number, AlignResult>();
  const opPriority = { REPLACE: 5, INSERT: 4, PARTIAL: 3, EQUAL: 2, OMIT: 1, PENDING: 0 };

  for (const res of results) {
    if (
      res.inputIndex !== undefined &&
      res.inputIndex >= 0 &&
      res.inputIndex < qwertyBuffer.length
    ) {
      const vIdx = qIdxToVCharIdx[res.inputIndex];
      if (vIdx !== -1) {
        if (!vCharIdxToResult.has(vIdx)) {
          const groupedOp =
            res.op === "EQUAL" && typedChars[vIdx] !== res.targetChar ? "PARTIAL" : res.op;
          vCharIdxToResult.set(vIdx, {
            ...res,
            op: groupedOp,
            char: typedChars[vIdx],
            inputIndex: qEnds[vIdx],
          });
        } else {
          const existing = vCharIdxToResult.get(vIdx)!;
          if (opPriority[res.op] > opPriority[existing.op]) {
            existing.op = res.op;
          }
          existing.inputIndex = Math.max(existing.inputIndex!, res.inputIndex);
        }
      }
    }
  }

  const finalResults: AlignResult[] = [];
  const emittedVIdx = new Set<number>();

  for (const res of results) {
    if (
      res.inputIndex !== undefined &&
      res.inputIndex >= 0 &&
      res.inputIndex < qwertyBuffer.length
    ) {
      const vIdx = qIdxToVCharIdx[res.inputIndex];
      if (vIdx !== -1) {
        if (!emittedVIdx.has(vIdx)) {
          finalResults.push(vCharIdxToResult.get(vIdx)!);
          emittedVIdx.add(vIdx);
        } else if (res.targetIndex !== undefined) {
          // Preserve a target-only slot when multiple target chars are absorbed
          // into the same composed visual character.
          finalResults.push({
            op: res.op === "OMIT" ? "OMIT" : "PENDING",
            char: "",
            targetChar: res.targetChar,
            targetIndex: res.targetIndex,
          });
        }
        continue;
      }
    }
    finalResults.push(res);
  }

  return finalResults;
}

export function runMvsa(
  targetText: string,
  qwertyBuffer: string,
  isKorean: boolean,
  cache?: MvsaCache,
): AlignResult[] {
  const aligner = new MaximumValidSequenceAligner(targetText, qwertyBuffer, isKorean, cache);
  const results = aligner.align();
  if (!isKorean) return results;
  return groupAlignResultsByVisualCharacters(results, qwertyBuffer);
}
