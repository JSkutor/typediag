import { disassemble, convertQwertyToAlphabet, assemble } from "es-hangul";
import { assembleHangulWithPunctuation, isCompleteHangul } from "./keyboardMap";

export interface AlignResult {
  op: "EQUAL" | "PARTIAL" | "REPLACE" | "INSERT" | "DELETE";
  char: string;
  targetChar?: string;
  targetIndex?: number;
  inputIndex?: number;
}

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

  constructor(targetText: string, qwertyBuffer: string, isKorean: boolean) {
    this.targetText = targetText;
    this.qwertyBuffer = qwertyBuffer;
    this.isKorean = isKorean;
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
          op: "DELETE",
          char: this.targetText[i],
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
            op: "DELETE",
            char: word.text[i],
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
              op: "DELETE",
              char: " ",
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
        const wordResults = this.alignWord(word.text, wordQwerty, word.start, qPtr);
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

  private alignWord(
    wordTarget: string,
    wordQwerty: string,
    targetOffset: number,
    qOffset: number,
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
          op: "DELETE",
          char: wordTarget[t],
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
            op: "EQUAL" as const,
            char: targetChar,
            targetChar,
            targetIndex: absoluteTargetIdx,
            inputIndex: qOffset + tempQIdx - 1,
          },
        };
      } else {
        const typedSub = wordQwerty.slice(qIdx, tempQIdx);
        const typedChar = assembleHangulWithPunctuation(typedSub);
        return {
          isMismatch: false,
          newQIdx: tempQIdx,
          partialResult: {
            op: "PARTIAL" as const,
            char: typedChar,
            targetChar,
            targetIndex: absoluteTargetIdx,
            inputIndex: qOffset + tempQIdx - 1,
          },
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
      if (!isCompleteHangul(pChar) && !/[a-zA-Z0-9]/.test(pChar)) continue;

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
        wordQwerty.length,
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
      if (isCompleteHangul(char) || /[a-zA-Z0-9.,?!]/.test(char)) completeCharCount++;
    }
    return completeCharCount + 1;
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
        
        let op: "REPLACE" | "PARTIAL" = "REPLACE";
        const tDis = disassemble(targetC);
        const qDis = disassemble(typedC);
        if (qDis.length > 0 && qDis.length <= tDis.length) {
          let isPrefix = true;
          for (let j = 0; j < qDis.length; j++) {
            if (qDis[j] !== tDis[j]) {
              isPrefix = false;
              break;
            }
          }
          if (isPrefix) {
            op = "PARTIAL";
          }
        }

        results.push({
          op,
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

      // 3. 타겟 글자가 더 길다면(생략되었다면) 남은 타겟은 DELETE
      for (let i = minLen; i < N; i++) {
        results.push({
          op: "DELETE",
          char: targetChars[i],
          targetChar: targetChars[i],
          targetIndex: targetOffset + tIdx + i,
        });
      }
    } else {
      // 오타 없이 건너뛴 경우 전부 DELETE
      for (let t = tIdx; t < bestMatchTargetIdx; t++) {
        results.push({
          op: "DELETE",
          char: wordTarget[t],
          targetChar: wordTarget[t],
          targetIndex: targetOffset + t,
        });
      }
    }

    // 일치한 글자(동기화 지점) 처리
    results.push({
      op: "EQUAL",
      char: panicTyped[bestMatchInputIdx],
      targetChar: wordTarget[bestMatchTargetIdx],
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
    wordQwertyLength: number,
  ) {
    const targetChars = wordTarget.slice(tIdx);
    const M = panicTyped.length;
    const N = targetChars.length;
    
    if (N > 0) {
      const minLen = Math.min(M, N);
      
      // 1. 개수가 같은 부분은 1:1 REPLACE (또는 PARTIAL)
      for (let i = 0; i < minLen; i++) {
        const typedC = panicTyped[i];
        const targetC = targetChars[i];
        
        let op: "REPLACE" | "PARTIAL" = "REPLACE";
        const tDis = disassemble(targetC);
        const qDis = disassemble(typedC);
        if (qDis.length > 0 && qDis.length <= tDis.length) {
          let isPrefix = true;
          for (let j = 0; j < qDis.length; j++) {
            if (qDis[j] !== tDis[j]) {
              isPrefix = false;
              break;
            }
          }
          if (isPrefix) {
            op = "PARTIAL";
          }
        }

        results.push({
          op,
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
          char: panicTyped[i],
          inputIndex: qOffset + qIdx + charToQwertyIdx[i],
        });
      }
      
      // 3. 타겟 글자가 더 길다면(생략되었다면) 남은 타겟은 DELETE
      for (let i = minLen; i < N; i++) {
        results.push({
          op: "DELETE",
          char: targetChars[i],
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
  const opPriority = { REPLACE: 4, INSERT: 3, PARTIAL: 2, EQUAL: 1, DELETE: 0 };

  for (const res of results) {
    if (
      res.inputIndex !== undefined &&
      res.inputIndex >= 0 &&
      res.inputIndex < qwertyBuffer.length
    ) {
      const vIdx = qIdxToVCharIdx[res.inputIndex];
      if (vIdx !== -1) {
        if (!vCharIdxToResult.has(vIdx)) {
          vCharIdxToResult.set(vIdx, {
            ...res,
            char: typedChars[vIdx],
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
          // If this result is absorbed into an already emitted visual character,
          // we still need to emit a dummy placeholder for its target index
          // so it doesn't disappear from the UI completely.
          finalResults.push({
            op: "DELETE", // Treated as a pending/omitted character visually
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
): AlignResult[] {
  const aligner = new MaximumValidSequenceAligner(targetText, qwertyBuffer, isKorean);
  const results = aligner.align();
  if (!isKorean) return results;
  return groupAlignResultsByVisualCharacters(results, qwertyBuffer);
}
