import { disassemble, convertQwertyToAlphabet } from "es-hangul";

export type JasoAlignOp = "EQUAL" | "REPLACE" | "INSERT" | "OMIT" | "PENDING";

export interface JasoAlignResult {
  op: JasoAlignOp;
  char: string;
  targetChar?: string;
  targetJasoIndex?: number;
  targetVCharIndex?: number;
  inputIndex?: number;
}

interface TargetToken {
  char: string;
  jasoIndex: number;
  vCharIndex: number;
}

export class JasoSequenceAligner {
  private targetText: string;
  private qwertyBuffer: string;

  constructor(targetText: string, qwertyBuffer: string) {
    this.targetText = targetText;
    this.qwertyBuffer = qwertyBuffer;
  }

  public align(): JasoAlignResult[] {
    const targetTokens = this.tokenizeTarget(this.targetText);
    const inputChars = this.tokenizeInput(this.qwertyBuffer);

    const results: JasoAlignResult[] = [];

    let tTokIdx = 0;
    let qIdx = 0;

    while (tTokIdx < targetTokens.length && qIdx < inputChars.length) {
      let endTTokIdx = tTokIdx;
      while (endTTokIdx < targetTokens.length && targetTokens[endTTokIdx].char !== " ") {
        endTTokIdx++;
      }

      let endQIdx = qIdx;
      while (endQIdx < inputChars.length && inputChars[endQIdx] !== " ") {
        endQIdx++;
      }

      const wordTargetTokens = targetTokens.slice(tTokIdx, endTTokIdx);
      const wordInputChars = inputChars.slice(qIdx, endQIdx);
      const isCompleted = endQIdx < inputChars.length;

      const wordResults = this.alignWordIncrementalHeuristic(
        wordTargetTokens,
        wordInputChars,
        qIdx,
        isCompleted,
      );
      results.push(...wordResults);

      tTokIdx = endTTokIdx;
      qIdx = endQIdx;

      if (
        tTokIdx < targetTokens.length &&
        targetTokens[tTokIdx].char === " " &&
        qIdx < inputChars.length &&
        inputChars[qIdx] === " "
      ) {
        results.push({
          op: "EQUAL",
          char: " ",
          targetChar: " ",
          targetJasoIndex: targetTokens[tTokIdx].jasoIndex,
          targetVCharIndex: targetTokens[tTokIdx].vCharIndex,
          inputIndex: qIdx,
        });
        tTokIdx++;
        qIdx++;
      } else if (tTokIdx < targetTokens.length && targetTokens[tTokIdx].char === " ") {
        const isPending = !isCompleted && qIdx === inputChars.length;
        results.push({
          op: isPending ? "PENDING" : "OMIT",
          char: "",
          targetChar: " ",
          targetJasoIndex: targetTokens[tTokIdx].jasoIndex,
          targetVCharIndex: targetTokens[tTokIdx].vCharIndex,
        });
        tTokIdx++;
      } else if (qIdx < inputChars.length && inputChars[qIdx] === " ") {
        results.push({
          op: "INSERT",
          char: " ",
          inputIndex: qIdx,
        });
        qIdx++;
      }
    }

    while (qIdx < inputChars.length) {
      results.push({
        op: "INSERT",
        char: inputChars[qIdx],
        inputIndex: qIdx,
      });
      qIdx++;
    }

    while (tTokIdx < targetTokens.length) {
      results.push({
        op: "PENDING",
        char: "",
        targetChar: targetTokens[tTokIdx].char,
        targetJasoIndex: targetTokens[tTokIdx].jasoIndex,
        targetVCharIndex: targetTokens[tTokIdx].vCharIndex,
      });
      tTokIdx++;
    }

    return results;
  }

  private tokenizeTarget(text: string): TargetToken[] {
    const tokens: TargetToken[] = [];
    let jasoIdx = 0;
    for (let vIdx = 0; vIdx < text.length; vIdx++) {
      const char = text[vIdx];
      if (char === " ") {
        tokens.push({ char: " ", jasoIndex: jasoIdx++, vCharIndex: vIdx });
      } else {
        const dis = disassemble(char);
        for (let i = 0; i < dis.length; i++) {
          tokens.push({ char: dis[i], jasoIndex: jasoIdx++, vCharIndex: vIdx });
        }
      }
    }
    return tokens;
  }

