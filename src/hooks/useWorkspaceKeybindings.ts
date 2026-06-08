import { useEffect } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { UiState } from "@/app/page";
import { DiagnosticsMode } from "@/components/workspace/VirtualKeyboard";

interface WorkspaceKeybindingsProps {
  uiState: UiState;
  setUiState: (state: UiState) => void;
  setDiagnosticMode: (mode: DiagnosticsMode) => void;
  setFocusedKey: (key: string | null) => void;
  onTransition: () => void;
}

export function useWorkspaceKeybindings({
  uiState,
  setUiState,
  setDiagnosticMode,
  setFocusedKey,
  onTransition
}: WorkspaceKeybindingsProps) {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        
        if (uiState === "practice") {
          onTransition();
        } else if (uiState === "diagnostics") {
          setUiState("practice");
        }
        return;
      }

      if (uiState === "practice") {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        useTypingStore.getState().handleKeyPress(e.key, performance.now());
        return;
      }

      if (uiState === "diagnostics") {
        const key = e.key;
        if (key === "Backspace") {
          setDiagnosticMode("backspace");
        } else if (key === "Shift") {
          setDiagnosticMode("shift");
        } else if (key === " ") {
          setDiagnosticMode("space");
        } else if (key.length === 1) {
          setDiagnosticMode("cylindrical");
          setFocusedKey(key);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [uiState, onTransition, setUiState, setDiagnosticMode, setFocusedKey]);
}
