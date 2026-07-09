import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTypingStore } from "../useTypingStore";

const TARGET_A = {
  id: "target_a",
  content: "첫 번째 연습 문장입니다.",
  language: "ko",
};
const TARGET_B = {
  id: "target_b",
  content: "두 번째 연습 문장입니다.",
  language: "ko",
};
const TARGET_C = {
  id: "target_c",
  content: "세 번째 연습 문장입니다.",
  language: "ko",
};

const mockFetchRandomNormalTarget = vi.fn();

vi.mock("@/lib/practice/normalTargetClient", () => ({
  fetchRandomNormalTarget: (...args: unknown[]) => mockFetchRandomNormalTarget(...args),
}));

describe("createInputSlice normal mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchRandomNormalTarget.mockImplementation(async (language: string, excludeId?: string) => {
      if (language === "en") {
        return {
          id: "target_en",
          content: "English practice sentence.",
          language: "en",
        };
      }
      if (excludeId === TARGET_A.id) {
        return TARGET_B;
      }
      if (excludeId === TARGET_B.id) {
        return TARGET_C;
      }
      return TARGET_A;
    });
    useTypingStore.setState({
      mode: "normal",
      targetText: "",
      targetLanguage: "ko",
      targetId: "",
      normalPreviousTarget: null,
      normalPrefetchedTarget: null,
      typedText: "",
      qwertyBuffer: "",
      events: [],
      status: "idle",
      startedAt: null,
      finishedAt: null,
    });
  });

  it("loads a random target on initial fetch", async () => {
    await useTypingStore.getState().fetchInitialNormalTarget("ko");

    const state = useTypingStore.getState();
    expect(state.targetId).toBe("target_a");
    expect(state.targetText).toBe(TARGET_A.content);
    expect(state.normalPreviousTarget).toBeNull();
    expect(mockFetchRandomNormalTarget).toHaveBeenCalledWith("ko", undefined);
  });

  it("stores only the immediately previous target when moving forward", async () => {
    await useTypingStore.getState().fetchInitialNormalTarget("ko");
    await useTypingStore.getState().nextTarget();
    await useTypingStore.getState().nextTarget();

    const state = useTypingStore.getState();
    expect(state.targetId).toBe("target_c");
    expect(state.normalPreviousTarget).toEqual(TARGET_B);
    expect(mockFetchRandomNormalTarget).toHaveBeenCalledWith("ko", "target_b");
  });

  it("restores only one previous target with ArrowLeft", async () => {
    await useTypingStore.getState().fetchInitialNormalTarget("ko");
    await useTypingStore.getState().nextTarget();

    useTypingStore.getState().handlePhysicalKeyPress("ArrowLeft", false, 1000);

    await vi.waitFor(() => {
      expect(useTypingStore.getState().targetId).toBe("target_a");
    });

    let state = useTypingStore.getState();
    expect(state.normalPreviousTarget).toBeNull();

    useTypingStore.getState().handlePhysicalKeyPress("ArrowLeft", false, 2000);
    state = useTypingStore.getState();
    expect(state.targetId).toBe("target_a");
  });

  it("excludes the current target id when fetching the next random sentence", async () => {
    useTypingStore.setState({
      targetId: TARGET_A.id,
      targetText: TARGET_A.content,
      targetLanguage: TARGET_A.language,
    });

    await useTypingStore.getState().nextTarget();

    expect(mockFetchRandomNormalTarget).toHaveBeenCalledWith("ko", TARGET_A.id);
    expect(useTypingStore.getState().targetId).toBe("target_b");
  });

  it("clears previous history when language changes in normal mode", async () => {
    await useTypingStore.getState().fetchInitialNormalTarget("ko");
    await useTypingStore.getState().nextTarget();

    await useTypingStore.getState().setTargetLanguage("en");

    const state = useTypingStore.getState();
    expect(state.targetLanguage).toBe("en");
    expect(state.targetId).toBe("target_en");
    expect(state.normalPreviousTarget).toBeNull();
    expect(mockFetchRandomNormalTarget).toHaveBeenCalledWith("en", undefined);
  });

  it("saves a completed page before restoring the previous target", async () => {
    const saveSpy = vi.spyOn(useTypingStore.getState(), "saveCurrentPage");

    await useTypingStore.getState().fetchInitialNormalTarget("ko");
    await useTypingStore.getState().nextTarget();

    useTypingStore.setState({ status: "done", startedAt: 1000, finishedAt: 2000 });
    useTypingStore.getState().handlePhysicalKeyPress("ArrowLeft", false, 3000);

    await vi.waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    saveSpy.mockRestore();
  });

  it("saves a completed page before changing language in normal mode", async () => {
    const saveSpy = vi.spyOn(useTypingStore.getState(), "saveCurrentPage");

    await useTypingStore.getState().fetchInitialNormalTarget("ko");
    useTypingStore.setState({ status: "done", startedAt: 1000, finishedAt: 2000 });

    await useTypingStore.getState().setTargetLanguage("en");

    expect(saveSpy).toHaveBeenCalled();
    saveSpy.mockRestore();
  });
});
