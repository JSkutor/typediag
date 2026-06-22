import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTypingStore } from "@/store/useTypingStore";
import { act } from "@testing-library/react";

// Mock fetch for subject generate API
global.fetch = vi.fn();

describe("createInputSlice - Subject Mode", () => {
  beforeEach(() => {
    useTypingStore.getState().reset();
    useTypingStore.getState().setMode("subject");
    vi.clearAllMocks();
  });

  it("should initialize subject mode correctly", () => {
    const state = useTypingStore.getState();
    expect(state.mode).toBe("subject");
    expect(state.isSubjectInputActive).toBe(true);
    expect(state.subjectTargets).toEqual([]);
    expect(state.subjectTargetIndex).toBe(-1);
    expect(state.currentSubject).toBe("");
  });

  it("should handle fetchSubjectTarget success", async () => {
    const mockData = [
      { id: "1", content: "문장 1", language: "ko" },
      { id: "2", content: "문장 2", language: "ko" },
    ];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockData }),
    });

    await act(async () => {
      await useTypingStore.getState().fetchSubjectTarget("테스트 주제");
    });

    const state = useTypingStore.getState();
    expect(state.currentSubject).toBe("테스트 주제");
    expect(state.subjectTargets).toHaveLength(2);
    expect(state.subjectTargetIndex).toBe(0);
    expect(state.isSubjectInputActive).toBe(false);
    expect(state.targetText).toBe("문장 1");
  });

  it("should handle fetchSubjectTarget failure", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "에러 발생" }),
    });

    await act(async () => {
      await useTypingStore.getState().fetchSubjectTarget("실패 주제");
    });

    const state = useTypingStore.getState();
    expect(state.isSubjectInputActive).toBe(true);
    // targetText should display the error message as intended for now (fallback)
    expect(state.targetText).toBe("에러 발생");
    expect(state.subjectTargets).toHaveLength(0);
  });

  it("should cycle through subjectTargets and prefetch more when low on targets", async () => {
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
      await useTypingStore.getState().fetchSubjectTarget("테스트 주제");
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
    expect(state.subjectTargetIndex).toBe(1);
    expect(state.targetText).toBe("문장 2");

    // Wait for the async prefetch to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    const updatedState = useTypingStore.getState();
    // After prefetch resolves, it appends to subjectTargets
    expect(updatedState.subjectTargets).toHaveLength(5);
    expect(updatedState.subjectTargets[4].content).toBe("문장 5");
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
      await useTypingStore.getState().fetchSubjectTarget("테스트 주제");
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
    // It should NOT append the error message to subjectTargets
    expect(state.subjectTargets).toHaveLength(4);
    expect(state.isSubjectGenerating).toBe(false);
  });

  it("should cycle through subjectTargets and support full cyclic ArrowLeft history", async () => {
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
      await useTypingStore.getState().fetchSubjectTarget("테스트 주제");
    });

    // Mock response for prefetch triggered during 1st nextTarget
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    // 1st nextTarget -> index 1.
    // subjectTargets: [문장 1, 문장 2, 문장 3, 문장 4], index: 1
    await act(async () => {
      useTypingStore.getState().nextTarget();
    });
    
    let state = useTypingStore.getState();
    expect(state.subjectTargetIndex).toBe(1);
    expect(state.targetText).toBe("문장 2");
    expect(state.subjectTargets).toHaveLength(4);

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
    expect(state.subjectTargetIndex).toBe(2);
    expect(state.targetText).toBe("문장 3");
    expect(state.subjectTargets).toHaveLength(4);

    // Press ArrowLeft -> should go back to "문장 2" (index 1)
    await act(async () => {
      useTypingStore.getState().handlePhysicalKeyPress("ArrowLeft", false, Date.now());
    });

    state = useTypingStore.getState();
    expect(state.subjectTargetIndex).toBe(1);
    expect(state.targetText).toBe("문장 2");

    // Press ArrowLeft again -> should go back to "문장 1" (index 0)
    await act(async () => {
      useTypingStore.getState().handlePhysicalKeyPress("ArrowLeft", false, Date.now());
    });

    state = useTypingStore.getState();
    expect(state.subjectTargetIndex).toBe(0);
    expect(state.targetText).toBe("문장 1");

    // Press ArrowLeft again -> should cycle around to "문장 4" (index 3)
    await act(async () => {
      useTypingStore.getState().handlePhysicalKeyPress("ArrowLeft", false, Date.now());
    });

    state = useTypingStore.getState();
    expect(state.subjectTargetIndex).toBe(3);
    expect(state.targetText).toBe("문장 4");
  });
});
