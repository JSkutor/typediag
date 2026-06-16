import { create } from "zustand";
import { KeyResult, KeyEvent } from "@/lib/skdm";

export type UiState = "practice" | "measuring" | "diagnostics";

export type DiagnosticsMode =
  | "surface"
  | "cylindrical"
  | "backspace"
  | "shift"
  | "space"
  | "finger";

interface WorkspaceState {
  uiState: UiState;
  diagnosticMode: DiagnosticsMode;
  focusedKey: string | null;
  dynamicScale: number;
  keyStats: Record<string, KeyResult>;
  triangles: Uint32Array | null;
  analysisEvents: KeyEvent[];

  setUiState: (state: UiState) => void;
  setDiagnosticMode: (mode: DiagnosticsMode) => void;
  setFocusedKey: (key: string | null) => void;
  setDynamicScale: (scale: number) => void;
  setAnalysisData: (
    stats: Record<string, KeyResult>,
    triangles: Uint32Array | null,
    events: KeyEvent[],
  ) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  uiState: "practice",
  diagnosticMode: "surface",
  focusedKey: null,
  dynamicScale: 0.95,
  keyStats: {},
  triangles: null,
  analysisEvents: [],

  setUiState: (uiState) => set({ uiState }),
  setDiagnosticMode: (diagnosticMode) => set({ diagnosticMode }),
  setFocusedKey: (focusedKey) => set({ focusedKey }),
  setDynamicScale: (dynamicScale) => set({ dynamicScale }),
  setAnalysisData: (keyStats, triangles, analysisEvents) =>
    set({ keyStats, triangles, analysisEvents }),
}));
