/**
 * Keyboard metadata for QWERTY layout analysis.
 *
 * Each alphabetic key (a–z) is annotated with:
 *   - row: physical row (1 = top/qwerty, 2 = home/asdf, 3 = bottom/zxcv)
 *   - hand: "L" (left) | "R" (right)
 *   - finger: "pinky" | "ring" | "middle" | "index"
 *   - shiftCombinable: true if the key produces a different character
 *     when combined with Shift in Korean input (쌍자음/쌍모음).
 *
 * NOTE: 'b' is mapped to Right hand (index) per Korean typing convention.
 */

export type Hand = "L" | "R";
export type Finger = "pinky" | "ring" | "middle" | "index";

export interface KeyMeta {
  key: string;
  row: number;
  hand: Hand;
  finger: Finger;
  /** Korean Shift produces a distinct character (e.g. ㅂ→ㅃ, ㅈ→ㅉ). */
  shiftCombinable: boolean;
}

/**
 * Full metadata map for 26 alphabetic keys.
 *
 * Korean Shift-combinable keys (쌍자음/쌍모음):
 *   q(ㅂ→ㅃ), w(ㅈ→ㅉ), e(ㄷ→ㄸ), r(ㄱ→ㄲ), t(ㅅ→ㅆ), o(ㅐ→ㅒ), p(ㅔ→ㅖ)
 */
export const KEYBOARD_META: Record<string, KeyMeta> = {
  // --- Row 1 (Top / QWERTY row) ---
  q: { key: "q", row: 1, hand: "L", finger: "pinky",  shiftCombinable: true  }, // ㅂ→ㅃ
  w: { key: "w", row: 1, hand: "L", finger: "ring",   shiftCombinable: true  }, // ㅈ→ㅉ
  e: { key: "e", row: 1, hand: "L", finger: "middle", shiftCombinable: true  }, // ㄷ→ㄸ
  r: { key: "r", row: 1, hand: "L", finger: "index",  shiftCombinable: true  }, // ㄱ→ㄲ
  t: { key: "t", row: 1, hand: "L", finger: "index",  shiftCombinable: true  }, // ㅅ→ㅆ
  y: { key: "y", row: 1, hand: "R", finger: "index",  shiftCombinable: false },
  u: { key: "u", row: 1, hand: "R", finger: "index",  shiftCombinable: false },
  i: { key: "i", row: 1, hand: "R", finger: "middle", shiftCombinable: false },
  o: { key: "o", row: 1, hand: "R", finger: "ring",   shiftCombinable: true  }, // ㅐ→ㅒ
  p: { key: "p", row: 1, hand: "R", finger: "pinky",  shiftCombinable: true  }, // ㅔ→ㅖ

  // --- Row 2 (Home / ASDF row) ---
  a: { key: "a", row: 2, hand: "L", finger: "pinky",  shiftCombinable: false },
  s: { key: "s", row: 2, hand: "L", finger: "ring",   shiftCombinable: false },
  d: { key: "d", row: 2, hand: "L", finger: "middle", shiftCombinable: false },
  f: { key: "f", row: 2, hand: "L", finger: "index",  shiftCombinable: false },
  g: { key: "g", row: 2, hand: "L", finger: "index",  shiftCombinable: false },
  h: { key: "h", row: 2, hand: "R", finger: "index",  shiftCombinable: false },
  j: { key: "j", row: 2, hand: "R", finger: "index",  shiftCombinable: false },
  k: { key: "k", row: 2, hand: "R", finger: "middle", shiftCombinable: false },
  l: { key: "l", row: 2, hand: "R", finger: "ring",   shiftCombinable: false },

  // --- Row 3 (Bottom / ZXCV row) ---
  z: { key: "z", row: 3, hand: "L", finger: "pinky",  shiftCombinable: false },
  x: { key: "x", row: 3, hand: "L", finger: "ring",   shiftCombinable: false },
  c: { key: "c", row: 3, hand: "L", finger: "middle", shiftCombinable: false },
  v: { key: "v", row: 3, hand: "L", finger: "index",  shiftCombinable: false },
  b: { key: "b", row: 3, hand: "R", finger: "index",  shiftCombinable: false }, // 한국 타이핑 관습: 오른손
  n: { key: "n", row: 3, hand: "R", finger: "index",  shiftCombinable: false },
  m: { key: "m", row: 3, hand: "R", finger: "index",  shiftCombinable: false },
};

/** Convenience lookup: get hand for a key (lowercase). Returns null for non-alpha. */
export function getHand(key: string): Hand | null {
  return KEYBOARD_META[key.toLowerCase()]?.hand ?? null;
}

/** Convenience lookup: get finger for a key (lowercase). Returns null for non-alpha. */
export function getFinger(key: string): Finger | null {
  return KEYBOARD_META[key.toLowerCase()]?.finger ?? null;
}

/** Convenience lookup: get row for a key (lowercase). Returns -1 for non-alpha. */
export function getMetaRow(key: string): number {
  return KEYBOARD_META[key.toLowerCase()]?.row ?? -1;
}

/** Check if a key supports Shift combination in Korean layout. */
export function isShiftCombinable(key: string): boolean {
  return KEYBOARD_META[key.toLowerCase()]?.shiftCombinable ?? false;
}
