export const LINE_WRAP_TOP_THRESHOLD = 5;
export const LINE_WRAP_LEFT_THRESHOLD = 2;

type AlignmentLike = {
  targetChar?: string;
  char?: string;
};

export function isAlignmentSpace(d: AlignmentLike): boolean {
  return d.targetChar === " " || (d.targetChar === undefined && d.char === " ");
}

export function isVisualLineStart(
  index: number,
  tops: readonly number[],
  lefts: readonly number[],
): boolean {
  if (index <= 0) return false;

  return (
    tops[index] > tops[index - 1] + LINE_WRAP_TOP_THRESHOLD ||
    lefts[index] + LINE_WRAP_LEFT_THRESHOLD < lefts[index - 1]
  );
}

/** Spaces that wrapped alone to the start of a new visual line. */
export function findLineStartSpaceIndices(
  tops: readonly number[],
  lefts: readonly number[],
  isSpace: readonly boolean[],
): number[] {
  const result: number[] = [];

  for (let i = 1; i < tops.length; i++) {
    if (!isSpace[i]) continue;
    if (isVisualLineStart(i, tops, lefts)) {
      result.push(i);
    }
  }

  return result;
}

/**
 * When the active character is a space at a line boundary, show the cursor on the
 * next character (left side) instead of after the space (right side).
 */
export function computeCursorJumpIndex(
  lastInputIndex: number,
  tops: readonly number[],
  lefts: readonly number[],
  isSpace: readonly boolean[],
): number | null {
  if (lastInputIndex < 0 || !isSpace[lastInputIndex]) return null;
  if (lastInputIndex >= tops.length - 1) return null;

  const nextIndex = lastInputIndex + 1;

  if (isVisualLineStart(lastInputIndex, tops, lefts)) {
    return nextIndex;
  }

  if (isVisualLineStart(nextIndex, tops, lefts)) {
    return nextIndex;
  }

  return null;
}

export function formatPracticeChar(char: string | undefined, hideWrapSpace: boolean): string {
  if (!char) return "";
  if (hideWrapSpace && char === " ") return "";
  return char === " " ? "\u00A0" : char;
}

export type PracticeWordGroup = {
  items: { index: number }[];
};

/**
 * Groups characters so each inter-word space stays attached to the preceding word.
 * Line breaks then occur between word wrappers, not before orphaned spaces.
 */
export function lineStartIndicesEqual(
  current: ReadonlySet<number>,
  next: readonly number[],
): boolean {
  if (current.size !== next.length) return false;
  for (const index of next) {
    if (!current.has(index)) return false;
  }
  return true;
}

export function buildPracticeWordGroups(diffResult: readonly AlignmentLike[]): PracticeWordGroup[] {
  const groups: PracticeWordGroup[] = [];
  let currentItems: { index: number }[] = [];

  const flush = () => {
    if (currentItems.length > 0) {
      groups.push({ items: currentItems });
      currentItems = [];
    }
  };

  diffResult.forEach((d, i) => {
    const item = { index: i };

    if (isAlignmentSpace(d)) {
      currentItems.push(item);
      return;
    }

    const lastItem = currentItems[currentItems.length - 1];
    const hasTrailingSpace = lastItem !== undefined && isAlignmentSpace(diffResult[lastItem.index]);
    const hasOnlySpaces =
      currentItems.length > 0 &&
      currentItems.every(({ index }) => isAlignmentSpace(diffResult[index]));

    if (hasTrailingSpace || hasOnlySpaces) {
      flush();
    }

    currentItems.push(item);
  });

  flush();
  return groups;
}
