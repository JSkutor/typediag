import { disassemble, assemble } from "es-hangul";

export type DiffOp = "EQUAL" | "INSERT" | "DELETE" | "PARTIAL" | "REPLACE";

export interface DiffResult {
  op: DiffOp;
  char: string;
  targetChar?: string;
  targetIndex?: number;
  inputIndex?: number;
}

export function computeDiff(target: string, input: string): DiffResult[] {
  const n = target.length;
  const m = input.length;
  
  // dp[i][j] stores the length of LCS of target[0..i-1] and input[0..j-1]
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  
  const isMatch = (t: string, i: string, isLastInput: boolean) => {
    if (t === i) return true;
    if (isLastInput) {
      const isTHangul = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(t);
      const isIHangul = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(i);
      if (isTHangul && isIHangul) {
        if (disassemble(t).startsWith(disassemble(i))) {
          return true;
        }
      }
    }
    return false;
  };

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (isMatch(target[i - 1], input[j - 1], j === m)) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the diff
  const result: DiffResult[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && isMatch(target[i - 1], input[j - 1], j === m)) {
      const isPartial = target[i - 1] !== input[j - 1];
      result.unshift({
        op: isPartial ? "PARTIAL" : "EQUAL",
        char: input[j - 1],
        targetChar: target[i - 1],
        targetIndex: i - 1,
        inputIndex: j - 1,
      });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
      result.unshift({
        op: "DELETE",
        char: target[i - 1],
        targetChar: target[i - 1],
        targetIndex: i - 1,
      });
      i--;
    } else if (j > 0 && (i === 0 || dp[i - 1][j] < dp[i][j - 1])) {
      result.unshift({
        op: "INSERT",
        char: input[j - 1],
        inputIndex: j - 1,
      });
      j--;
    }
  }

  return result;
}

export function optimizeDiff(diffs: DiffResult[], targetText: string = ""): DiffResult[] {
  const optimized: DiffResult[] = [];
  for (let i = 0; i < diffs.length; i++) {
    const cur = diffs[i];
    const next = diffs[i + 1];
    
    if (cur.op === "INSERT" && next?.op === "DELETE") {
      optimized.push({
        op: "REPLACE",
        char: cur.char,
        targetChar: next.targetChar || next.char,
        targetIndex: next.targetIndex,
        inputIndex: cur.inputIndex,
      });
      i++; // skip next
    } else if (cur.op === "DELETE" && next?.op === "INSERT") {
      optimized.push({
        op: "REPLACE",
        char: next.char,
        targetChar: cur.targetChar || cur.char,
        targetIndex: cur.targetIndex,
        inputIndex: next.inputIndex,
      });
      i++; // skip next
    } else {
      optimized.push(cur);
    }
  }

  // Handle Korean carry-over split (e.g. "가나" typed as "간" -> "가" + "ㄴ")
  if (targetText.length > 0) {
    const lastInputIdx = optimized.findLastIndex(d => d.inputIndex !== undefined);
    if (lastInputIdx >= 0) {
      const lastNode = optimized[lastInputIdx];
      if (lastNode.op === "REPLACE" && lastNode.targetChar) {
        const typedChar = lastNode.char;
        const targetChar = lastNode.targetChar;
        const isTypedHangul = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(typedChar);
        const isTargetHangul = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(targetChar);
        if (isTypedHangul && isTargetHangul) {
          const typedDis = disassemble(typedChar);
          const targetDis = disassemble(targetChar);
          if (typedDis.startsWith(targetDis)) {
            const leftover = typedDis.slice(targetDis.length);
            const targetIndex = lastNode.targetIndex!;
            if (leftover.length > 0 && targetIndex + 1 < targetText.length) {
              const nextTargetChar = targetText[targetIndex + 1];
              const nextTargetDis = disassemble(nextTargetChar);
              if (nextTargetDis.startsWith(leftover)) {
                // Carry-over split!
                optimized[lastInputIdx] = {
                  op: "EQUAL",
                  char: targetChar,
                  targetChar: targetChar,
                  targetIndex: targetIndex,
                  inputIndex: lastNode.inputIndex,
                };
                
                if (lastInputIdx + 1 < optimized.length && optimized[lastInputIdx + 1].op === "DELETE") {
                  optimized[lastInputIdx + 1] = {
                    op: "PARTIAL",
                    char: assemble(leftover.split("")),
                    targetChar: nextTargetChar,
                    targetIndex: targetIndex + 1,
                    inputIndex: lastNode.inputIndex,
                  };
                }
              }
            }
          }
        }
      }
    }
  }

  return optimized;
}
