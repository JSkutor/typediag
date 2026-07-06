import { JasoAlignResult } from "./mvsaJasoCore";
import { AlignResult, AlignOp } from "./mvsa";
import { assembleHangulWithPunctuation } from "./keyboardMap";
import { getCharQwertyIndices } from "./mvsa";

export class MvsaAggregator {
  public aggregate(
    jasoResults: JasoAlignResult[],
    qwertyBuffer: string,
    targetText: string,
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

    const opPriority: Record<string, number> = {
      REPLACE: 5,
      INSERT: 4,
      PARTIAL: 3,
      EQUAL: 2,
      OMIT: 1,
      PENDING: 0,
    };

    for (const jRes of jasoResults) {
      if (
        jRes.inputIndex !== undefined &&
        jRes.inputIndex >= 0 &&
        jRes.inputIndex < qwertyBuffer.length
      ) {
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

    const vIndices = Array.from(vCharIdxToResult.keys()).sort((a, b) => a - b);
    let lastAssignedTIdx = -1;

    for (const vIdx of vIndices) {
      const existing = vCharIdxToResult.get(vIdx)!;
      const votes = vCharIdxToTargetVotes.get(vIdx);
      if (votes && votes.size > 0) {
        let maxTargetIndex = -1;
        let maxVotes = -1;
        for (const [tIdx, count] of votes.entries()) {
          if (count > maxVotes) {
            maxVotes = count;
            maxTargetIndex = tIdx;
          } else if (count === maxVotes && maxTargetIndex !== -1) {
            const tValid = tIdx > lastAssignedTIdx;
            const maxValid = maxTargetIndex > lastAssignedTIdx;

            let preferTIdx = false;
            if (tValid && !maxValid) {
              preferTIdx = true;
            } else if (!tValid && maxValid) {
              preferTIdx = false;
            } else if (tValid && maxValid) {
              preferTIdx = tIdx < maxTargetIndex;
            } else {
              preferTIdx = tIdx > maxTargetIndex;
            }

            if (preferTIdx) {
              maxTargetIndex = tIdx;
            }
          }
        }
        if (maxTargetIndex !== -1) {
          existing.targetIndex = maxTargetIndex;
          existing.targetChar = targetText[maxTargetIndex];
          if (existing.op === "INSERT") {
            existing.op = "REPLACE";
          }
          lastAssignedTIdx = maxTargetIndex;
        }
      }
    }

    const adoptedTargets = new Set<number>();
    for (const [, vRes] of vCharIdxToResult.entries()) {
      if (vRes.targetIndex !== undefined) adoptedTargets.add(vRes.targetIndex);
    }

    let maxAdoptedTIdx = -1;
    for (const tIdx of adoptedTargets) {
      if (tIdx > maxAdoptedTIdx) maxAdoptedTIdx = tIdx;
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
          const tJasos = jasoResults.filter((r) => r.targetVCharIndex === tIdx);
          let isPending = tJasos.length > 0 && tJasos.some((r) => r.op === "PENDING");

          // If a later target has been adopted by typed characters, this skipped target cannot be pending.
          if (isPending && tIdx < maxAdoptedTIdx) {
            isPending = false;
          }

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
            finalResults.push({ ...vRes, op: "INSERT" });
          } else {
            finalResults.push(vRes);
          }
          emittedVIdx.add(vIdx);
        }
      } else if (jRes.op === "INSERT" && jRes.inputIndex !== undefined) {
        // Fallback for inserts not caught
        const vIdx = qIdxToVCharIdx[jRes.inputIndex];
        if (vIdx !== -1 && !emittedVIdx.has(vIdx)) {
          finalResults.push({ ...vCharIdxToResult.get(vIdx)!, op: "INSERT" });
          emittedVIdx.add(vIdx);
        }
      }
    }

    return finalResults;
  }
}
