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

    while (tIdx < wordTarget.length && qIdx < wordQwerty.length) {
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

      for (let lookTIdx = tIdx; lookTIdx < targetLookaheadEnd; lookTIdx++) {
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

      if (tIdx === bestMatchTargetIdx) {
        results.push({
          op: "INSERT",
          char: typoTyped,
          inputIndex: qOffset + qIdx + endTypoQIdx,
        });
      } else {
        results.push({
          op: "REPLACE",
          char: typoTyped,
          targetChar: wordTarget.slice(tIdx, bestMatchTargetIdx) || undefined,
          targetIndex: targetOffset + tIdx,
          inputIndex: qOffset + qIdx + endTypoQIdx,
        });
      }
    } else {
      for (let t = tIdx; t < bestMatchTargetIdx; t++) {
        results.push({
          op: "DELETE",
          char: wordTarget[t],
          targetChar: wordTarget[t],
          targetIndex: targetOffset + t,
        });
      }
    }

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
    if (tIdx < wordTarget.length) {
      results.push({
        op: "REPLACE",
        char: panicTyped,
        targetChar: wordTarget[tIdx],
        targetIndex: targetOffset + tIdx,
        inputIndex: qOffset + wordQwertyLength - 1,
      });
      for (let t = tIdx + 1; t < wordTarget.length; t++) {
        results.push({
          op: "DELETE",
          char: wordTarget[t],
          targetChar: wordTarget[t],
          targetIndex: targetOffset + t,
        });
      }
    } else {
      for (let i = 0; i < panicTyped.length; i++) {
        results.push({
          op: "INSERT",
          char: panicTyped[i],
          inputIndex: qOffset + qIdx + charToQwertyIdx[i],
        });
      }
    }
  }
}

export function runMvsa(
  targetText: string,
  qwertyBuffer: string,
  isKorean: boolean,
): AlignResult[] {
  const aligner = new MaximumValidSequenceAligner(targetText, qwertyBuffer, isKorean);
  return aligner.align();
}