  private tokenizeInput(qwerty: string): string[] {
    const chars: string[] = [];
    for (let i = 0; i < qwerty.length; i++) {
      chars.push(convertQwertyToAlphabet(qwerty[i]));
    }
    return chars;
  }

  private alignWordIncrementalHeuristic(
    wordTargetTokens: TargetToken[],
    wordInputChars: string[],
    qOffset: number,
    isCompleted: boolean,
  ): JasoAlignResult[] {
    if (wordInputChars.length === 0) {
      return this.alignWordHeuristic(wordTargetTokens, [], qOffset, isCompleted);
    }

    let results: JasoAlignResult[] = [];

    for (let i = 1; i <= wordInputChars.length; i++) {
      const prefix = wordInputChars.slice(0, i);
      const isLast = i === wordInputChars.length && isCompleted;

      if (results.length === 0) {
        results = this.alignWordHeuristic(wordTargetTokens, prefix, qOffset, isLast);
        continue;
      }

      let lastEqualIdx = -1;
      for (let j = results.length - 1; j >= 0; j--) {
        if (results[j].op === "EQUAL") {
          lastEqualIdx = j;
          break;
        }
      }

      const confirmedResults = lastEqualIdx === -1 ? [] : results.slice(0, lastEqualIdx + 1);

      let confirmedTIdx = 0;
      let confirmedQIdx = 0;

      for (const r of confirmedResults) {
        if (r.inputIndex !== undefined) {
          const localQ = r.inputIndex - qOffset;
          if (localQ >= confirmedQIdx) {
            confirmedQIdx = localQ + 1;
          }
        }
        if (r.targetJasoIndex !== undefined && r.op !== "PENDING") {
          const localT = wordTargetTokens.findIndex((t) => t.jasoIndex === r.targetJasoIndex);
          if (localT !== -1 && localT >= confirmedTIdx) {
            confirmedTIdx = localT + 1;
          }
        }
      }

      const remainingTarget = wordTargetTokens.slice(confirmedTIdx);
      const remainingQwerty = prefix.slice(confirmedQIdx);

      let tailResults: JasoAlignResult[] = [];
      if (remainingTarget.length > 0 || remainingQwerty.length > 0) {
        tailResults = this.alignWordHeuristic(
          remainingTarget,
          remainingQwerty,
          qOffset + confirmedQIdx,
          isLast,
        );
      }

      results = [...confirmedResults, ...tailResults];
    }

    return results;
  }

  private alignWordHeuristic(
    wordTargetTokens: TargetToken[],
    wordInputChars: string[],
    qOffset: number,
    isCompleted: boolean,
  ): JasoAlignResult[] {
    const results: JasoAlignResult[] = [];
    let tIdx = 0;
    let qIdx = 0;

    while (tIdx < wordTargetTokens.length && qIdx < wordInputChars.length) {
      const tChar = wordTargetTokens[tIdx].char;
      const qChar = wordInputChars[qIdx];

      if (tChar === qChar) {
        results.push({
          op: "EQUAL",
          char: qChar,
          targetChar: tChar,
          targetJasoIndex: wordTargetTokens[tIdx].jasoIndex,
          targetVCharIndex: wordTargetTokens[tIdx].vCharIndex,
          inputIndex: qOffset + qIdx,
        });
        tIdx++;
        qIdx++;
      } else {
        const { newTIdx, newQIdx, panicResults } = this.runJasoPanicMode(
          wordTargetTokens,
          wordInputChars,
          tIdx,
          qIdx,
          qOffset,
        );
        results.push(...panicResults);
        tIdx = newTIdx;
        qIdx = newQIdx;
      }
    }

    while (qIdx < wordInputChars.length) {
      results.push({
        op: "INSERT",
        char: wordInputChars[qIdx],
        inputIndex: qOffset + qIdx,
      });
      qIdx++;
    }

    while (tIdx < wordTargetTokens.length) {
      const isPending = !isCompleted && qIdx === wordInputChars.length;
      results.push({
        op: isPending ? "PENDING" : "OMIT",
        char: "",
        targetChar: wordTargetTokens[tIdx].char,
        targetJasoIndex: wordTargetTokens[tIdx].jasoIndex,
        targetVCharIndex: wordTargetTokens[tIdx].vCharIndex,
      });
      tIdx++;
    }

    return results;
  }

