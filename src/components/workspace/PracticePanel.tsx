"use client";

import React from "react";
import { useTypingStore, TypingMode } from "@/store/useTypingStore";

const TYPING_MODES: TypingMode[] = ["normal", "topic", "hardcore", "plain"];

export const PracticePanel: React.FC = () => {
  const {
    qwertyBuffer,
    alignments: diffResult,
    mode,
    setMode,
    topicTargets,
    topicTargetIndex,
    isTopicInputActive,
    isTopicLoading,
    targetLanguage,
    setTargetLanguage,
  } = useTypingStore();

  const isEn = targetLanguage === "en";

  const lastInputIndex = React.useMemo(() => {
    return diffResult.findLastIndex((d) => d.inputIndex !== undefined);
  }, [diffResult]);

  const [cursorJumpIndex, setCursorJumpIndex] = React.useState<number | null>(null);

  const checkCursorJump = React.useCallback(() => {
    if (lastInputIndex === -1) {
      setCursorJumpIndex(null);
      return;
    }

    const activeChar = diffResult[lastInputIndex];
    if (!activeChar) {
      setCursorJumpIndex(null);
      return;
    }

    const isSpace =
      activeChar.targetChar === " " ||
      (activeChar.targetChar === undefined && activeChar.char === " ");
    if (isSpace && lastInputIndex < diffResult.length - 1) {
      const activeEl = document.getElementById(`text-char-${lastInputIndex}`);
      const nextEl = document.getElementById(`text-char-${lastInputIndex + 1}`);

      if (activeEl && nextEl) {
        if (nextEl.offsetTop > activeEl.offsetTop + 5) {
          setCursorJumpIndex(lastInputIndex + 1);
          return;
        }
      }
    }
    setCursorJumpIndex(null);
  }, [diffResult, lastInputIndex]);

  React.useLayoutEffect(() => {
    const handle = requestAnimationFrame(() => {
      checkCursorJump();
    });
    return () => cancelAnimationFrame(handle);
  }, [checkCursorJump]);

  const resizeRafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const handleResize = () => {
      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current);
      }
      resizeRafRef.current = requestAnimationFrame(() => {
        checkCursorJump();
      });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current);
      }
    };
  }, [checkCursorJump]);

  return (
    <div className="typing-area">
      <div className="mode-selector-container">
        <div className="segment-pill" role="group" aria-label="Typing mode">
          {TYPING_MODES.map((m) => (
            <button
              key={m}
              type="button"
              className={`segment-pill__btn${mode === m ? " segment-pill__btn--active" : ""}`}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="segment-pill" role="group" aria-label="Language">
          {(["ko", "en"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              className={`segment-pill__btn segment-pill__btn--lang${targetLanguage === lang ? " segment-pill__btn--active" : ""}`}
              onClick={() => setTargetLanguage(lang)}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {mode === "topic" && !isTopicInputActive && topicTargets.length > 0 && (
        <div className="topic-remaining-badge">
          {isEn
            ? `Remaining: ${topicTargets.length - topicTargetIndex}`
            : `준비된 텍스트: ${topicTargets.length - topicTargetIndex}`}
        </div>
      )}

      <div
        id="typing-text-container"
        className="typing-text-container"
        aria-live="polite"
        aria-atomic="true"
      >
        {mode === "hardcore" && isEn ? (
          <div className="typing-placeholder-box">
            <div className="typing-placeholder-title">⚡ Hardcore Mode (English)</div>
            <div className="typing-placeholder-desc">
              English Hardcore mode is coming soon! Please use Korean for now.
            </div>
          </div>
        ) : mode === "topic" && isTopicLoading ? (
          <div className="typing-loading">
            <div className="typing-loading__text">
              {isEn
                ? "Generating sentences for the topic..."
                : "주제에 맞는 문장을 찾는 중입니다..."}
            </div>
          </div>
        ) : (
          <>
            {mode === "plain" && qwertyBuffer.length === 0 && (
              <span className="plain-mode-hint">
                {isEn ? "Type freely here..." : "여기에 자유롭게 입력하세요..."}
              </span>
            )}
            {diffResult.length === 0 && <span className="typing-cursor left" />}
            {(() => {
              const groups: {
                type: "word" | "space";
                items: { item: (typeof diffResult)[number]; index: number }[];
              }[] = [];
              let currentGroup: {
                type: "word" | "space";
                items: { item: (typeof diffResult)[number]; index: number }[];
              } | null = null;

              diffResult.forEach((d, i) => {
                const isSpace =
                  d.targetChar === " " || (d.targetChar === undefined && d.char === " ");

                if (isSpace) {
                  if (currentGroup && currentGroup.type === "space") {
                    currentGroup.items.push({ item: d, index: i });
                  } else {
                    currentGroup = { type: "space", items: [{ item: d, index: i }] };
                    groups.push(currentGroup);
                  }
                } else {
                  if (currentGroup && currentGroup.type === "word") {
                    currentGroup.items.push({ item: d, index: i });
                  } else {
                    currentGroup = { type: "word", items: [{ item: d, index: i }] };
                    groups.push(currentGroup);
                  }
                }
              });

              return groups.map((group, groupIdx) => {
                const content = group.items.map(({ item: d, index: i }) => {
                  const isOmitted = d.op === "OMIT";

                  let highlightClass = "";
                  if (d.op === "EQUAL" || d.op === "PARTIAL") highlightClass = "text-char-primary";
                  else if (d.op === "INSERT" || d.op === "REPLACE")
                    highlightClass = "text-char-error text-char-error-dim";

                  if (d.op === "INSERT" && d.char === " ") {
                    highlightClass += " text-char-space-error";
                  }

                  const showCursorRight =
                    qwertyBuffer.length > 0 && i === lastInputIndex && cursorJumpIndex === null;
                  const showCursorLeft =
                    (qwertyBuffer.length === 0 && i === 0) ||
                    (cursorJumpIndex !== null && i === cursorJumpIndex);

                  return (
                    <span key={i} id={`text-char-${i}`} className="text-char-container">
                      {d.op !== "INSERT" && (
                        <span className={isOmitted ? "text-char-omitted" : "text-char-muted"}>
                          {d.targetChar === " " ? "\u00A0" : d.targetChar}
                        </span>
                      )}

                      {(d.op === "EQUAL" ||
                        d.op === "PARTIAL" ||
                        d.op === "REPLACE" ||
                        d.op === "INSERT") && (
                        <span
                          className={`${d.op !== "INSERT" ? "text-char-overlay" : ""} ${highlightClass}`.trim()}
                        >
                          {d.char === " " ? "\u00A0" : d.char}
                        </span>
                      )}

                      {showCursorLeft && <span className="typing-cursor left" />}
                      {showCursorRight && <span className="typing-cursor right" />}
                    </span>
                  );
                });

                if (group.type === "word") {
                  return (
                    <span key={`word-${groupIdx}`} className="word-wrapper">
                      {content}
                    </span>
                  );
                }
                return <React.Fragment key={`space-${groupIdx}`}>{content}</React.Fragment>;
              });
            })()}
          </>
        )}
      </div>
    </div>
  );
};
