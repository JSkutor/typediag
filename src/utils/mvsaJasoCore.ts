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
    
    return this.alignDynamicProgramming(targetTokens, inputChars);
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
      // es-hangul의 convertQwertyToAlphabet은 한글 자음/모음 외의 문자는 그대로 반환합니다.
      chars.push(convertQwertyToAlphabet(qwerty[i]));
    }
    return chars;
  }

  private alignDynamicProgramming(targetTokens: TargetToken[], inputChars: string[]): JasoAlignResult[] {
    const n = targetTokens.length;
    const m = inputChars.length;
    
    const dp: number[][] = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));
    const parent: {op: JasoAlignOp, i: number, j: number}[][] = Array(n + 1).fill(null).map(() => Array(m + 1).fill(null));

    for (let i = 1; i <= n; i++) {
      dp[i][0] = i; 
      parent[i][0] = { op: 'OMIT', i: i - 1, j: 0 };
    }
    for (let j = 1; j <= m; j++) {
      dp[0][j] = j; 
      parent[0][j] = { op: 'INSERT', i: 0, j: j - 1 };
    }

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const tChar = targetTokens[i - 1].char;
        const iChar = inputChars[j - 1];
        
        let costEQUAL = Infinity;
        let costREPLACE = Infinity;
        
        if (tChar === iChar) {
          costEQUAL = dp[i - 1][j - 1];
        } else {
          costREPLACE = dp[i - 1][j - 1] + 1;
        }
        
        const costOMIT = dp[i - 1][j] + 1;
        const costINSERT = dp[i][j - 1] + 1;
        
        const minCost = Math.min(costEQUAL, costREPLACE, costOMIT, costINSERT);
        dp[i][j] = minCost;
        
        if (minCost === costOMIT) {
          parent[i][j] = { op: 'OMIT', i: i - 1, j: j };
        } else if (minCost === costINSERT) {
          parent[i][j] = { op: 'INSERT', i: i, j: j - 1 };
        } else if (minCost === costEQUAL) {
          parent[i][j] = { op: 'EQUAL', i: i - 1, j: j - 1 };
        } else {
          parent[i][j] = { op: 'REPLACE', i: i - 1, j: j - 1 };
        }
      }
    }

    const results: JasoAlignResult[] = [];
    let i = n;
    let j = m;
    
    while (i > 0 || j > 0) {
      const p = parent[i][j];
      if (p.op === 'EQUAL' || p.op === 'REPLACE') {
        results.push({
          op: p.op,
          char: inputChars[j - 1],
          targetChar: targetTokens[i - 1].char,
          targetJasoIndex: targetTokens[i - 1].jasoIndex,
          targetVCharIndex: targetTokens[i - 1].vCharIndex,
          inputIndex: j - 1
        });
        i--;
        j--;
      } else if (p.op === 'OMIT') {
        const isPending = (j === m);
        results.push({
          op: isPending ? 'PENDING' : 'OMIT',
          char: "",
          targetChar: targetTokens[i - 1].char,
          targetJasoIndex: targetTokens[i - 1].jasoIndex,
          targetVCharIndex: targetTokens[i - 1].vCharIndex
        });
        i--;
      } else if (p.op === 'INSERT') {
        results.push({
          op: 'INSERT',
          char: inputChars[j - 1],
          inputIndex: j - 1
        });
        j--;
      }
    }
    
    results.reverse();
    return results;
  }
}
