import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTypingStore } from "@/store/useTypingStore";
import { act } from "@testing-library/react";

// Mock fetch for topic generate API
global.fetch = vi.fn();

describe("createInputSlice - Topic Mode", () => {
  beforeEach(() => {
    useTypingStore.getState().reset();
    useTypingStore.getState().setMode("topic");
    vi.clearAllMocks();
  });

  it("should initialize topic mode correctly", () => {
    const state = useTypingStore.getState();
    expect(state.mode).toBe("topic");
    expect(state.isTopicInputActive).toBe(true);
    expect(state.topicTargets).toEqual([]);
    expect(state.topicTargetIndex).toBe(-1);
    expect(state.currentTopic).toBe("");
  });

  it("should handle fetchTopicTarget success", async () => {
    const mockData = [
      { id: "1", content: "문장 1", language: "ko" },
      { id: "2", content: "문장 2", language: "ko" },
    ];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockData }),
    });

    await act(async () => {
      await useTypingStore.getState().fetchTopicTarget("테스트 주제");
    });

    const state = useTypingStore.getState();
    expect(state.currentTopic).toBe("테스트 주제");
    expect(state.topicTargets).toHaveLength(2);
    expect(state.topicTargetIndex).toBe(0);
    expect(state.isTopicInputActive).toBe(false);
    expect(state.targetText).toBe("문장 1");
  });

  it("should fall back to Gemini generate when vector search returns 404", async () => {
    const generatedData = [
      { id: "gen-1", content: "생성 문장 1", language: "ko" },
      { id: "gen-2", content: "생성 문장 2", language: "ko" },
      { id: "gen-3", content: "생성 문장 3", language: "ko" },
    ];

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "No matching targets found" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: generatedData }),
      });

    await act(async () => {
      await useTypingStore.getState().fetchTopicTarget("새 주제");
    });

    const state = useTypingStore.getState();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(state.topicTargets).toHaveLength(3);
    expect(state.targetText).toBe("생성 문장 1");
    expect(state.isTopicInputActive).toBe(false);
  });

  it("should handle fetchTopicTarget failure", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "에러 발생" }),
    });

    await act(async () => {
      await useTypingStore.getState().fetchTopicTarget("실패 주제");
    });

    const state = useTypingStore.getState();
    expect(state.isTopicInputActive).toBe(true);
    // targetText should display the error message as intended for now (fallback)
    expect(state.targetText).toBe("에러 발생");
    expect(state.topicTargets).toHaveLength(0);
  });

  it("should cycle through topicTargets and prefetch more when low on targets", async () => {
    const initialData = [
      { id: "1", content: "문장 1", language: "ko" },
      { id: "2", content: "문장 2", language: "ko" },
      { id: "3", content: "문장 3", language: "ko" },
      { id: "4", content: "문장 4", language: "ko" },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: initialData }),
    });

    // First fetch sets targets to length 4, index 0
    await act(async () => {
      await useTypingStore.getState().fetchTopicTarget("테스트 주제");
    });

    // Mock response for prefetch
    const prefetchData = [{ id: "5", content: "문장 5", language: "ko" }];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: prefetchData }),
    });

    // Move to next target (index 1). remainingCount = 4 - 1 - 1 = 2 <= 3, so prefetch is triggered
    await act(async () => {
      useTypingStore.getState().nextTarget();
    });

    const state = useTypingStore.getState();
    expect(state.topicTargetIndex).toBe(1);
    expect(state.targetText).toBe("문장 2");

    // Wait for the async prefetch to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    const updatedState = useTypingStore.getState();
    // After prefetch resolves, it appends to topicTargets
    expect(updatedState.topicTargets).toHaveLength(5);
    expect(updatedState.topicTargets[4].content).toBe("문장 5");
  });

  it("should handle prefetch failure gracefully without appending error target", async () => {
    const initialData = [
      { id: "1", content: "문장 1", language: "ko" },
      { id: "2", content: "문장 2", language: "ko" },
      { id: "3", content: "문장 3", language: "ko" },
      { id: "4", content: "문장 4", language: "ko" },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: initialData }),
    });

    await act(async () => {
      await useTypingStore.getState().fetchTopicTarget("테스트 주제");
    });

    // Mock failing prefetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "백그라운드 에러" }),
    });

    // Move to next target (index 1), triggers prefetch
    await act(async () => {
      useTypingStore.getState().nextTarget();
    });

    // Wait for the async prefetch to reject/resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    const state = useTypingStore.getState();
    // It should NOT append the error message to topicTargets
    expect(state.topicTargets).toHaveLength(4);
    expect(state.isTopicGenerating).toBe(false);
  });

  it("should cycle through topicTargets and support full cyclic ArrowLeft history", async () => {
    const initialData = [
      { id: "1", content: "문장 1", language: "ko" },
      { id: "2", content: "문장 2", language: "ko" },
      { id: "3", content: "문장 3", language: "ko" },
      { id: "4", content: "문장 4", language: "ko" },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: initialData }),
    });

    await act(async () => {
      await useTypingStore.getState().fetchTopicTarget("테스트 주제");
    });

    // Mock response for prefetch triggered during 1st nextTarget
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    // 1st nextTarget -> index 1.
    // topicTargets: [문장 1, 문장 2, 문장 3, 문장 4], index: 1
    await act(async () => {
      useTypingStore.getState().nextTarget();
    });

    let state = useTypingStore.getState();
    expect(state.topicTargetIndex).toBe(1);
    expect(state.targetText).toBe("문장 2");
    expect(state.topicTargets).toHaveLength(4);

    // Mock response for prefetch triggered during 2nd nextTarget
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    // 2nd nextTarget -> nextIndex = 2. No slicing.
    await act(async () => {
      useTypingStore.getState().nextTarget();
    });

    state = useTypingStore.getState();
    expect(state.topicTargetIndex).toBe(2);
    expect(state.targetText).toBe("문장 3");
    expect(state.topicTargets).toHaveLength(4);

    // Press ArrowLeft -> should go back to "문장 2" (index 1)
    await act(async () => {
      useTypingStore.getState().handlePhysicalKeyPress("ArrowLeft", false, Date.now());
    });

    state = useTypingStore.getState();
    expect(state.topicTargetIndex).toBe(1);
    expect(state.targetText).toBe("문장 2");

    // Press ArrowLeft again -> should go back to "문장 1" (index 0)
    await act(async () => {
      useTypingStore.getState().handlePhysicalKeyPress("ArrowLeft", false, Date.now());
    });

    state = useTypingStore.getState();
    expect(state.topicTargetIndex).toBe(0);
    expect(state.targetText).toBe("문장 1");

    // Press ArrowLeft again -> should cycle around to "문장 4" (index 3)
    await act(async () => {
      useTypingStore.getState().handlePhysicalKeyPress("ArrowLeft", false, Date.now());
    });

    state = useTypingStore.getState();
    expect(state.topicTargetIndex).toBe(3);
    expect(state.targetText).toBe("문장 4");
  });
});
