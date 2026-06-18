"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const setUiState = useWorkspaceStore((state) => state.setUiState);

  useEffect(() => {
    console.error("Workspace Error Boundary Caught:", error);
  }, [error]);

  const handleReturnToPractice = () => {
    setUiState("practice");
    reset();
  };

  return (
    <div className="error-boundary-container">
      <h2 className="error-boundary-title">Something went wrong</h2>
      <p className="error-boundary-message">
        {error.message || "An unexpected error occurred in the workspace."}
      </p>
      <button onClick={handleReturnToPractice} className="error-boundary-button">
        Return to Practice
      </button>
    </div>
  );
}
