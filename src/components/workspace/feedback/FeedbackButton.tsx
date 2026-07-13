"use client";

import React from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useFeedbackStore } from "@/store/useFeedbackStore";
import { useDiagnosticsTransition } from "@/hooks/useDiagnosticsTransition";
import { isDevOnlyEnabled } from "@/lib/api/isDevOnlyRoute";

export const FeedbackButton: React.FC = () => {
  const mode = useTypingStore((state) => state.mode);
  const setMode = useTypingStore((state) => state.setMode);
  const targetLanguage = useTypingStore((state) => state.targetLanguage);
  const setUiState = useWorkspaceStore((state) => state.setUiState);
  const resetSubmitStatus = useFeedbackStore((state) => state.resetSubmitStatus);
  const { startMockDiagnostics, isMockLoading } = useDiagnosticsTransition();
  const showMockControls = isDevOnlyEnabled();

  const isEn = targetLanguage === "en";
  const isFeedbackMode = mode === "feedback";

  return (
    <div className="fab-container">
      {showMockControls && (
        <button
          onClick={() => {
            if (!isMockLoading) {
              startMockDiagnostics();
            }
          }}
          className="mock-apply-btn"
          disabled={isMockLoading}
        >
          {isMockLoading ? "Loading..." : "Apply Mock DB"}
        </button>
      )}
      <a
        href="https://fairy.hada.io/@typediag"
        target="_blank"
        rel="noopener noreferrer"
        className="fairy-fab"
      >
        🧚‍♀️ 커피 사주기
      </a>
      <button
        type="button"
        className="feedback-fab"
        aria-pressed={isFeedbackMode}
        onClick={() => {
          if (isFeedbackMode) {
            resetSubmitStatus();
            void setMode("normal");
            return;
          }
          setUiState("practice");
          resetSubmitStatus();
          void setMode("feedback");
        }}
      >
        {isEn ? "Feedback" : "피드백"}
      </button>
    </div>
  );
};
