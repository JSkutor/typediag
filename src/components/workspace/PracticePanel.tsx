"use client";

import React from "react";
import { useTypingStore } from "@/store/useTypingStore";

export const PracticePanel: React.FC = () => {
  const { targetText, typedText } = useTypingStore();

  return (
    <div className="typing-area" style={{ width: "100%", textAlign: "center", fontSize: "1.875rem", fontFamily: "var(--font-mono)", lineHeight: 1.625 }}>
      <div id="typing-text-container" className="typing-text-container inline-block text-left" style={{ maxWidth: "1024px" }}>
        {targetText.split("").map((char, i) => {
          const isTyped = i < typedText.length;
          const displayChar = char === " " ? "\u00A0" : char;
          const typedChar = isTyped ? (typedText[i] === " " ? "\u00A0" : typedText[i]) : null;

          return (
            <span key={i} id={`text-char-${i}`} className="text-char-container">
              <span className="text-char-muted">{displayChar}</span>
              {isTyped && (
                <span className={typedChar === displayChar ? "text-char-primary" : "text-char-error"}>
                  {typedChar}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
};
