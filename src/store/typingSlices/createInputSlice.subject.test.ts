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

    // Move to next target (index 1). length (4) - nextIndex (1) = 3 <= 3, so prefetch is triggered
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
});
