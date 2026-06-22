import React from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export const WorkspaceControls: React.FC = () => {
  const uiState = useWorkspaceStore((state) => state.uiState);
  const setUiState = useWorkspaceStore((state) => state.setUiState);

  return (
    <button
      onClick={() => {
        if (uiState === "practice") {
          const e = new KeyboardEvent("keydown", { key: "Tab" });
          window.dispatchEvent(e);
        } else {
          setUiState("practice");
        }
      }}
      className="mode-toggle-btn"
    >
      {uiState === "practice" ? "Enter Diagnostics (Tab)" : "Return to Practice (Tab)"}
    </button>
  );
};
