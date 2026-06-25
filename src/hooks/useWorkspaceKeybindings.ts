import { useEffect } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

interface WorkspaceKeybindingsProps {
  onTransition: () => void;
}

// Map physical keyboard codes (e.code) to virtual keyboard keys (independent of language layout)
const PHYSICAL_KEY_MAP: Record<string, string> = {
  KeyQ: "q",
  KeyW: "w",
  KeyE: "e",
  KeyR: "r",
  KeyT: "t",
  KeyY: "y",
  KeyU: "u",
  KeyI: "i",
  KeyO: "o",
  KeyP: "p",
  KeyA: "a",
  KeyS: "s",
  KeyD: "d",
  KeyF: "f",
  KeyG: "g",
  KeyH: "h",
  KeyJ: "j",
  KeyK: "k",
  KeyL: "l",
  KeyZ: "z",
  KeyX: "x",
  KeyC: "c",
  KeyV: "v",
  KeyB: "b",
  KeyN: "n",
  KeyM: "m",
  Comma: ",",
  Period: ".",
};

export function useWorkspaceKeybindings({ onTransition }: WorkspaceKeybindingsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { uiState, setUiState, setDiagnosticMode, setFocusedKey } =
        useWorkspaceStore.getState();

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
        if (e.repeat && e.code !== "Backspace") return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        // Prevent default browser behavior for navigation and spacing keys
        if (
          e.code === "Space" ||
          e.code === "ArrowRight" ||
          e.code === "Enter" ||
          e.code === "Backspace"
        ) {
          e.preventDefault();
        }

        useTypingStore.getState().handlePhysicalKeyPress(e.code, e.shiftKey, performance.now());
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
        } else {
          const mappedKey = PHYSICAL_KEY_MAP[code];
          if (mappedKey) {
            setDiagnosticMode("cylindrical");
            setFocusedKey(mappedKey);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const { uiState } = useWorkspaceStore.getState();
      if (uiState === "practice") {
        useTypingStore.getState().handlePhysicalKeyRelease(e.code, performance.now());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onTransition]);
}
