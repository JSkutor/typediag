import vocab from "./hardcore_vocab.json";
import weights from "./hardcore_weights.json";
import { assembleHangulWithPunctuation } from "@/utils/keyboardMap";

export interface HardcoreWeights {
  emb_matrix: number[][]; // V x 16
  w1: number[][];         // 80 x 64
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
 * Runs MLP forward pass on given 5-character context.
 * Returns raw logits (length V).
 */
export function predictNextLogits(contextIds: number[], modelWeights: HardcoreWeights): number[] {
  // TODO: Embed contextIds -> Flatten -> Hidden Layer with ReLU -> Output logits
  return new Array(vocab.length).fill(0);
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
  // TODO: Start with space padding context: [0, 0, 0, 0, 0]
  // Loop to generate 'length' character IDs
  // Map back to QWERTY chars
  // Call assembleHangulWithPunctuation
  const mockQwerty = "sachojeojuhy jayeop napeun jarobya nyaquae"; // "나채저주히 자옆 나픈 자로뱌 냐캐"
  return assembleHangulWithPunctuation(mockQwerty);
}
