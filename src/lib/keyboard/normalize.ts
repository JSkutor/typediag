/**
 * Normalize a physical `KeyboardEvent.code` to an SKDM layout token.
 *
 * We key off `code` (physical position) rather than `key` (the IME-composed
 * character) so Korean Hangul composition never affects measurement — a 'q'
 * physical press is always recorded as "q" regardless of the jamo produced.
 *
 * Returns `null` for keys outside the analysed set (modifiers, Enter, Tab, ...).
 */
export function normalizeCode(code: string): string | null {
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1].toLowerCase();

  const digit = /^Digit([0-9])$/.exec(code);
  if (digit) return digit[1];

  switch (code) {
    case "Backspace":
      return "backspace";
    case "Space":
      return "space";
    case "Comma":
      return ",";
    case "Period":
      return ".";
    default:
      return null;
  }
}
