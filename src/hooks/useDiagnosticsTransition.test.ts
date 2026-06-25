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
      currentRunId: "00000000-0000-0000-0000-000000000001",
    });

    if (typeof window !== "undefined") {
      localStorage.clear();
    }

    // Mock global fetch for API calls in hooks
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const urlObj = new URL(url, "http://localhost");
      const action = urlObj.searchParams.get("action");
      const runId = urlObj.searchParams.get("runId");

      if (action === "analysis") {
        let events: any[] = [];
        if (runId && runId !== "all") {
          const pages = await db.getPagesForRun(runId);
          if (pages.length > 0) {
            const keyEventsByPage = await Promise.all(pages.map((p) => db.getKeyEventsForPage(p.id)));
            events = keyEventsByPage.flatMap((pageEvents) =>
              pageEvents.map((ev) => ({
                fromKey: ev.fromKey,
                toKey: ev.toKey,
                latencyMs: ev.latency,
                keyChar: ev.keyChar || undefined,
                holdDurationMs: ev.holdDurationMs,
                isCorrect: ev.isCorrect,
                expectedChar: ev.expectedChar,
              })),
            );
          }
        } else {
          // Query events from all runs to mock user-wide events fetch
          const allRuns = await db.getAllRuns();
          const allEvents: any[] = [];
          for (const run of allRuns) {
            const pages = await db.getPagesForRun(run.id);
            const keyEventsByPage = await Promise.all(pages.map((p) => db.getKeyEventsForPage(p.id)));
            const evs = keyEventsByPage.flatMap((pageEvents) =>
              pageEvents.map((ev) => ({
                fromKey: ev.fromKey,
                toKey: ev.toKey,
                latencyMs: ev.latency,
                keyChar: ev.keyChar || undefined,
                holdDurationMs: ev.holdDurationMs,
                isCorrect: ev.isCorrect,
                expectedChar: ev.expectedChar,
              })),
            );
            allEvents.push(...evs);
          }
          events = allEvents;
        }
        return {
          ok: true,
          json: async () => ({ events }),
        };
      }
      return {
        ok: false,
        json: async () => ({ error: "Not found" }),
      };
    });
  });

  it("should trigger transition and aggregate db events", async () => {
    const mockPageId = "00000000-0000-0000-0000-000000000002";
    const nowStr = new Date().toISOString();

    // Mock a run in the DB and get the actual generated run ID
    const run = await db.createRun({ user_id: null, status: "in_progress", started_at: nowStr });

    useTypingStore.setState({
      currentRunId: run.id,
    });

    await db.createPage({
      id: mockPageId,
      run_id: run.id,
      target_text_id: "t1",
      order_index: 0,
      language: "en",
      typed_text: "",
      wpm: 1,
      cpm: 1,
      accuracy: 100,
      started_at: nowStr,
      finished_at: nowStr,
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
      currentRunId: "00000000-0000-0000-0000-000000000001",
    });

    const { result } = renderHook(() => useDiagnosticsTransition());

    await act(async () => {
      await result.current.startDiagnosticsTransition();
    });

    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it("should load mock diagnostics in development", async () => {
    vi.stubEnv("NODE_ENV", "development");

    (global.fetch as any).mockImplementation(async (url: string) => {
      const urlObj = new URL(url, "http://localhost");
      if (urlObj.searchParams.get("action") === "mock") {
        return {
          ok: true,
          json: async () => ({
            events: [{ fromKey: "m", toKey: "o", latencyMs: 42 }],
          }),
        };
      }
      return { ok: false, json: async () => ({ error: "Not found" }) };
    });

    const { result } = renderHook(() => useDiagnosticsTransition());

    await act(async () => {
      await result.current.startMockDiagnostics();
    });

    const workspaceState = useWorkspaceStore.getState();
    expect(workspaceState.uiState).toBe("diagnostics");
    expect(workspaceState.analysisEvents).toHaveLength(1);
    expect(workspaceState.analysisEvents[0].fromKey).toBe("m");
  });
});
