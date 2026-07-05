import React from "react";
import { PracticePanel } from "./PracticePanel";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export const PracticeLayer: React.FC<{ hideToolbar?: boolean }> = ({ hideToolbar }) => {
  const uiState = useWorkspaceStore((state) => state.uiState);
  const isHidden = uiState === "diagnostics";

  return (
    <div className={`screen-practice ${isHidden ? "hidden-down" : ""}`}>
      <PracticePanel hideToolbar={hideToolbar} />
    </div>
  );
};
