import { JasoAlignResult } from "./mvsaJasoCore";
import { AlignResult, AlignOp } from "./mvsa";
import { assembleHangulWithPunctuation } from "./keyboardMap";
import { getCharQwertyIndices } from "./mvsa";

export class MvsaAggregator {
  public aggregate(
    jasoResults: JasoAlignResult[],
    qwertyBuffer: string,
    targetText: string
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

    const vCharIdxToTargetVotes = new Map<number, Map<number, number>>();
    const vCharIdxToResult = new Map<number, AlignResult>();
    
    const opPriority: Record<string, number> = { REPLACE: 5, INSERT: 4, PARTIAL: 3, EQUAL: 2, OMIT: 1, PENDING: 0 };

    for (const jRes of jasoResults) {
      if (jRes.inputIndex !== undefined && jRes.inputIndex >= 0 && jRes.inputIndex < qwertyBuffer.length) {
        const vIdx = qIdxToVCharIdx[jRes.inputIndex];
        if (vIdx !== -1) {
          if (jRes.targetVCharIndex !== undefined) {
            let votes = vCharIdxToTargetVotes.get(vIdx);
            if (!votes) {
              votes = new Map<number, number>();
              vCharIdxToTargetVotes.set(vIdx, votes);
            }
            votes.set(jRes.targetVCharIndex, (votes.get(jRes.targetVCharIndex) || 0) + 1);
          }

          if (!vCharIdxToResult.has(vIdx)) {
            vCharIdxToResult.set(vIdx, {
              op: jRes.op as AlignOp,
              char: typedChars[vIdx],
              inputIndex: qEnds[vIdx],
            });
          } else {
            const existing = vCharIdxToResult.get(vIdx)!;
            if (opPriority[jRes.op] > opPriority[existing.op]) {
              existing.op = jRes.op as AlignOp;
            }
            existing.inputIndex = Math.max(existing.inputIndex!, qEnds[vIdx]);
          }
        }
      }
    }

    for (const [vIdx, existing] of vCharIdxToResult.entries()) {
      const votes = vCharIdxToTargetVotes.get(vIdx);
      if (votes && votes.size > 0) {
        let maxTargetIndex = -1;
        let maxVotes = -1;
        for (const [tIdx, count] of votes.entries()) {
          if (count > maxVotes || (count === maxVotes && tIdx > maxTargetIndex)) {
            maxVotes = count;
            maxTargetIndex = tIdx;
          }
        }
        if (maxTargetIndex !== -1) {
          existing.targetIndex = maxTargetIndex;
          existing.targetChar = targetText[maxTargetIndex];
          if (existing.op === "INSERT") {
            existing.op = "REPLACE";
          }
        }
      }
    }

    const adoptedTargets = new Set<number>();
    for (const [, vRes] of vCharIdxToResult.entries()) {
      if (vRes.targetIndex !== undefined) adoptedTargets.add(vRes.targetIndex);
    }

    const uniqueTargetIndices = [...new Set(jasoResults.filter(r => r.targetVCharIndex !== undefined).map(r => r.targetVCharIndex!))].sort((a, b) => a - b);
    const sortedVIdxEntries = [...vCharIdxToResult.entries()].sort((a, b) => a[0] - b[0]);

    for (const unadoptedTIdx of uniqueTargetIndices) {
      if (adoptedTargets.has(unadoptedTIdx)) continue;
      for (let vi = 0; vi < sortedVIdxEntries.length; vi++) {
        const [, vRes] = sortedVIdxEntries[vi];
        if (vRes.targetIndex === undefined) continue;
        if (vRes.targetIndex > unadoptedTIdx) {
          if (vRes.char === vRes.targetChar) break;
          const prevVIdx = vi > 0 ? sortedVIdxEntries[vi - 1] : null;
          const prevTIdx = prevVIdx ? prevVIdx[1].targetIndex : undefined;
          if (prevTIdx === undefined || prevTIdx < unadoptedTIdx) {
            vRes.targetIndex = unadoptedTIdx;
            vRes.targetChar = targetText[unadoptedTIdx];
            vRes.op = "REPLACE"; 
            adoptedTargets.add(unadoptedTIdx);
            break;
          }
        }
      }
    }

    for (const [vIdx, existing] of vCharIdxToResult.entries()) {
      if (existing.targetChar && existing.char === existing.targetChar) {
        existing.op = "EQUAL";
      } else if (existing.targetChar && existing.op === "EQUAL") {
        existing.op = "PARTIAL"; 
      }
      if (existing.op === "PARTIAL" && vIdx < typedChars.length - 1) {
        existing.op = "REPLACE";
      }
    }

    const finalResults: AlignResult[] = [];
    const emittedVIdx = new Set<number>();
    const emittedTIdx = new Set<number>();

    for (const jRes of jasoResults) {
      if (jRes.targetVCharIndex !== undefined && !emittedTIdx.has(jRes.targetVCharIndex)) {
        const tIdx = jRes.targetVCharIndex;
        let adoptedVIdx = -1;
        for (const [vIdx, vRes] of vCharIdxToResult.entries()) {
          if (vRes.targetIndex === tIdx) {
            adoptedVIdx = vIdx;
            break;
          }
        }
        
        if (adoptedVIdx !== -1) {
          if (!emittedVIdx.has(adoptedVIdx)) {
            finalResults.push(vCharIdxToResult.get(adoptedVIdx)!);
            emittedVIdx.add(adoptedVIdx);
          }
        } else {
            const tJasos = jasoResults.filter(r => r.targetVCharIndex === tIdx);
            const isPending = tJasos.length > 0 && tJasos.every(r => r.op === "PENDING");
            finalResults.push({
              op: isPending ? "PENDING" : "OMIT",
              char: "",
              targetChar: targetText[tIdx],
              targetIndex: tIdx,
            });
        }
        emittedTIdx.add(tIdx);
      } else if (jRes.inputIndex !== undefined) {
        const vIdx = qIdxToVCharIdx[jRes.inputIndex];
        if (vIdx !== -1 && !emittedVIdx.has(vIdx)) {
            const vRes = vCharIdxToResult.get(vIdx)!;
            if (vRes.targetIndex === undefined) {
               finalResults.push({...vRes, op: "INSERT"});
            } else {
               finalResults.push(vRes);
            }
            emittedVIdx.add(vIdx);
        }
      } else if (jRes.op === "INSERT" && jRes.inputIndex !== undefined) {
        // Fallback for inserts not caught
        const vIdx = qIdxToVCharIdx[jRes.inputIndex];
        if (vIdx !== -1 && !emittedVIdx.has(vIdx)) {
            finalResults.push({...vCharIdxToResult.get(vIdx)!, op: "INSERT"});
            emittedVIdx.add(vIdx);
        }
      }
    }

    return finalResults;
  }
}
