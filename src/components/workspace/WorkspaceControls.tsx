import React from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTypingStore } from "@/store/useTypingStore";

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

      {/* Developer Dummy Data Loader */}
      {uiState === "practice" && (
        <button 
          onClick={() => {
            useTypingStore.getState().loadDummyData();
            onStartDiagnostics();
          }}
          style={{
            position: "absolute",
            top: "16px",
            right: "235px",
            zIndex: 50,
            padding: "8px 20px",
            borderRadius: "9999px",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
            color: "#ffffff",
            fontSize: "0.875rem",
            fontWeight: "600",
            boxShadow: "0 4px 10px rgba(79, 70, 229, 0.3)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
          className="dev-dummy-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          더미 데이터 적용 (Dev)
        </button>
      )}
    </>
  );
};
