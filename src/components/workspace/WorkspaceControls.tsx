import React from "react";
import posthog from "posthog-js";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export const WorkspaceControls: React.FC = () => {
  const uiState = useWorkspaceStore((state) => state.uiState);
  const setUiState = useWorkspaceStore((state) => state.setUiState);

  return (
    <>
      <div className="workspace-controls-container">
        <button
          onClick={() => {
            if (uiState === "practice") {
              posthog.capture("diagnostics_entered", { trigger: "button" });
              const e = new KeyboardEvent("keydown", { key: "Tab" });
              window.dispatchEvent(e);
            } else {
              setUiState("practice");
            }
          }}
          className="mode-toggle-btn"
        >
          {uiState === "practice" ? "진단 모드 진입 (Tab)" : "연습 모드 복귀 (Tab)"}
        </button>
      </div>
    </>
  );
};
