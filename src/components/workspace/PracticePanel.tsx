"use client";

import React from "react";
import { useTypingStore, TypingMode } from "@/store/useTypingStore";

export const PracticePanel: React.FC = () => {
  const { qwertyBuffer, alignments: diffResult, mode, setMode } = useTypingStore();

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
        justifyContent: "center",
        fontSize: "1.875rem",
        fontFamily: "var(--font-mono)",
        lineHeight: 1.625,
        position: "relative",
      }}
    >
      {/* Mode selector dropdown */}
      <div
        className="mode-selector-container"
        style={{
          display: "flex",
          justifyContent: "flex-start",
          width: "100%",
          maxWidth: "1024px",
          margin: "0 auto 1.5rem auto",
          padding: "0 1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted, #888)", fontWeight: 500 }}>
            Mode:
          </span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as TypingMode)}
            style={{
              fontSize: "0.875rem",
              padding: "4px 8px",
              borderRadius: "4px",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "var(--color-text-primary, #fff)",
              cursor: "pointer",
              outline: "none",
              fontFamily: "inherit",
              width: "150px",
            }}
          >
            <option value="default" style={{ backgroundColor: "#1e1e1e" }}>Default</option>
            <option value="subject" style={{ backgroundColor: "#1e1e1e" }}>Subject (LLM)</option>
            <option value="hardcore" style={{ backgroundColor: "#1e1e1e" }}>Hardcore</option>
            <option value="plain" style={{ backgroundColor: "#1e1e1e" }}>Plain Notepad</option>
          </select>
        </div>
      </div>

      <div
        id="typing-text-container"
        className="typing-text-container inline-block text-left"
        style={{ maxWidth: "1024px" }}
        aria-live="polite"
        aria-atomic="true"
      >
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
      </div>
    </div>
  );
};
