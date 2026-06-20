import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDiagnosticsTransition } from "./useDiagnosticsTransition";
import { useTypingStore } from "@/store/useTypingStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { db } from "@/utils/db";
import { buildLayout } from "@/lib/skdm";

// Mock SKDM heavy functions to avoid executing full pipeline in this integration test
vi.mock("@/lib/skdm", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    runPipeline: vi.fn(() => ({ a: { z: 0.5, confidence: 10 } })),
    triangulate: vi.fn(() => ({ triangles: [] })),
  };
});

describe("useDiagnosticsTransition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({ uiState: "practice", diagnosticMode: "surface" });
    useTypingStore.setState({
      events: [{ fromKey: "a", toKey: "b", latencyMs: 100 } as any],
      currentRunId: "test_run_1",
    });

    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  it("should trigger transition and aggregate db events", async () => {
    // Mock a run and page in the DB
    await db.createRun({ id: "test_run_1", user_id: "u1", status: "in_progress", started_at: "" });
    await db.createPage({
      id: "p1",
      run_id: "test_run_1",
      target_text_id: "t1",
      order_index: 0,
      language: "en",
      typed_text: "",
      wpm: 1,
      cpm: 1,
      accuracy: 100,
      started_at: "",
      finished_at: "",
      elapsed_time_ms: 1,
      key_events: [
        {
          from_key: "x",
          to_key: "y",
          latency: 50,
          is_correct: true,
          expected_char: "y",
          key_char: "y",
          hold_duration_ms: 50,
        },
      ],
    });

    const { result } = renderHook(() => useDiagnosticsTransition());

    await act(async () => {
      await result.current.startDiagnosticsTransition();
    });

    const workspaceState = useWorkspaceStore.getState();
    expect(workspaceState.uiState).toBe("diagnostics");
    expect(workspaceState.diagnosticMode).toBe("surface");
    expect(workspaceState.keyStats).toBeDefined();
    expect(workspaceState.analysisEvents.length).toBe(1);
    expect(workspaceState.analysisEvents[0].fromKey).toBe("x"); // Sourced from DB
  });

  it("should fallback to typingStore events if db has no pages", async () => {
    // DB has no pages for test_run_1
    const { result } = renderHook(() => useDiagnosticsTransition());

    await act(async () => {
      await result.current.startDiagnosticsTransition();
    });

    const workspaceState = useWorkspaceStore.getState();
    expect(workspaceState.analysisEvents.length).toBe(1);
    expect(workspaceState.analysisEvents[0].fromKey).toBe("a"); // Sourced from store fallback
  });

  it("should call saveCurrentPage before transition if status is 'done'", async () => {
    const saveSpy = vi.fn().mockResolvedValue(undefined);
    useTypingStore.setState({
      status: "done",
      saveCurrentPage: saveSpy,
      currentRunId: "test_run_1",
    });

    const { result } = renderHook(() => useDiagnosticsTransition());

    await act(async () => {
      await result.current.startDiagnosticsTransition();
    });

    expect(saveSpy).toHaveBeenCalledTimes(1);
  });
});
