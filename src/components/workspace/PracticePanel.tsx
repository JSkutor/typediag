"use client";

import React from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { runMvsa } from "@/utils/mvsa";

export const PracticePanel: React.FC = () => {
  const { targetText, qwertyBuffer, targetLanguage } = useTypingStore();

  const diffResult = React.useMemo(() => {
    const isKorean = targetLanguage === "ko" || /[가-힣]/.test(targetText);
    return runMvsa(targetText, qwertyBuffer, isKorean);
  }, [targetText, qwertyBuffer, targetLanguage]);

  const lastInputIndex = React.useMemo(() => {
    return diffResult.findLastIndex((d) => d.inputIndex !== undefined);
  }, [diffResult]);

  return (
    <div
      className="typing-area"
      style={{
        width: "100%",
        textAlign: "center",
        fontSize: "1.875rem",
        fontFamily: "var(--font-mono)",
        lineHeight: 1.625,
      }}
    >
      <div
        id="typing-text-container"
        className="typing-text-container inline-block text-left"
        style={{ maxWidth: "1024px" }}
        aria-live="polite"
        aria-atomic="true"
      >
        {diffResult.length === 0 && <span className="typing-cursor left" />}
        {diffResult.map((d, i) => {
          const isOmitted = d.op === "OMIT";

          let highlightClass = "";
          if (d.op === "EQUAL" || d.op === "PARTIAL") highlightClass = "text-char-primary";
          else if (d.op === "INSERT" || d.op === "REPLACE")
            highlightClass = "text-char-error opacity-80";

          if (d.op === "INSERT" && d.char === " ") {
            highlightClass += " border-b-4 border-red-500/70";
          }

          const showCursorRight = qwertyBuffer.length > 0 && i === lastInputIndex;
          const showCursorLeft = qwertyBuffer.length === 0 && i === 0;

          return (
            <span key={i} id={`text-char-${i}`} className="text-char-container relative">
              {d.op !== "INSERT" && (
                <span
                  className={`text-char-muted ${isOmitted ? "border-b-4 border-red-500/30" : ""}`}
                >
                  {d.targetChar === " " ? "\u00A0" : d.targetChar}
                </span>
              )}

              {(d.op === "EQUAL" ||
                d.op === "PARTIAL" ||
                d.op === "REPLACE" ||
                d.op === "INSERT") && (
                <span
                  className={`${d.op !== "INSERT" ? "text-char-overlay" : ""} ${highlightClass}`}
                >
                  {d.char === " " ? "\u00A0" : d.char}
                </span>
              )}

              {showCursorLeft && <span className="typing-cursor left" />}
              {showCursorRight && <span className="typing-cursor right" />}
            </span>
          );
        })}
      </div>
    </div>
  );
};
