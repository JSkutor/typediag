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
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 text-white z-[9999]">
      <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h2>
      <p className="text-neutral-400 mb-8 max-w-md text-center">
        {error.message || "An unexpected error occurred in the workspace."}
      </p>
      <button
        onClick={handleReturnToPractice}
        className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded-lg transition-colors border border-neutral-700 font-mono text-sm"
      >
        Return to Practice
      </button>
    </div>
  );
}
