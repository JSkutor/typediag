import { describe, it, expect, beforeEach } from "vitest";
import { useTypingStore } from "./useTypingStore";

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
    });
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
    expect(useTypingStore.getState().events).toHaveLength(0); // No transition yet

    // Press 'e'
    useTypingStore.getState().handlePhysicalKeyPress("KeyE", false, 1100);
    expect(useTypingStore.getState().typedText).toBe("he");
    expect(useTypingStore.getState().events).toHaveLength(1);
    expect(useTypingStore.getState().events[0]).toEqual({
      fromKey: "h",
      toKey: "e",
      latencyMs: 100,
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
    expect(useTypingStore.getState().events).toHaveLength(2);
    expect(useTypingStore.getState().events[1]).toEqual({
      fromKey: "e",
      toKey: "backspace",
      latencyMs: 100,
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
    
    expect(useTypingStore.getState().events).toHaveLength(1);
    
    useTypingStore.getState().reset();
    
    expect(useTypingStore.getState().typedText).toBe("");
    expect(useTypingStore.getState().events).toHaveLength(0);
    expect(useTypingStore.getState().status).toBe("idle");
  });
});
