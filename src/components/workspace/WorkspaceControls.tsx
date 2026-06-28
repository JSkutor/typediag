import React from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useDiagnosticsTransition } from "@/hooks/useDiagnosticsTransition";
import { isDevOnlyEnabled } from "@/lib/api/isDevOnlyRoute";

export const WorkspaceControls: React.FC = () => {
  const uiState = useWorkspaceStore((state) => state.uiState);
  const setUiState = useWorkspaceStore((state) => state.setUiState);
  const { startMockDiagnostics, isMockLoading } = useDiagnosticsTransition();
  const showMockControls = isDevOnlyEnabled();

  return (
    <>
      {showMockControls && (
        <div className="dev-controls-container">
          <button
            onClick={() => {
              if (!isMockLoading) {
                startMockDiagnostics();
              }
            }}
            className="mock-apply-btn"
            disabled={isMockLoading}
          >
            {isMockLoading ? "Loading Mock DB..." : "Apply Mock DB (local_db)"}
          </button>
        </div>
      )}

      <div className="workspace-controls-container">
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
      </div>
    </>
  );
};
