import vocab from "./hardcore_vocab.json";
import weights from "./hardcore_weights.json";
import { assembleHangulWithPunctuation } from "@/utils/keyboardMap";

export interface HardcoreWeights {
  emb_matrix: number[][]; // V x 16
  w1: number[][];         // 96 x 64
  b1: number[];           // 64
  w2: number[][];         // 64 x V
  b2: number[];           // V
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
export function blendLogits(logits: number[], weakKeys: number[], blendStrength: number = 2.0): number[] {
  // TODO: Increase logit values for user's weak keys
  return logits;
}

/**
 * Inverts logits to prioritize rare transitions (rare = higher logit value).
 */
export function invertLogits(logits: number[]): number[] {
  // TODO: Invert logits (e.g., logits * -1.0)
  return logits;
}

/**
 * Applies rule-based masking on logits to prevent invalid combinations.
 * (e.g. no double spaces, invalid shift sequences, etc.)
 */
export function applyMask(prevChar: string, logits: number[]): number[] {
  // TODO: Set logits of invalid characters to -Infinity
  return logits;
}

/**
 * Samples next character ID from logits using Softmax and Top-K/Top-P.
 */
export function sampleNextId(logits: number[], temperature: number = 1.0): number {
  // TODO: Softmax -> Cumulative distribution -> Random sampling
  return 0; // Return index
}

/**
 * Generates a practice sentence for Hardcore Mode.
 * Sequence is generated using the MLP model and blended with weak keys,
 * then assembled into Korean syllables.
 */
export function generateHardcorePracticeText(length: number = 30): string {
  // TODO: Start with space padding context: [0, 0, 0, 0, 0, 0]
  // Loop to generate 'length' character IDs
  // Map back to QWERTY chars
  // Call assembleHangulWithPunctuation
  const mockQwerty = "sachojeojuhy jayeop napeun jarobya nyaquae"; // "나채저주히 자옆 나픈 자로뱌 냐캐"
  return assembleHangulWithPunctuation(mockQwerty);
}
