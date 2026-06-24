"use client";

import React from "react";
import { useTypingStore, TypingMode } from "@/store/useTypingStore";

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
    <div
      className="typing-area"
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: "5rem",
        fontSize: "1.875rem",
        fontFamily: "var(--font-mono)",
        lineHeight: 1.625,
        position: "relative",
        minHeight: "360px",
      }}
    >
      {/* Mode & Language selector segmented controls */}
      <div
        className="mode-selector-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "16px",
          width: "100%",
          maxWidth: "1024px",
          margin: "0 auto 2.5rem auto",
          padding: "0 1rem",
        }}
      >
        {/* Typing Mode Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-subtle, rgba(228, 230, 235, 0.08))",
            borderRadius: "9999px",
            padding: "4px",
            boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          {(["normal", "topic", "hardcore", "plain"] as TypingMode[]).map((m) => {
            const isActive = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: isActive ? 600 : 500,
                  padding: "6px 16px",
                  borderRadius: "9999px",
                  border: "none",
                  backgroundColor: isActive ? "var(--accent, #3861fb)" : "transparent",
                  color: isActive
                    ? "var(--text-inverse, #f0f2f5)"
                    : "var(--text-secondary, #8d929b)",
                  cursor: "pointer",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: isActive ? "0 2px 8px rgba(56, 97, 251, 0.4)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textTransform: "capitalize",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--text-primary, #e4e6eb)";
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--text-secondary, #8d929b)";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {m}
              </button>
            );
          })}
        </div>

        {/* Language Pill (KO / EN) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-subtle, rgba(228, 230, 235, 0.08))",
            borderRadius: "9999px",
            padding: "4px",
            boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          {["ko", "en"].map((lang) => {
            const isSelected = targetLanguage === lang;
            return (
              <button
                key={lang}
                onClick={() => setTargetLanguage(lang)}
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: isSelected ? 600 : 500,
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  border: "none",
                  backgroundColor: isSelected ? "var(--accent, #3861fb)" : "transparent",
                  color: isSelected
                    ? "var(--text-inverse, #f0f2f5)"
                    : "var(--text-secondary, #8d929b)",
                  cursor: "pointer",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  textTransform: "uppercase",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.color = "var(--text-primary, #e4e6eb)";
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.color = "var(--text-secondary, #8d929b)";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "topic" && !isTopicInputActive && topicTargets.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            fontSize: "0.875rem",
            color: "var(--text-secondary, #8d929b)",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            padding: "4px 12px",
            borderRadius: "9999px",
          }}
        >
          {isEn
            ? `Remaining: ${topicTargets.length - topicTargetIndex}`
            : `준비된 텍스트: ${topicTargets.length - topicTargetIndex}`}
        </div>
      )}

      <div
        id="typing-text-container"
        className="typing-text-container inline-block text-left"
        style={{ maxWidth: "1024px", width: "100%", textAlign: "left" }}
        aria-live="polite"
        aria-atomic="true"
      >
        {mode === "hardcore" && isEn ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "4rem 2rem",
              textAlign: "center",
              width: "100%",
              backgroundColor: "rgba(255, 255, 255, 0.01)",
              border: "1px dashed var(--border-subtle, rgba(228, 230, 235, 0.08))",
              borderRadius: "var(--radius-lg, 16px)",
            }}
          >
            <div
              style={{
                fontSize: "1.5rem",
                color: "var(--text-secondary, #8d929b)",
                marginBottom: "0.75rem",
              }}
            >
              ⚡ Hardcore Mode (English)
            </div>
            <div
              style={{
                fontSize: "1.0625rem",
                color: "var(--text-muted, #5c6068)",
                fontStyle: "italic",
              }}
            >
              English Hardcore mode is coming soon! Please use Korean for now.
            </div>
          </div>
        ) : mode === "topic" && isTopicLoading ? (
          <div
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}
          >
            <div
              style={{
                color: "var(--text-secondary, #8d929b)",
                fontStyle: "italic",
                animation: "pulse 1.5s infinite",
              }}
            >
              {isEn
                ? "Generating sentences for the topic..."
                : "주제에 맞는 문장을 찾는 중입니다..."}
            </div>
          </div>
        ) : (
          <>
            {mode === "plain" && qwertyBuffer.length === 0 && (
              <span
                style={{
                  fontSize: "1.5rem",
                  color: "rgba(255, 255, 255, 0.2)",
                  fontStyle: "italic",
                  pointerEvents: "none",
                  marginRight: "8px",
                }}
              >
                {isEn ? "Type freely here..." : "여기에 자유롭게 입력하세요..."}
              </span>
            )}
            {diffResult.length === 0 && <span className="typing-cursor left" />}
            {(() => {
              // Group diffResult into words (non-spaces) and spaces to implement word wrapping.
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
                    highlightClass = "text-char-error opacity-80";

                  if (d.op === "INSERT" && d.char === " ") {
                    highlightClass += " text-char-space-error";
                  }

                  const showCursorRight =
                    qwertyBuffer.length > 0 && i === lastInputIndex && cursorJumpIndex === null;
                  const showCursorLeft =
                    (qwertyBuffer.length === 0 && i === 0) ||
                    (cursorJumpIndex !== null && i === cursorJumpIndex);

                  return (
                    <span key={i} id={`text-char-${i}`} className="text-char-container relative">
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
                          className={`${d.op !== "INSERT" ? "text-char-overlay" : ""} ${highlightClass}`}
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
                    <span
                      key={`word-${groupIdx}`}
                      className="word-wrapper"
                      style={{ display: "inline-block", whiteSpace: "nowrap" }}
                    >
                      {content}
                    </span>
                  );
                } else {
                  return <React.Fragment key={`space-${groupIdx}`}>{content}</React.Fragment>;
                }
              });
            })()}
          </>
        )}
      </div>
    </div>
  );
};
