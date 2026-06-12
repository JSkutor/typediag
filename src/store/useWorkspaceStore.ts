import { create } from "zustand";
import { KeyResult } from "@/lib/skdm";

export type UiState = "practice" | "measuring" | "flying" | "diagnostics";

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

  setUiState: (state: UiState) => void;
  setDiagnosticMode: (mode: DiagnosticsMode) => void;
  setFocusedKey: (key: string | null) => void;
  setDynamicScale: (scale: number) => void;
  setAnalysisData: (stats: Record<string, KeyResult>, triangles: Uint32Array | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  uiState: "practice",
  diagnosticMode: "surface",
  focusedKey: null,
  dynamicScale: 0.95,
  keyStats: {},
  triangles: null,

  setUiState: (uiState) => set({ uiState }),
  setDiagnosticMode: (diagnosticMode) => set({ diagnosticMode }),
  setFocusedKey: (focusedKey) => set({ focusedKey }),
  setDynamicScale: (dynamicScale) => set({ dynamicScale }),
  setAnalysisData: (keyStats, triangles) => set({ keyStats, triangles }),
}));
