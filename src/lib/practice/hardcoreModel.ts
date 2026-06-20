import vocab from "./hardcore_vocab.json";
import weights from "./hardcore_weights.json";
import { assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import { isValidHangulSequence, PUNCTUATION_AND_SPACE, toJamo, isVowel } from "./hangulRules";

const KOREAN_TO_QWERTY_SHIFT: Record<string, string> = {
  ㅃ: "Q",
  ㅉ: "W",
  ㄸ: "E",
  ㄲ: "R",
  ㅆ: "T",
  ㅒ: "O",
  ㅖ: "P",
};

export interface HardcoreWeights {
  emb_matrix: number[][]; // V x 16
  w1: number[][]; // 96 x 64
  b1: number[]; // 64
  w2: number[][]; // 64 x V
  b2: number[]; // V
}

/**
 * Computes user weak keys based on recent typing history.
 * Returns an array of character IDs representing weak keys.
 */
export function getUserWeakKeys(): number[] {
  // TODO: Retrieve user keystroke logs from local storage or Zustand store
  // Calculate average latency / error rate for keys
  return []; // Return character IDs
}

/**
 * Runs MLP forward pass on given 6-character context.
 * Returns raw logits (length V).
 */
export function predictNextLogits(contextIds: number[], modelWeights: HardcoreWeights): number[] {
  const { emb_matrix, w1, b1, w2, b2 } = modelWeights;

  // 1. Embedding lookup & Flatten
  const embedsFlat: number[] = [];
  for (let i = 0; i < contextIds.length; i++) {
    const id = contextIds[i];
    // fallback if out of bounds (though should be handled)
    const emb = emb_matrix[id] || new Array(16).fill(0);
    embedsFlat.push(...emb);
  }

  // 2. Hidden Layer (z1 = embedsFlat * w1 + b1)
  const hiddenSize = b1.length;
  const h = new Array(hiddenSize).fill(0);
  for (let j = 0; j < hiddenSize; j++) {
    let sum = b1[j];
    for (let i = 0; i < embedsFlat.length; i++) {
      sum += embedsFlat[i] * w1[i][j];
    }
    // ReLU
    h[j] = Math.max(0, sum);
  }

  // 3. Output logits (logits = h * w2 + b2)
  const vocabSize = b2.length;
  const logits = new Array(vocabSize).fill(0);
  for (let j = 0; j < vocabSize; j++) {
    let sum = b2[j];
    for (let i = 0; i < hiddenSize; i++) {
      sum += h[i] * w2[i][j];
    }
    logits[j] = sum;
  }

  return logits;
}

/**
 * Blends predicted logits with user's weak keys.
 * Unifies operations strictly into English QWERTY space.
 */
export function blendLogits(
  logits: number[],
  weakKeys: number[],
  blendStrength: number = 2.0,
): number[] {
  const blended = [...logits];
  for (const keyId of weakKeys) {
    if (keyId >= 0 && keyId < blended.length) {
      const char = vocab[keyId];
      if (!char) continue;

      let targetId = keyId;

      // 만약 약한 키가 한글 쌍자음/쌍모음이면 대응되는 QWERTY 대문자로 완전히 치환 (영어 연산 통일)
      if (KOREAN_TO_QWERTY_SHIFT[char]) {
        const qwertyChar = KOREAN_TO_QWERTY_SHIFT[char];
        targetId = vocab.indexOf(qwertyChar);
      }

      if (targetId !== -1) {
        blended[targetId] += blendStrength;
      }
    }
  }
  return blended;
}

/**
 * Inverts logits to prioritize rare transitions (rare = higher logit value).
 */
export function invertLogits(logits: number[]): number[] {
  return logits.map((l) => -l);
}

/**
 * Applies rule-based masking on logits to prevent invalid combinations.
 * (e.g. no double spaces, invalid shift sequences, etc.)
 */
export function applyMask(
  generatedChars: string[],
  logits: number[],
  isLastChar: boolean = false,
): number[] {
  const masked = [...logits];
  const spaceId = vocab.indexOf(" ");

  const len = generatedChars.length;
  const prevChar = len > 0 ? generatedChars[len - 1] : " ";
  const prevPrevChar = len > 1 ? generatedChars[len - 2] : " ";
  const prevPrevPrevChar = len > 2 ? generatedChars[len - 3] : " ";

  // Rule 1: No double spaces
  if (prevChar === " " && spaceId !== -1) {
    masked[spaceId] = -Infinity;
  }

  // Rule 1.5: Punctuation (., ?, !) must be followed by a space
  const punctuationList = [",", ".", "?", "!"];
  if (punctuationList.includes(prevChar) && spaceId !== -1) {
    for (let i = 0; i < logits.length; i++) {
      if (i !== spaceId) {
        masked[i] = -Infinity;
      }
    }
    return masked;
  }

  // Rule 2: Hangul pairing validity rules (simplified)
  for (let i = 0; i < logits.length; i++) {
    const nextChar = vocab[i];
    if (nextChar) {
      if (!isValidHangulSequence(prevPrevChar, prevChar, nextChar, prevPrevPrevChar)) {
        masked[i] = -Infinity;
      }
    }
  }

  // Rule 3: If any of the last 6 generated characters is a space or punctuation, block next punctuation/space
  const last6 = generatedChars.slice(-6);
  const hasPunctInLast6 = last6.some((c) => PUNCTUATION_AND_SPACE.includes(c));
  if (hasPunctInLast6) {
    for (let i = 0; i < logits.length; i++) {
      const nextChar = vocab[i];
      if (nextChar && PUNCTUATION_AND_SPACE.includes(nextChar)) {
        masked[i] = -Infinity;
      }
    }
  }

  // Rule 4: 문장의 마지막 글자인 경우, 미완성 자모로 끝나지 않도록 제어
  // 이전 글자가 모음인 경우, 받침 불가 자음(ㅃ, ㅉ, ㄸ)이 오면 모음 결합 없이 끝나므로 차단
  if (isLastChar) {
    const prevCharJamo = toJamo(prevChar);
    if (isVowel(prevCharJamo)) {
      const noJongseongJamo = ["ㅃ", "ㅉ", "ㄸ"];
      for (let i = 0; i < logits.length; i++) {
        const nextChar = vocab[i];
        if (nextChar) {
          const nextJamo = toJamo(nextChar);
          if (noJongseongJamo.includes(nextJamo)) {
            masked[i] = -Infinity;
          }
        }
      }
    }
  }

  return masked;
}

/**
 * Samples next character ID from logits using Temperature, Top-K, Top-P, and Softmax.
 */
export function sampleNextId(
  logits: number[],
  temperature: number = 1.0,
  topK: number = 0,
  topP: number = 1.0,
  useSymmetricLog: boolean = true,
): number {
  let processedLogits = [...logits];

  // Apply Symmetric Log-Transform to dampen high values and increase diversity
  if (useSymmetricLog) {
    processedLogits = processedLogits.map((l) => {
      if (l === -Infinity) return -Infinity;
      return Math.sign(l) * Math.log(Math.abs(l) + 1);
    });
  }

  // 1. Apply temperature
  let tempLogits = processedLogits.map((l) => l / temperature);

  // 2. Top-K filtering
  if (topK > 0 && topK < tempLogits.length) {
    const sortedIndices = tempLogits
      .map((val, idx) => ({ val, idx }))
      .sort((a, b) => b.val - a.val);

    const kThreshold = sortedIndices[topK - 1].val;
    tempLogits = tempLogits.map((l) => (l < kThreshold ? -Infinity : l));
  }

  // 3. Softmax
  const maxLogit = Math.max(...tempLogits);
  const exps = tempLogits.map((l) => Math.exp(l - maxLogit));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  let probs = exps.map((e) => e / sumExps);

  // 4. Top-P (Nucleus) filtering
  if (topP > 0.0 && topP < 1.0) {
    const sortedProbs = probs.map((val, idx) => ({ val, idx })).sort((a, b) => b.val - a.val);

    let cumulativeProb = 0;
    const allowedIndices = new Set<number>();

    for (const item of sortedProbs) {
      allowedIndices.add(item.idx);
      cumulativeProb += item.val;
      if (cumulativeProb >= topP) {
        break;
      }
    }

    // Mask out non-allowed and re-normalize
    probs = probs.map((p, idx) => (allowedIndices.has(idx) ? p : 0));
    const newSum = probs.reduce((a, b) => a + b, 0);
    probs = probs.map((p) => (newSum > 0 ? p / newSum : 0));
  }

  // 5. Random sampling based on cumulative distribution
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i];
    if (r <= cumulative) {
      return i;
    }
  }
  return probs.length - 1; // Fallback
}

