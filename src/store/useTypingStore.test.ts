import { describe, it, expect, beforeEach } from "vitest";
import { useTypingStore } from "./useTypingStore";
import targets from "@/data/targets.json";

describe("useTypingStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useTypingStore.setState({
      targetText: "hello",
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
    expect(useTypingStore.getState().typedText).toBe("h");
    expect(useTypingStore.getState().status).toBe("running");
    expect(useTypingStore.getState().startedAt).toBe(1000);
    expect(useTypingStore.getState().events).toHaveLength(1); // First keystroke recorded
    expect(useTypingStore.getState().events[0]).toEqual({
      fromKey: null,
      toKey: "h",
      latencyMs: 0,
      keyChar: "h",
      holdDurationMs: 50,
      isCorrect: true,
      expectedChar: null,
    });

    // Press 'e'
    useTypingStore.getState().handlePhysicalKeyPress("KeyE", false, 1100);
    expect(useTypingStore.getState().typedText).toBe("he");
    expect(useTypingStore.getState().events).toHaveLength(2);
    expect(useTypingStore.getState().events[1]).toEqual({
      fromKey: "h",
      toKey: "e",
      latencyMs: 100,
      keyChar: "e",
      holdDurationMs: 50,
      isCorrect: true,
      expectedChar: null,
    });
  });

  it("should handle backspace correctly", () => {
    const store = useTypingStore.getState();
    store.handlePhysicalKeyPress("KeyH", false, 1000);
    store.handlePhysicalKeyPress("KeyE", false, 1100);
    expect(useTypingStore.getState().typedText).toBe("he");

    store.handlePhysicalKeyPress("Backspace", false, 1200);
    expect(useTypingStore.getState().typedText).toBe("h");
    
    // The physical key for backspace is also recorded as an event transition
    expect(useTypingStore.getState().events).toHaveLength(3);
    expect(useTypingStore.getState().events[2]).toEqual({
      fromKey: "e",
      toKey: "backspace",
      latencyMs: 100,
      keyChar: "backspace",
      holdDurationMs: 50,
      isCorrect: true,
      expectedChar: null,
    });
  });

  it("should handle shift and enter correctly", () => {
    const store = useTypingStore.getState();
    store.handlePhysicalKeyPress("KeyH", false, 1000);
    
    // Press ShiftLeft (should be recorded, but typedText shouldn't change)
    store.handlePhysicalKeyPress("ShiftLeft", true, 1050);
    expect(useTypingStore.getState().typedText).toBe("h");
    expect(useTypingStore.getState().events).toHaveLength(2);
    expect(useTypingStore.getState().events[1]).toEqual({
      fromKey: "h",
      toKey: "shift_l",
      latencyMs: 50,
      keyChar: "shift_l",
      holdDurationMs: 50,
      isCorrect: true,
      expectedChar: null,
    });

    // Press 'e' (with Shift, so 'E')
    useTypingStore.getState().handlePhysicalKeyPress("KeyE", true, 1100);
    expect(useTypingStore.getState().typedText).toBe("hE");
    expect(useTypingStore.getState().events).toHaveLength(3);
    expect(useTypingStore.getState().events[2]).toEqual({
      fromKey: "shift_l",
      toKey: "e",
      latencyMs: 50,
      keyChar: "E",
      holdDurationMs: 50,
      isCorrect: false, // expected 'e' but got 'E'
      expectedChar: "e",
    });

    // Press Enter (should be recorded, but typedText shouldn't change)
    useTypingStore.getState().handlePhysicalKeyPress("Enter", false, 1150);
    expect(useTypingStore.getState().typedText).toBe("hE");
    expect(useTypingStore.getState().events).toHaveLength(4);
    expect(useTypingStore.getState().events[3]).toEqual({
      fromKey: "e",
      toKey: "enter",
      latencyMs: 50,
      keyChar: "enter",
      holdDurationMs: 50,
      isCorrect: true,
      expectedChar: null,
    });
  });

  it("should mark status as done when targetText is fully typed", () => {
    const store = useTypingStore.getState();
    store.setTarget("he"); // Target is 'he'
    
    store.handlePhysicalKeyPress("KeyH", false, 1000);
    expect(useTypingStore.getState().status).toBe("running");
    
    store.handlePhysicalKeyPress("KeyE", false, 1100);
    expect(useTypingStore.getState().status).toBe("done");
    expect(typeof useTypingStore.getState().finishedAt).toBe("number");
  });

  it("should clear events and reset status on reset", () => {
    const store = useTypingStore.getState();
    store.handlePhysicalKeyPress("KeyH", false, 1000);
    store.handlePhysicalKeyPress("KeyE", false, 1100);
    
    expect(useTypingStore.getState().events).toHaveLength(2);
    
    useTypingStore.getState().reset();
    
    expect(useTypingStore.getState().typedText).toBe("");
    expect(useTypingStore.getState().events).toHaveLength(0);
    expect(useTypingStore.getState().status).toBe("idle");
  });

  it("should cycle through targets using nextTarget", () => {
    // If targetText is not in targets, should go to index 0
    useTypingStore.setState({ targetText: "not-in-targets" });
    useTypingStore.getState().nextTarget();
    expect(useTypingStore.getState().targetText).toBe(targets[0].content);

    // If targetText is first target, should go to index 1
    useTypingStore.getState().nextTarget();
    expect(useTypingStore.getState().targetText).toBe(targets[1].content);

    // If targetText is last target, should cycle back to index 0
    useTypingStore.setState({ targetText: targets[targets.length - 1].content });
    useTypingStore.getState().nextTarget();
    expect(useTypingStore.getState().targetText).toBe(targets[0].content);
  });

  it("should transition to next target when ArrowRight is pressed", () => {
    const store = useTypingStore.getState();
    useTypingStore.setState({ targetText: targets[0].content });
    
    store.handlePhysicalKeyPress("ArrowRight", false, 1000);
    expect(useTypingStore.getState().targetText).toBe(targets[1].content);
  });

  it("should transition to next target when Space or Enter is pressed when done", () => {
    const store = useTypingStore.getState();
    useTypingStore.setState({ targetText: "he", status: "done" });
    
    store.handlePhysicalKeyPress("Space", false, 1000);
    expect(useTypingStore.getState().targetText).toBe(targets[0].content);

    useTypingStore.setState({ targetText: "he", status: "done" });
    store.handlePhysicalKeyPress("Enter", false, 1000);
    expect(useTypingStore.getState().targetText).toBe(targets[0].content);
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
    store.setTarget("he");
    
    // Reset DB for clean test state
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
    
    // Type 'h'
    store.handlePhysicalKeyPress("KeyH", false, 1000);
    
    // Await run creation in background microtasks
    await new Promise((resolve) => setTimeout(resolve, 10));

    const runId = useTypingStore.getState().currentRunId;
    expect(runId).not.toBeNull();
    
    const run = await db.getRun(runId!);
    expect(run).not.toBeNull();
    expect(run?.status).toBe("in_progress");

    // Type 'e' -> completes session
    store.handlePhysicalKeyPress("KeyE", false, 1100);
    expect(useTypingStore.getState().status).toBe("done");

    // Wait for the async db save to run in microtasks
    await new Promise((resolve) => setTimeout(resolve, 10));

    const pages = await db.getPagesForRun(runId!);
    expect(pages).toHaveLength(1);
    expect(pages[0].typed_text).toBe("he");
    expect(pages[0].cpm).toBeGreaterThan(0);
    expect(pages[0].accuracy).toBe(100);
    expect(pages[0].key_events).toHaveLength(2); // Null from_key event + transition event
  });

  it("should create a new run if idle for more than 5 minutes on next session typing start", async () => {
    const { db } = await import("@/utils/db");
    const store = useTypingStore.getState();
    store.setTarget("he");
    
    // 1. First session
    store.handlePhysicalKeyPress("KeyH", false, 1000);
    await new Promise((resolve) => setTimeout(resolve, 10));
    
    const runId1 = useTypingStore.getState().currentRunId!;
    store.handlePhysicalKeyPress("KeyE", false, 1100);
    
    await new Promise((resolve) => setTimeout(resolve, 20));
    const pages1 = await db.getPagesForRun(runId1);
    expect(pages1).toHaveLength(1);
    
    // 2. Idle for 6 minutes (360,000ms)
    // Manually ensure status is in_progress but keep it in localstorage
    await db.updateRun(runId1, { status: "in_progress", finished_at: null });
    
    // Start next typing after 6 minutes (timestamp = 361,000)
    store.reset();
    store.setTarget("he");
    store.handlePhysicalKeyPress("KeyH", false, 370000);
    
    // Wait for async init run
    await new Promise((resolve) => setTimeout(resolve, 20));
    
    const runId2 = useTypingStore.getState().currentRunId;
    expect(runId2).not.toBeNull();
    expect(runId2).not.toBe(runId1); // Should be a new run id
    
    const prevRun = await db.getRun(runId1);
    expect(prevRun?.status).toBe("completed");
  });

  it("should split and finalize session if typing takes more than 10 minutes", async () => {
    const { db } = await import("@/utils/db");
    const store = useTypingStore.getState();
    store.setTarget("he");
    
    // Press 'h' at 1,000ms
    store.handlePhysicalKeyPress("KeyH", false, 1000);
    await new Promise((resolve) => setTimeout(resolve, 10));
    
    const runId1 = useTypingStore.getState().currentRunId!;
    
    // Press 'e' at 1,000ms + 11 minutes (661,000ms)
    store.handlePhysicalKeyPress("KeyE", false, 662000);
    
    await new Promise((resolve) => setTimeout(resolve, 20));
    
    const finalRunId = useTypingStore.getState().currentRunId!;
    expect(finalRunId).not.toBe(runId1);
    
    const prevRun = await db.getRun(runId1);
    expect(prevRun?.status).toBe("completed");
    
    const nextRun = await db.getRun(finalRunId);
    expect(nextRun?.status).toBe("in_progress");
    
    const pages = await db.getPagesForRun(finalRunId);
    expect(pages).toHaveLength(1);
    expect(pages[0].run_id).toBe(finalRunId);
  });
});
