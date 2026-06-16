/**
 * Keyboard layout -> 2D physical coordinates. Port of `skdm/layout.py`.
 */

import { KEY_UNIT, ROW_HEIGHT_U, ROW_STAGGER_U } from "./config";
import type { KeyPosition } from "./types";

/** Analysis target rows. Row 0 = number row, 1 = qwerty, 2 = asdf, 3 = zxcv. */
export const DEFAULT_ROWS: string[][] = [
  "1234567890".split(""),
  "qwertyuiop".split(""),
  "asdfghjkl".split(""),
  ["z", "x", "c", "v", "b", "n", "m", "_dummy_comma"],
];

/**
 * Build the key -> KeyPosition map.
 *
 * x: column index * KEY_UNIT + cumulative row stagger.
 * y: flipped so the number row sits at the top (largest y).
 */
export function buildLayout(rows: string[][] = DEFAULT_ROWS): Record<string, KeyPosition> {
  const layout: Record<string, KeyPosition> = {};
  const nRows = rows.length;

  rows.forEach((rowKeys, rowIdx) => {
    const stagger = ROW_STAGGER_U[rowIdx] ?? 0.0;
    const y = (nRows - 1 - rowIdx) * ROW_HEIGHT_U;
    rowKeys.forEach((key, colIdx) => {
      const x = colIdx * KEY_UNIT + stagger;

      layout[key] = { key, row: rowIdx, col: colIdx, x, y };
    });
  });

  return layout;
}

/** Row index of a key, or -1 if not present. */
export function getRow(key: string, layout: Record<string, KeyPosition>): number {
  return layout[key]?.row ?? -1;
}