/**
 * Applies static logit biases to adjust the baseline frequency of specific characters.
 * Decreases probabilities of double consonants, complex vowels, and punctuations.
 * Increases probability of spaces.
 */
export function applyStaticBiases(logits: number[]): number[] {
  const biased = [...logits];

  // 1. 대문자(쌍자음 대응)에 강한 페널티 부여
  const penaltyChars = ["Q", "W", "E", "R", "T"];
  const penaltyValue = -10.0;

  for (const char of penaltyChars) {
    const id = vocab.indexOf(char);
    if (id !== -1) {
      biased[id] += penaltyValue;
    }
  }

  // 2. 특정 대문자(O, P)에 페널티 부여 (분리)
  const opPenaltyChars = ["O", "P"];
  const opPenaltyValue = -15.0;

  for (const char of opPenaltyChars) {
    const id = vocab.indexOf(char);
    if (id !== -1) {
      biased[id] += opPenaltyValue;
    }
  }

  // 3. 문장 부호(,, ., ?, !)에 더 강력한 페널티 부여 (분리)
  const punctuationPenaltyChars = [",", ".", "?", "!"];
  const punctuationPenaltyValue = -18.0;

  for (const char of punctuationPenaltyChars) {
    const id = vocab.indexOf(char);
    if (id !== -1) {
      biased[id] += punctuationPenaltyValue;
    }
  }

  // 2. 띄어쓰기(Space) 부스트 대폭 강화
  const spaceId = vocab.indexOf(" ");
  if (spaceId !== -1) {
    biased[spaceId] += 13.0; // 스페이스 부스트 강화
  }

  return biased;
}

