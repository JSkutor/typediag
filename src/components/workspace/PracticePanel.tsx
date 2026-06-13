"use client";

import React from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { disassemble, assemble } from "es-hangul";

export const PracticePanel: React.FC = () => {
  const { targetText, typedText } = useTypingStore();

  const { displayTyped, cursorIndex, isCursorRight, composingIndex } = React.useMemo(() => {
    const displayTypedChars: string[] = [];
    let curIdx = typedText.length;
    let curRight = false;
    let compIdx = -1;

    for (let i = 0; i < typedText.length; i++) {
      displayTypedChars[i] = typedText[i];
    }

    // Check for carry-over split (extra batchim that belongs to next character)
    for (let i = 0; i < displayTypedChars.length; i++) {
      const typedChar = displayTypedChars[i];
      const targetChar = targetText[i];

      if (!typedChar || !targetChar) continue;

      if (typedChar !== targetChar) {
        const isTypedHangul = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(typedChar);
        const isTargetHangul = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(targetChar);

        if (isTypedHangul && isTargetHangul) {
          const typedDis = disassemble(typedChar);
          const targetDis = disassemble(targetChar);

          if (typedDis.startsWith(targetDis)) {
            const leftover = typedDis.slice(targetDis.length);
            if (leftover.length > 0 && i + 1 < targetText.length) {
              const nextTargetChar = targetText[i + 1];
              const nextTargetDis = disassemble(nextTargetChar);

              if (nextTargetDis.startsWith(leftover)) {
                displayTypedChars[i] = targetChar;
                displayTypedChars[i + 1] = assemble(leftover.split(""));
                curIdx = i + 1;
                curRight = true;
                compIdx = i + 1;
              }
            }
          }
        }
      }
    }

    // Determine normal composition if no carry-over split occurred
    if (compIdx === -1 && typedText.length > 0) {
      const lastIdx = typedText.length - 1;
      const lastTypedChar = typedText[lastIdx];
      const lastTargetChar = targetText[lastIdx];

      if (lastTypedChar && lastTargetChar && lastTypedChar !== lastTargetChar) {
        const isTypedHangul = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(lastTypedChar);
        const isTargetHangul = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(lastTargetChar);

        if (isTypedHangul && isTargetHangul) {
          const targetDis = disassemble(lastTargetChar);
          const typedDis = disassemble(lastTypedChar);

          if (targetDis.startsWith(typedDis)) {
            curIdx = lastIdx;
            curRight = true;
            compIdx = lastIdx;
          }
        }
      }
    }

    return {
      displayTyped: displayTypedChars,
      cursorIndex: curIdx,
      isCursorRight: curRight,
      composingIndex: compIdx,
    };
  }, [targetText, typedText]);

  return (
    <div className="typing-area" style={{ width: "100%", textAlign: "center", fontSize: "1.875rem", fontFamily: "var(--font-mono)", lineHeight: 1.625 }}>
      <div id="typing-text-container" className="typing-text-container inline-block text-left" style={{ maxWidth: "1024px" }}>
        {targetText.split("").map((char, i) => {
          const isTyped = i < displayTyped.length;
          const displayChar = char === " " ? "\u00A0" : char;
          const typedChar = isTyped ? (displayTyped[i] === " " ? "\u00A0" : displayTyped[i]) : null;

          const isComposingAndValid = i === composingIndex;
          const isCorrect = typedChar === displayChar;
          const highlightClass = (isCorrect || isComposingAndValid) ? "text-char-primary" : "text-char-error";

          const isCursor = i === cursorIndex;
          const cursorSide = isCursorRight ? "right" : "left";

          return (
            <span key={i} id={`text-char-${i}`} className="text-char-container relative">
              <span className="text-char-muted">{displayChar}</span>
              {isTyped && typedChar !== null && (
                <span className={highlightClass}>
                  {typedChar}
                </span>
              )}
              {isCursor && (
                <span className={`typing-cursor ${cursorSide}`} />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
};
