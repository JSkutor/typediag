import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useTypingStore } from "./useTypingStore";

const mockFetchRandomNormalTarget = vi.fn();

vi.mock("@/lib/practice/normalTargetClient", () => ({
  fetchRandomNormalTarget: (...args: unknown[]) => mockFetchRandomNormalTarget(...args),
}));

describe("useTypingStore", () => {
  beforeEach(() => {
    mockFetchRandomNormalTarget.mockReset();
    // Reset store before each test
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
      currentRunId: null,
    });
    if (typeof window !== "undefined") {
      localStorage.clear();
    }

    // Mock global fetch for session API routes
    global.fetch = vi.fn().mockImplementation(async (url: string, options: any = {}) => {
      const urlObj = new URL(url, "http://localhost");

      if (urlObj.pathname === "/api/session") {
        const { sessionService } = await import("@/services/sessionService");
        const { db } = await import("@/utils/db");

        const testUser = await db.getOrCreateUserByClerkId("test_mock_clerk_id");
        const dbUserId = testUser.id;

        if (options.method === "POST") {
          const body = JSON.parse(options.body);
          const { action } = body;

          if (action === "start") {
            const runId = await sessionService.startPage(dbUserId, new Date(body.now));
            return {
              ok: true,
              json: async () => ({ runId }),
            };
          } else if (action === "finish") {
            const result = await sessionService.finishPage(
              dbUserId,
              body.runId,
              body.targetText,
              body.typedText,
              body.events,
              body.startedAt,
              body.finishedAt,
              body.targetId,
              body.language,
            );
            return {
              ok: true,
              json: async () => result,
            };
          } else if (action === "sync") {
            await db.syncSessionOnMount(dbUserId);
            return {
              ok: true,
              json: async () => ({ success: true }),
            };
          }
        }
      }
      return {
        ok: false,
        json: async () => ({ error: "Not found" }),
      };
    });
  });

  afterEach(async () => {
    await Promise.resolve();
    const { runInitPromise } = useTypingStore.getState();
    if (runInitPromise) {
      await runInitPromise.catch(() => {});
    }
  });

  it("should initialize with idle status", () => {
    const state = useTypingStore.getState();
    expect(state.status).toBe("idle");
    expect(state.typedText).toBe("");
    expect(state.events).toHaveLength(0);
  });

  it("should update typed text and record key on handlePhysicalKeyPress", () => {
    const store = useTypingStore.getState();

    // Press 'h'
    store.handlePhysicalKeyPress("KeyH", false, 1000);
    store.handlePhysicalKeyRelease("KeyH", 1060);

    expect(useTypingStore.getState().typedText).toBe("h");
    expect(useTypingStore.getState().status).toBe("running");
    expect(useTypingStore.getState().startedAt).toBe(1000);
    expect(useTypingStore.getState().events).toHaveLength(1); // First keystroke recorded
    expect(useTypingStore.getState().events[0]).toEqual({
      fromKey: null,
      toKey: "h",
      latencyMs: 0,
      keyChar: "h",
      holdDurationMs: 60,
      isCorrect: true,
      expectedChar: null,
    });

    // Press 'e'
    useTypingStore.getState().handlePhysicalKeyPress("KeyE", false, 1100);
    useTypingStore.getState().handlePhysicalKeyRelease("KeyE", 1170);

    expect(useTypingStore.getState().typedText).toBe("he");
    expect(useTypingStore.getState().events).toHaveLength(2);
    expect(useTypingStore.getState().events[1]).toEqual({
      fromKey: "h",
      toKey: "e",
      latencyMs: 100,
      keyChar: "e",
      holdDurationMs: 70,
      isCorrect: true,
      expectedChar: null,
    });
  });

  it("should handle backspace correctly", () => {
    const store = useTypingStore.getState();
    store.handlePhysicalKeyPress("KeyH", false, 1000);
    store.handlePhysicalKeyRelease("KeyH", 1050);

    store.handlePhysicalKeyPress("KeyE", false, 1100);
    store.handlePhysicalKeyRelease("KeyE", 1150);

    expect(useTypingStore.getState().typedText).toBe("he");

    store.handlePhysicalKeyPress("Backspace", false, 1200);
    store.handlePhysicalKeyRelease("Backspace", 1280);

    expect(useTypingStore.getState().typedText).toBe("h");

    // The physical key for backspace is also recorded as an event transition
    expect(useTypingStore.getState().events).toHaveLength(3);
    expect(useTypingStore.getState().events[2]).toEqual({
      fromKey: "e",
      toKey: "backspace",
      latencyMs: 100,
      keyChar: "backspace",
      holdDurationMs: 80,
      isCorrect: true,
      expectedChar: null,
    });
  });

  it("should handle Korean backspace correctly (deleting full character when correct, and jamo when incorrect)", async () => {
    const store = useTypingStore.getState();
    await store.setTarget("한글");

    // Type '한' (gks)
    store.handlePhysicalKeyPress("KeyG", false, 1000);
    store.handlePhysicalKeyPress("KeyK", false, 1050);
    store.handlePhysicalKeyPress("KeyS", false, 1100);
    expect(useTypingStore.getState().typedText).toBe("한");

    // Type 'ㄱ' (r) -> '한ㄱ'
    store.handlePhysicalKeyPress("KeyR", false, 1150);
    expect(useTypingStore.getState().typedText).toBe("한ㄱ");

    // Press Backspace -> deletes 'ㄱ' (jamo unit) because it is incomplete/incorrect
    store.handlePhysicalKeyPress("Backspace", false, 1200);
    expect(useTypingStore.getState().typedText).toBe("한");

    // Press Backspace again -> deletes '한' entirely because it is correct and completed
    store.handlePhysicalKeyPress("Backspace", false, 1250);
    expect(useTypingStore.getState().typedText).toBe("");
  });

  it("should handle shift and enter correctly", () => {
    const store = useTypingStore.getState();
    store.handlePhysicalKeyPress("KeyH", false, 1000);
    store.handlePhysicalKeyRelease("KeyH", 1050);

    // Press ShiftLeft (should be recorded, but typedText shouldn't change)
    store.handlePhysicalKeyPress("ShiftLeft", true, 1050);

    expect(useTypingStore.getState().typedText).toBe("h");
    expect(useTypingStore.getState().events).toHaveLength(2);
    expect(useTypingStore.getState().events[1]).toEqual({
      fromKey: "h",
      toKey: "shift_l",
      latencyMs: 50,
      keyChar: "shift_l",
      holdDurationMs: null,
      isCorrect: true,
      expectedChar: null,
    });

    // Press 'e' (with Shift, so 'E')
    useTypingStore.getState().handlePhysicalKeyPress("KeyE", true, 1100);

    // Release ShiftLeft and KeyE
    useTypingStore.getState().handlePhysicalKeyRelease("ShiftLeft", 1120);
    useTypingStore.getState().handlePhysicalKeyRelease("KeyE", 1155);

    expect(useTypingStore.getState().typedText).toBe("hE");
    expect(useTypingStore.getState().events).toHaveLength(3);
    expect(useTypingStore.getState().events[1].holdDurationMs).toBe(70); // 1120 - 1050
    expect(useTypingStore.getState().events[2]).toEqual({
      fromKey: "shift_l",
      toKey: "e",
      latencyMs: 50,
      keyChar: "E",
      holdDurationMs: 55, // 1155 - 1100
      isCorrect: false, // expected 'e' but got 'E'
      expectedChar: "e",
    });

    // Press Enter (should be recorded, but typedText shouldn't change)
    useTypingStore.getState().handlePhysicalKeyPress("Enter", false, 1150);
    useTypingStore.getState().handlePhysicalKeyRelease("Enter", 1240);

    expect(useTypingStore.getState().typedText).toBe("hE");
    expect(useTypingStore.getState().events).toHaveLength(4);
    expect(useTypingStore.getState().events[3]).toEqual({
      fromKey: "e",
      toKey: "enter",
      latencyMs: 50,
      keyChar: "enter",
      holdDurationMs: 90,
      isCorrect: true,
      expectedChar: null,
    });
  });

  it("should calculate correct hold durations when keyup order is interleaved", () => {
    const store = useTypingStore.getState();

    // ShiftLeft down at 1000ms
    store.handlePhysicalKeyPress("ShiftLeft", true, 1000);
    // KeyQ down at 1050ms
    store.handlePhysicalKeyPress("KeyQ", true, 1050);
    // ShiftLeft up at 1120ms
    store.handlePhysicalKeyRelease("ShiftLeft", 1120);
    // KeyQ up at 1160ms
    store.handlePhysicalKeyRelease("KeyQ", 1160);

    expect(useTypingStore.getState().events).toHaveLength(2);

    // Verify shift_l hold duration: 1120 - 1000 = 120ms
    expect(useTypingStore.getState().events[0]).toEqual(
      expect.objectContaining({
        toKey: "shift_l",
        holdDurationMs: 120,
      }),
    );

    // Verify q hold duration: 1160 - 1050 = 110ms
    expect(useTypingStore.getState().events[1]).toEqual(
      expect.objectContaining({
        toKey: "q",
        holdDurationMs: 110,
      }),
    );
  });

  it("should discard shift events that are released standalone", () => {
    const store = useTypingStore.getState();

    // 1. Press 'h' at 1000ms
    store.handlePhysicalKeyPress("KeyH", false, 1000);
    store.handlePhysicalKeyRelease("KeyH", 1050);

    // 2. Press ShiftLeft at 1200ms
    store.handlePhysicalKeyPress("ShiftLeft", true, 1200);

    expect(useTypingStore.getState().events).toHaveLength(2);
    expect(useTypingStore.getState().lastKey).toBe("shift_l");

    // 3. Release ShiftLeft at 1300ms (should discard it!)
    store.handlePhysicalKeyRelease("ShiftLeft", 1300);

    expect(useTypingStore.getState().events).toHaveLength(1);
    expect(useTypingStore.getState().events[0].toKey).toBe("h");
    expect(useTypingStore.getState().lastKey).toBe("h");
    expect(useTypingStore.getState().lastKeyAt).toBe(1000); // restored!

    // 4. Press 'e' at 1500ms (should calculate latency from 'h', not 'shift_l')
    store.handlePhysicalKeyPress("KeyE", false, 1500);
    store.handlePhysicalKeyRelease("KeyE", 1560);

    expect(useTypingStore.getState().events).toHaveLength(2);
    expect(useTypingStore.getState().events[1]).toEqual({
      fromKey: "h",
      toKey: "e",
      latencyMs: 500, // 1500 - 1000
      keyChar: "e",
      holdDurationMs: 60,
      isCorrect: true,
      expectedChar: null,
    });
  });

  it("should mark status as done when targetText is fully typed", async () => {
    const store = useTypingStore.getState();
    await store.setTarget("he"); // Target is 'he'

    store.handlePhysicalKeyPress("KeyH", false, 1000);
    expect(useTypingStore.getState().status).toBe("running");

    store.handlePhysicalKeyPress("KeyE", false, 1100);
    expect(useTypingStore.getState().status).toBe("done");
    expect(typeof useTypingStore.getState().finishedAt).toBe("number");
  });

  it("should NOT mark status as done when Korean input is only a partial match (e.g. typing ㄱ for 가)", async () => {
    const store = useTypingStore.getState();
    await store.setTarget("가"); // Target is '가'

    // Type 'ㄱ' (r)
    store.handlePhysicalKeyPress("KeyR", false, 1000);
    expect(useTypingStore.getState().typedText).toBe("ㄱ");
    expect(useTypingStore.getState().status).toBe("running");

    // Type 'ㅏ' (k) -> completes '가'
    store.handlePhysicalKeyPress("KeyK", false, 1100);
    expect(useTypingStore.getState().typedText).toBe("가");
    expect(useTypingStore.getState().status).toBe("done");
  });

  it("should clear events and reset status on reset", async () => {
    const store = useTypingStore.getState();
    store.handlePhysicalKeyPress("KeyH", false, 1000);
    store.handlePhysicalKeyPress("KeyE", false, 1100);

    expect(useTypingStore.getState().events).toHaveLength(2);

    await useTypingStore.getState().reset();

    expect(useTypingStore.getState().typedText).toBe("");
    expect(useTypingStore.getState().events).toHaveLength(0);
    expect(useTypingStore.getState().status).toBe("idle");
  });

  it("should transition to next target when Space or Enter is pressed when done", async () => {
    const mockTarget = {
      id: "target_done_next",
      content: "완료 후 다음 문장입니다.",
      language: "ko",
    };
    mockFetchRandomNormalTarget.mockResolvedValueOnce(mockTarget);

    const store = useTypingStore.getState();
    useTypingStore.setState({
      mode: "normal",
      targetText: "he",
      targetId: "target_old",
      status: "done",
    });

    store.handlePhysicalKeyPress("Space", false, 1000);
    await vi.waitFor(() => {
      expect(useTypingStore.getState().targetId).toBe("target_done_next");
    });
  });

  it("should NOT transition to next target when Space or Enter is pressed when not done", () => {
    const store = useTypingStore.getState();
    useTypingStore.setState({ targetText: "he", status: "running" });

    store.handlePhysicalKeyPress("Space", false, 1000);
    expect(useTypingStore.getState().targetText).toBe("he");
    expect(useTypingStore.getState().typedText).toBe(" ");
  });

  it("should create a run and save a page to the db when typing finishes", async () => {
    const { db } = await import("@/utils/db");
    const store = useTypingStore.getState();
    await store.setTarget("he");

    // Reset DB for clean test state
    if (typeof window !== "undefined") {
      localStorage.clear();
    }

    // Type 'h'
    store.handlePhysicalKeyPress("KeyH", false, 1000);

    // Await run creation in background microtasks
    await Promise.resolve();
    const runInitPromise = useTypingStore.getState().runInitPromise;
    if (runInitPromise) {
      await runInitPromise;
    }

    const runId = useTypingStore.getState().currentRunId;
    expect(runId).not.toBeNull();

    const run = await db.getRun(runId!);
    expect(run).not.toBeNull();
    expect(run?.status).toBe("in_progress");

    // Type 'e' -> completes session
    store.handlePhysicalKeyPress("KeyE", false, 1100);
    expect(useTypingStore.getState().status).toBe("done");

    // Wait and verify it is NOT saved yet
    await new Promise((resolve) => setTimeout(resolve, 150));
    let pages = await db.getPagesForRun(runId!);
    expect(pages).toHaveLength(0);

    // Trigger save directly and wait for it to complete in DB
    await store.saveCurrentPage();

    pages = await db.getPagesForRun(runId!);
    expect(pages).toHaveLength(1);
    expect(pages[0].typedText).toBe("he");
    expect(pages[0].cpm).toBeGreaterThan(0);
    expect(pages[0].accuracy).toBe(100);
    expect(useTypingStore.getState().pageMetricsFlash).toEqual({
      cpm: pages[0].cpm,
      wpm: pages[0].wpm,
      accuracy: pages[0].accuracy,
    });
  });

  it("should not finish in hardcore mode if there are excess characters (INSERT)", () => {
    useTypingStore.setState({
      mode: "hardcore",
      targetText: "구구",
      targetLanguage: "ko",
      targetId: "hardcore_test",
      typedText: "",
      qwertyBuffer: "",
      status: "idle",
    });

    const store = useTypingStore.getState();

    // Type '구' ('r', 'n') -> matches first '구'
    store.handlePhysicalKeyPress("KeyR", false, 1000);
    store.handlePhysicalKeyRelease("KeyR", 1050);
    store.handlePhysicalKeyPress("KeyN", false, 1100);
    store.handlePhysicalKeyRelease("KeyN", 1150);

    expect(useTypingStore.getState().status).toBe("running");

    // Type typo 'ㅌ' ('x') -> becomes '구ㅌ' (Qwerty 'rnx')
    useTypingStore.getState().handlePhysicalKeyPress("KeyX", false, 1200);
    useTypingStore.getState().handlePhysicalKeyRelease("KeyX", 1250);

    // Type '구' ('r', 'n') -> becomes '구ㅌ구' (Qwerty 'rnxrn')
    // Both target '구' characters are matched, but there is an 'INSERT' ('ㅌ') in the middle.
    useTypingStore.getState().handlePhysicalKeyPress("KeyR", false, 1300);
    useTypingStore.getState().handlePhysicalKeyRelease("KeyR", 1350);
    useTypingStore.getState().handlePhysicalKeyPress("KeyN", false, 1400);
    useTypingStore.getState().handlePhysicalKeyRelease("KeyN", 1450);

    // It should not finish since it contains an INSERT
    expect(useTypingStore.getState().status).toBe("running");
    expect(useTypingStore.getState().finishedAt).toBeNull();

    // Press Backspace three times to remove '구' (2 jamos) and 'ㅌ' (1 jamo)
    // This empties the buffer as the last backspace deletes the whole visual character '구'
    useTypingStore.getState().handlePhysicalKeyPress("Backspace", false, 1500);
    useTypingStore.getState().handlePhysicalKeyRelease("Backspace", 1550);
    useTypingStore.getState().handlePhysicalKeyPress("Backspace", false, 1600);
    useTypingStore.getState().handlePhysicalKeyRelease("Backspace", 1650);
    useTypingStore.getState().handlePhysicalKeyPress("Backspace", false, 1660);
    useTypingStore.getState().handlePhysicalKeyRelease("Backspace", 1670);

    expect(useTypingStore.getState().status).toBe("running");

    // Type '구구' ('r', 'n', 'r', 'n') -> buffer becomes 'rnrn' ('구구'), matching perfectly
    useTypingStore.getState().handlePhysicalKeyPress("KeyR", false, 1700);
    useTypingStore.getState().handlePhysicalKeyRelease("KeyR", 1750);
    useTypingStore.getState().handlePhysicalKeyPress("KeyN", false, 1800);
    useTypingStore.getState().handlePhysicalKeyRelease("KeyN", 1850);
    useTypingStore.getState().handlePhysicalKeyPress("KeyR", false, 1900);
    useTypingStore.getState().handlePhysicalKeyRelease("KeyR", 1950);
    useTypingStore.getState().handlePhysicalKeyPress("KeyN", false, 2000);
    useTypingStore.getState().handlePhysicalKeyRelease("KeyN", 2050);

    // Now it should finish successfully
    expect(useTypingStore.getState().status).toBe("done");
    expect(useTypingStore.getState().finishedAt).not.toBeNull();
  });

  it("should create a new run if idle for more than 3 minutes on next session typing start", async () => {
    const { db } = await import("@/utils/db");
    const store = useTypingStore.getState();
    await store.setTarget("he");

    // 1. First session
    store.handlePhysicalKeyPress("KeyH", false, 1000);
    await new Promise((resolve) => setTimeout(resolve, 150));

    const runId1 = useTypingStore.getState().currentRunId!;
    store.handlePhysicalKeyPress("KeyE", false, 1100);

    // Trigger save directly and wait for it to complete in DB
    await store.saveCurrentPage();
    const pages1 = await db.getPagesForRun(runId1);
    expect(pages1).toHaveLength(1);

    // 2. Idle for 4 minutes (240,000ms)
    // Manually ensure status is in_progress but keep it in localstorage
    await db.updateRun(runId1, { status: "in_progress", finished_at: null });

    // Start next typing after 4 minutes (timestamp = 250,000)
    await store.reset();
    await store.setTarget("he");
    store.handlePhysicalKeyPress("KeyH", false, 250000);

    // Wait for async init run
    await new Promise((resolve) => setTimeout(resolve, 150));

    const runId2 = useTypingStore.getState().currentRunId;
    expect(runId2).not.toBeNull();
    expect(runId2).not.toBe(runId1); // Should be a new run id

    const prevRun = await db.getRun(runId1);
    expect(prevRun?.status).toBe("completed");
  });

  it("should split and finalize session if typing takes more than 5 minutes", async () => {
    const { db } = await import("@/utils/db");
    const store = useTypingStore.getState();
    await store.setTarget("he");

    // Press 'h' at 1,000ms
    store.handlePhysicalKeyPress("KeyH", false, 1000);
    await new Promise((resolve) => setTimeout(resolve, 150));

    const runId1 = useTypingStore.getState().currentRunId!;

    // Press 'e' at 1,000ms + 5 minutes (301,000ms)
    store.handlePhysicalKeyPress("KeyE", false, 302000);

    // Trigger save directly and wait for it to complete in DB
    await store.saveCurrentPage();

    const finalRunId = useTypingStore.getState().currentRunId!;
    expect(finalRunId).not.toBe(runId1);

    const prevRun = await db.getRun(runId1);
    expect(prevRun?.status).toBe("completed");

    const nextRun = await db.getRun(finalRunId);
    expect(nextRun?.status).toBe("in_progress");

    const pages = await db.getPagesForRun(finalRunId);
    expect(pages).toHaveLength(1);
    expect(pages[0].runId).toBe(finalRunId);
  });

  it("should allow backspace in done status to revert to running status and delete the last character", async () => {
    const store = useTypingStore.getState();
    await store.setTarget("he");

    // Type 'h'
    store.handlePhysicalKeyPress("KeyH", false, 1000);
    // Type 'e' -> completes the target, status becomes 'done'
    store.handlePhysicalKeyPress("KeyE", false, 1100);

    expect(useTypingStore.getState().status).toBe("done");
    expect(useTypingStore.getState().typedText).toBe("he");

    // Press Backspace in 'done' status
    store.handlePhysicalKeyPress("Backspace", false, 1200);

    expect(useTypingStore.getState().status).toBe("running");
    expect(useTypingStore.getState().finishedAt).toBeNull();
    expect(useTypingStore.getState().typedText).toBe("h");
  });
});
