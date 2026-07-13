"use client";

import React from "react";
import type { AlignResult } from "@/utils/mvsa";
import { formatPracticeChar } from "./practiceTextLayout";

export type PracticeCharProps = {
  index: number;
  alignment: AlignResult;
  isWrapHiddenSpace: boolean;
  showCursorLeft: boolean;
  showCursorRight: boolean;
  isDuplicateTarget?: boolean;
};

function getHighlightClass(alignment: AlignResult): string {
  let highlightClass = "";
  if (alignment.op === "EQUAL" || alignment.op === "PARTIAL") {
    highlightClass = "text-char-primary";
  } else if (alignment.op === "INSERT" || alignment.op === "REPLACE") {
    highlightClass = "text-char-error text-char-error-dim";
  }

  if (alignment.op === "INSERT" && alignment.char === " ") {
    highlightClass += " text-char-space-error";
  }

  return highlightClass;
}

function practiceCharPropsAreEqual(prev: PracticeCharProps, next: PracticeCharProps): boolean {
  if (
    prev.index !== next.index ||
    prev.isWrapHiddenSpace !== next.isWrapHiddenSpace ||
    prev.showCursorLeft !== next.showCursorLeft ||
    prev.showCursorRight !== next.showCursorRight ||
    prev.isDuplicateTarget !== next.isDuplicateTarget
  ) {
    return false;
  }

  const prevAlignment = prev.alignment;
  const nextAlignment = next.alignment;
  return (
    prevAlignment.op === nextAlignment.op &&
    prevAlignment.char === nextAlignment.char &&
    prevAlignment.targetChar === nextAlignment.targetChar &&
    prevAlignment.inputIndex === nextAlignment.inputIndex &&
    prevAlignment.targetIndex === nextAlignment.targetIndex
  );
}

export const PracticeChar = React.memo(function PracticeChar({
  index,
  alignment,
  isWrapHiddenSpace,
  showCursorLeft,
  showCursorRight,
  isDuplicateTarget,
}: PracticeCharProps) {
  const isOmitted = alignment.op === "OMIT";
  const highlightClass = getHighlightClass(alignment);

  const showsTyped =
    alignment.op === "EQUAL" ||
    alignment.op === "PARTIAL" ||
    alignment.op === "REPLACE" ||
    alignment.op === "INSERT";

  return (
    <span
      id={`text-char-${index}`}
      className={`text-char-container${isWrapHiddenSpace ? " text-char-space-wrap-hidden" : ""}`}
    >
      {alignment.op !== "INSERT" && !isDuplicateTarget && (
        <span className={isOmitted ? "text-char-omitted" : "text-char-muted"}>
          {formatPracticeChar(alignment.targetChar, isWrapHiddenSpace)}
        </span>
      )}

      {showsTyped && (
        <span
          className={`${alignment.op !== "INSERT" && !isDuplicateTarget ? "text-char-overlay" : ""} ${highlightClass}`.trim()}
          style={
            alignment.op !== "INSERT" && !isDuplicateTarget
              ? { position: "absolute", inset: 0, display: "flex", alignItems: "center" }
              : undefined
          }
        >
          {formatPracticeChar(alignment.char, isWrapHiddenSpace)}
        </span>
      )}

      {showCursorLeft && <span className="typing-cursor left" />}
      {showCursorRight && <span className="typing-cursor right" />}
    </span>
  );
}, practiceCharPropsAreEqual);