/**
 * Generates a practice sentence for Hardcore Mode.
 * Sequence is generated using the MLP model and blended with weak keys,
 * then assembled into Korean syllables.
 */
export function generateHardcorePracticeText(length: number = 70): string {
  const spaceId = vocab.indexOf(" ") !== -1 ? vocab.indexOf(" ") : 0;

  // Initialize context with 6 spaces
  const contextIds: number[] = new Array(6).fill(spaceId);
  const generatedChars: string[] = [];

  const w = weights as HardcoreWeights;
  const weakKeys = getUserWeakKeys(); // currently returns []

  for (let step = 0; step < length; step++) {
    // 1. Predict raw logits
    let logits = predictNextLogits(contextIds, w);

    // 2. Invert logits to prioritize rare sequences
    logits = invertLogits(logits);

    // 3. Static logit biases (penalize shifts, boost space)
    logits = applyStaticBiases(logits);

    // 4. Blend user's weak keys (Hardcoded boost of 5.0 for now)
    logits = blendLogits(logits, weakKeys, 5.0);

    // 5. Rule-based Masking
    logits = applyMask(generatedChars, logits, step === length - 1);

    // 6. Sample next character ID
    const nextId = sampleNextId(logits, 2, 40, 0.9); // increased temperature, added Top-K/Top-P

    const nextChar = vocab[nextId] || " ";
    generatedChars.push(nextChar);

    // 6. Update rolling context window
    contextIds.shift();
    contextIds.push(nextId);
  }

  const generatedQwerty = generatedChars.join("");
  let result = assembleHangulWithPunctuation(generatedQwerty);

  // 마지막 글자가 완성되지 않은 단독 자음/모음인 경우 제거 (완성된 음절로 끝나도록 함)
  while (result.length > 0 && /[ㄱ-ㅎㅏ-ㅣ]/.test(result[result.length - 1])) {
    result = result.slice(0, -1);
  }

  return result;
}
