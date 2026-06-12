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

// Map physical keyboard codes (e.code) to virtual keyboard keys (independent of language layout)
const PHYSICAL_KEY_MAP: Record<string, string> = {
  KeyQ: "q", KeyW: "w", KeyE: "e", KeyR: "r", KeyT: "t", KeyY: "y", KeyU: "u", KeyI: "i", KeyO: "o", KeyP: "p",
  KeyA: "a", KeyS: "s", KeyD: "d", KeyF: "f", KeyG: "g", KeyH: "h", KeyJ: "j", KeyK: "k", KeyL: "l",
  KeyZ: "z", KeyX: "x", KeyC: "c", KeyV: "v", KeyB: "b", KeyN: "n", KeyM: "m",
  Comma: ",", Period: "."
};

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
        const code = e.code;
        
        if (code === "Escape") {
          e.preventDefault();
          setDiagnosticMode("surface");
          setFocusedKey(null);
          return;
        }

        if (code === "Backspace") {
          setDiagnosticMode("backspace");
          setFocusedKey(null);
        } else if (code === "ShiftLeft" || code === "ShiftRight") {
          setDiagnosticMode("shift");
          setFocusedKey(null);
        } else if (code === "Space") {
          e.preventDefault(); // Prevent page scrolling
          setDiagnosticMode("space");
          setFocusedKey(null);
        } else {
          const mappedKey = PHYSICAL_KEY_MAP[code];
          if (mappedKey) {
            setDiagnosticMode("cylindrical");
            setFocusedKey(mappedKey);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [uiState, onTransition, setUiState, setDiagnosticMode, setFocusedKey]);
}
