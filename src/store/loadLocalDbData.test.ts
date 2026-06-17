import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTypingStore } from "./useTypingStore";
import { useWorkspaceStore } from "./useWorkspaceStore";
import { renderHook, act } from "@testing-library/react";
import { useDiagnosticsTransition } from "@/hooks/useDiagnosticsTransition";

describe("loadLocalDbData Integration Test", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ uiState: "practice", diagnosticMode: "surface" });
    useTypingStore.setState({
      targetText: "hello",
      targetLanguage: "en",
      targetId: "test_target",
      typedText: "",
      qwertyBuffer: "",
      events: [],
      status: "idle",
      startedAt: null,
      finishedAt: null,
      lastKey: null,
      lastKeyAt: null,
      currentRunId: "active_run_id", // simulated active typing session run ID
    });
  });

  it("should load the entire DB data, set state, and correctly update workspace stats on transition", async () => {
    // Mock the browser alert
    const alertSpy = vi.spyOn(global, "alert").mockImplementation(() => {});

    // Mock global fetch to return allPages and allRuns from local_db.json
    const mockDbData = {
      runs: [
        {
          id: "run_1",
          user_id: "user_001",
          status: "completed",
          started_at: "2026-06-16T11:45:36.997Z",
          finished_at: "2026-06-16T11:46:36.997Z",
          cpm: 400,
          wpm: 80,
          accuracy: 100,
          created_at: "2026-06-16T11:45:36.997Z"
        }
      ],
      pages: [
        {
          id: "page_1",
          run_id: "run_1",
          target_text_id: "target_001",
          order_index: 0,
          language: "ko",
          typed_text: "태양",
          wpm: 80,
          cpm: 400,
          accuracy: 100,
          started_at: "2026-06-16T11:45:36.997Z",
          finished_at: "2026-06-16T11:46:36.997Z",
          elapsed_time_ms: 1000,
          key_events: [
            {
              from_key: "q",
              to_key: "w",
              key_char: "ㅂ",
              latency: 150,
              hold_duration_ms: 100,
              is_correct: true,
              expected_char: null
            },
            {
              from_key: "w",
              to_key: "e",
              key_char: "ㄷ",
              latency: 180,
              hold_duration_ms: 100,
              is_correct: true,
              expected_char: null
            }
          ]
        }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDbData,
    });

    // 1. Call loadLocalDbData
    await act(async () => {
      await useTypingStore.getState().loadLocalDbData();
    });

    // Verify typing store states
    const typingState = useTypingStore.getState();
    expect(typingState.currentRunId).toBeNull();
    expect(typingState.events).toHaveLength(2);
    expect(typingState.events[0]).toEqual({
      fromKey: "q",
      toKey: "w",
      keyChar: "ㅂ",
      latencyMs: 150,
      holdDurationMs: 100,
      isCorrect: true,
      expectedChar: null
    });
    expect(alertSpy).toHaveBeenCalled();

    // 2. Call startDiagnosticsTransition
    const { result } = renderHook(() => useDiagnosticsTransition());
    await act(async () => {
      await result.current.startDiagnosticsTransition();
    });

    // Verify workspace store state
    const workspaceState = useWorkspaceStore.getState();
    expect(workspaceState.uiState).toBe("diagnostics");
    expect(workspaceState.diagnosticMode).toBe("surface");
    expect(workspaceState.analysisEvents).toHaveLength(2);
    
    // Check if keyStats has values calculated by runPipeline
    expect(Object.keys(workspaceState.keyStats).length).toBeGreaterThan(0);
    // Keys 'w' and 'e' should have specific values
    expect(workspaceState.keyStats["w"]).toBeDefined();
    expect(workspaceState.keyStats["e"]).toBeDefined();
    
    console.log("SUCCESS: Test finished successfully!");
    console.log("keyStats for 'w':", workspaceState.keyStats["w"]);
    console.log("keyStats for 'e':", workspaceState.keyStats["e"]);

    alertSpy.mockRestore();
  });
});
