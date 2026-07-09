import { disassemble, convertQwertyToAlphabet, assemble } from "es-hangul";
import { JasoSequenceAligner, JasoMvsaCache } from "./mvsaCore";
import { MvsaAggregator } from "./mvsaAggregator";

export type AlignOp = "EQUAL" | "PARTIAL" | "REPLACE" | "INSERT" | "OMIT" | "PENDING";

export interface AlignResult {
  op: AlignOp;
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
        let assembled = "";
        try {
          assembled = assemble(jamoBuffer);
        } catch (e) {
          assembled = jamoBuffer.join("");
        }
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
    let assembled = "";
    try {
      assembled = assemble(jamoBuffer);
    } catch (e) {
      assembled = jamoBuffer.join("");
    }
    for (const assembledChar of assembled) {
      const dis = disassemble(assembledChar);
      jamoStartIdx += dis.length;
      indices.push(jamoStartIdx - 1);
    }
  }

  return indices;
}

export function runEnglishMvsa(targetText: string, qwertyBuffer: string): AlignResult[] {
  const result: AlignResult[] = [];
  const len = Math.max(targetText.length, qwertyBuffer.length);
  for (let i = 0; i < len; i++) {
    if (i < targetText.length && i < qwertyBuffer.length) {
      result.push({
        op: targetText[i] === qwertyBuffer[i] ? "EQUAL" : "REPLACE",
        char: qwertyBuffer[i],
        targetChar: targetText[i],
        targetIndex: i,
        inputIndex: i,
      });
    } else if (i < targetText.length) {
      result.push({
        op: "PENDING",
        char: "",
        targetChar: targetText[i],
        targetIndex: i,
      });
    } else {
      result.push({ op: "INSERT", char: qwertyBuffer[i], inputIndex: i });
    }
  }
  return result;
}

export function runMvsa(
  targetText: string,
  qwertyBuffer: string,
  isKorean: boolean,
  cache?: JasoMvsaCache,
): AlignResult[] {
  if (!isKorean) {
    return runEnglishMvsa(targetText, qwertyBuffer);
  }

  const jasoAligner = new JasoSequenceAligner(targetText, qwertyBuffer, cache);
  const jasoResults = jasoAligner.align();

  const aggregator = new MvsaAggregator();
  return aggregator.aggregate(jasoResults, qwertyBuffer, targetText);
}
