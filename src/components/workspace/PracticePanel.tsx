"use client";

import React from "react";
import { useTypingStore, TypingMode } from "@/store/useTypingStore";

export const PracticePanel: React.FC = () => {
  const {
    qwertyBuffer,
    alignments: diffResult,
    mode,
    setMode,
  } = useTypingStore();

  const lastInputIndex = React.useMemo(() => {
    return diffResult.findLastIndex((d) => d.inputIndex !== undefined);
  }, [diffResult]);

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
      {/* Mode selector segmented controls (Pill) */}
      <div
        className="mode-selector-container"
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          maxWidth: "1024px",
          margin: "0 auto 2.5rem auto",
          padding: "0 1rem",
        }}
      >
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
          {(["normal", "subject", "hardcore", "plain"] as TypingMode[]).map((m) => {
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
                  color: isActive ? "var(--text-inverse, #f0f2f5)" : "var(--text-secondary, #8d929b)",
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
      </div>

      <div
        id="typing-text-container"
        className="typing-text-container inline-block text-left"
        style={{ maxWidth: "1024px", width: "100%", textAlign: "center" }}
        aria-live="polite"
        aria-atomic="true"
      >
        {mode === "subject" && useTypingStore.getState().isSubjectLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <div style={{ color: "var(--text-secondary, #8d929b)", fontStyle: "italic", animation: "pulse 1.5s infinite" }}>
              주제에 맞는 문장을 찾는 중입니다...
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
                여기에 자유롭게 입력하세요...
              </span>
            )}
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
          </>
        )}
      </div>
    </div>
  );
};
