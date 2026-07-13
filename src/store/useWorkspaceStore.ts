import { create } from "zustand";
import { KeyResult, KeyEvent } from "@/lib/skdm";

type UiState = "practice" | "measuring" | "diagnostics";

export type DiagnosticsMode = "surface" | "cylindrical" | "backspace" | "finger";

interface WorkspaceState {
  uiState: UiState;
  diagnosticMode: DiagnosticsMode;
  focusedKey: string | null;
  dynamicScale: number;
  keyStats: Record<string, KeyResult>;
  triangles: Uint32Array | null;
  analysisEvents: KeyEvent[];
  isAnalyzing: boolean;

  setUiState: (state: UiState) => void;
  setDiagnosticMode: (mode: DiagnosticsMode) => void;
  setFocusedKey: (key: string | null) => void;
  setDynamicScale: (scale: number) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
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
  isAnalyzing: false,

  setUiState: (uiState) => set({ uiState }),
  setDiagnosticMode: (diagnosticMode) => set({ diagnosticMode }),
  setFocusedKey: (focusedKey) => set({ focusedKey }),
  setDynamicScale: (dynamicScale) => set({ dynamicScale }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setAnalysisData: (keyStats, triangles, analysisEvents) =>
    set({ keyStats, triangles, analysisEvents }),
}));