  private runJasoPanicMode(
    wordTargetTokens: TargetToken[],
    wordInputChars: string[],
    tIdx: number,
    qIdx: number,
    qOffset: number,
  ) {
    const results: JasoAlignResult[] = [];
    const panicInputLen = wordInputChars.length - qIdx;

    // +1 Heuristic (Jamo count + 1)
    const maxLookahead = panicInputLen + 1;
    const targetLookaheadEnd = Math.min(wordTargetTokens.length, tIdx + maxLookahead);

    let matchFound = false;
    let bestMatchInputIdx = -1;
    let bestMatchTargetIdx = -1;

    // R2L Search
    for (let pIdx = wordInputChars.length - 1; pIdx >= qIdx && !matchFound; pIdx--) {
      const pChar = wordInputChars[pIdx];
      // Target search is also R2L to maximize REPLACE intent instead of INSERTs
      for (let lookTIdx = targetLookaheadEnd - 1; lookTIdx >= tIdx; lookTIdx--) {
        if (wordTargetTokens[lookTIdx].char === pChar) {
          matchFound = true;
          bestMatchInputIdx = pIdx;
          bestMatchTargetIdx = lookTIdx;
          break;
        }
      }
    }

    if (matchFound) {
      const M = bestMatchInputIdx - qIdx;
      const N = bestMatchTargetIdx - tIdx;
      const minLen = Math.min(M, N);

      for (let i = 0; i < minLen; i++) {
        results.push({
          op: "REPLACE",
          char: wordInputChars[qIdx + i],
          targetChar: wordTargetTokens[tIdx + i].char,
          targetJasoIndex: wordTargetTokens[tIdx + i].jasoIndex,
          targetVCharIndex: wordTargetTokens[tIdx + i].vCharIndex,
          inputIndex: qOffset + qIdx + i,
        });
      }

      for (let i = minLen; i < M; i++) {
        results.push({
          op: "INSERT",
          char: wordInputChars[qIdx + i],
          inputIndex: qOffset + qIdx + i,
        });
      }

      for (let i = minLen; i < N; i++) {
        results.push({
          op: "OMIT",
          char: "",
          targetChar: wordTargetTokens[tIdx + i].char,
          targetJasoIndex: wordTargetTokens[tIdx + i].jasoIndex,
          targetVCharIndex: wordTargetTokens[tIdx + i].vCharIndex,
        });
      }

      results.push({
        op: "EQUAL",
        char: wordInputChars[bestMatchInputIdx],
        targetChar: wordTargetTokens[bestMatchTargetIdx].char,
        targetJasoIndex: wordTargetTokens[bestMatchTargetIdx].jasoIndex,
        targetVCharIndex: wordTargetTokens[bestMatchTargetIdx].vCharIndex,
        inputIndex: qOffset + bestMatchInputIdx,
      });

      return {
        panicResults: results,
        newTIdx: bestMatchTargetIdx + 1,
        newQIdx: bestMatchInputIdx + 1,
      };
    } else {
      const targetCharsLen = wordTargetTokens.length - tIdx;
      const M = panicInputLen;
      const N = targetCharsLen;
      const minLen = Math.min(M, N);

      for (let i = 0; i < minLen; i++) {
        results.push({
          op: "REPLACE",
          char: wordInputChars[qIdx + i],
          targetChar: wordTargetTokens[tIdx + i].char,
          targetJasoIndex: wordTargetTokens[tIdx + i].jasoIndex,
          targetVCharIndex: wordTargetTokens[tIdx + i].vCharIndex,
          inputIndex: qOffset + qIdx + i,
        });
      }

      for (let i = minLen; i < M; i++) {
        results.push({
          op: "INSERT",
          char: wordInputChars[qIdx + i],
          inputIndex: qOffset + qIdx + i,
        });
      }

      return {
        panicResults: results,
        newTIdx: tIdx + minLen,
        newQIdx: qIdx + M,
      };
    }
  }
}
