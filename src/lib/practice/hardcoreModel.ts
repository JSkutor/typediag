import vocab from "./hardcore_vocab.json";
import weights from "./hardcore_weights.json";
import { assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import { isValidHangulSequence } from "./hangulRules";

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
 */
export function blendLogits(
  logits: number[],
  weakKeys: number[],
  blendStrength: number = 2.0,
): number[] {
  const blended = [...logits];
  for (const keyId of weakKeys) {
    if (keyId >= 0 && keyId < blended.length) {
      blended[keyId] += blendStrength;

      // 만약 약한 키가 한글 쌍자음/쌍모음이면 대응되는 QWERTY 대문자에도 부스트 적용
      const char = vocab[keyId];
      if (char && KOREAN_TO_QWERTY_SHIFT[char]) {
        const qwertyChar = KOREAN_TO_QWERTY_SHIFT[char];
        const qwertyId = vocab.indexOf(qwertyChar);
        if (qwertyId !== -1) {
          blended[qwertyId] += blendStrength;
        }
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
export function applyMask(generatedChars: string[], logits: number[]): number[] {
  const masked = [...logits];
  const spaceId = vocab.indexOf(" ");

  const len = generatedChars.length;
  const prevChar = len > 0 ? generatedChars[len - 1] : " ";
  const prevPrevChar = len > 1 ? generatedChars[len - 2] : " ";

  // Rule 1: No double spaces
  if (prevChar === " " && spaceId !== -1) {
    masked[spaceId] = -Infinity;
  }

  // Rule 2: Hangul pairing validity rules (simplified)
  for (let i = 0; i < logits.length; i++) {
    const nextChar = vocab[i];
    if (nextChar && nextChar !== " ") {
      if (!isValidHangulSequence(prevPrevChar, prevChar, nextChar)) {
        masked[i] = -Infinity;
      }
    }
  }

  return masked;
}

/**
 * Samples next character ID from logits using Softmax and Top-K/Top-P.
 */
export function sampleNextId(logits: number[], temperature: number = 1.0): number {
  // Apply temperature
  const tempLogits = logits.map((l) => l / temperature);

  // Softmax
  const maxLogit = Math.max(...tempLogits);
  const exps = tempLogits.map((l) => Math.exp(l - maxLogit));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / sumExps);

  // Random sampling based on cumulative distribution
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
 * Generates a practice sentence for Hardcore Mode.
 * Sequence is generated using the MLP model and blended with weak keys,
 * then assembled into Korean syllables.
 */
export function generateHardcorePracticeText(length: number = 30): string {
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

    // 3. Blend user's weak keys (Hardcoded boost of 5.0 for now)
    logits = blendLogits(logits, weakKeys, 5.0);

    // 4. Rule-based Masking
    logits = applyMask(generatedChars, logits);

    // 5. Sample next character ID
    const nextId = sampleNextId(logits, 1.2); // slight temperature bump for variety

    const nextChar = vocab[nextId] || " ";
    generatedChars.push(nextChar);

    // 6. Update rolling context window
    contextIds.shift();
    contextIds.push(nextId);
  }

  const generatedQwerty = generatedChars.join("");
  return assembleHangulWithPunctuation(generatedQwerty);
}
