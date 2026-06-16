import { describe, it, expect, beforeEach } from "vitest";
import { useWorkspaceStore } from "./useWorkspaceStore";

describe("useWorkspaceStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useWorkspaceStore.setState({
      uiState: "practice",
      diagnosticMode: "surface",
      focusedKey: null,
      dynamicScale: 0.95,
      keyStats: {},
      triangles: null,
      analysisEvents: [],
    });
  });

  it("should initialize with default values", () => {
    const state = useWorkspaceStore.getState();
    expect(state.uiState).toBe("practice");
    expect(state.diagnosticMode).toBe("surface");
    expect(state.focusedKey).toBeNull();
    expect(state.dynamicScale).toBe(0.95);
    expect(state.keyStats).toEqual({});
    expect(state.triangles).toBeNull();
    expect(state.analysisEvents).toEqual([]);
  });

  it("should set uiState", () => {
    useWorkspaceStore.getState().setUiState("measuring");
    expect(useWorkspaceStore.getState().uiState).toBe("measuring");
  });

  it("should set diagnosticMode", () => {
    useWorkspaceStore.getState().setDiagnosticMode("cylindrical");
    expect(useWorkspaceStore.getState().diagnosticMode).toBe("cylindrical");
  });

  it("should set focusedKey", () => {
    useWorkspaceStore.getState().setFocusedKey("k");
    expect(useWorkspaceStore.getState().focusedKey).toBe("k");
  });

  it("should set dynamicScale", () => {
    useWorkspaceStore.getState().setDynamicScale(1.5);
    expect(useWorkspaceStore.getState().dynamicScale).toBe(1.5);
  });

  it("should set analysis data", () => {
    const stats = { a: { key: "a", score: 100 } } as any;
    const triangles = new Uint32Array([0, 1, 2]);
    const events = [{ fromKey: "a", toKey: "b", latencyMs: 100, keyChar: "b" }] as any;
    useWorkspaceStore.getState().setAnalysisData(stats, triangles, events);

    expect(useWorkspaceStore.getState().keyStats).toEqual(stats);
    expect(useWorkspaceStore.getState().triangles).toEqual(triangles);
    expect(useWorkspaceStore.getState().analysisEvents).toEqual(events);
  });
});
