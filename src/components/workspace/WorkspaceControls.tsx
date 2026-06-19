import React from "react";
import { LoadLocalDbButton } from "@/components/dev/LoadLocalDbButton";
import { SyncLocalDbButton } from "@/components/dev/SyncLocalDbButton";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

interface WorkspaceControlsProps {
  onStartDiagnostics: () => void;
}

export const WorkspaceControls: React.FC<WorkspaceControlsProps> = ({ onStartDiagnostics }) => {
  const uiState = useWorkspaceStore((state) => state.uiState);
  const setUiState = useWorkspaceStore((state) => state.setUiState);

  return (
    <>
      {/* Mode Toggle Button for mouse users */}
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

      {/* Developer DB Data Loader */}
      {process.env.NODE_ENV === "development" && uiState === "practice" && (
        <>
          <SyncLocalDbButton
            style={{
              position: "absolute",
              top: "16px",
              right: "460px",
              zIndex: 50,
            }}
          />
          <LoadLocalDbButton
            style={{
              position: "absolute",
              top: "16px",
              right: "235px",
              zIndex: 50,
            }}
          />
        </>
      )}
    </>
  );
};
