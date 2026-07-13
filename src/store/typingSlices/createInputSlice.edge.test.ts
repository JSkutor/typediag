import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTypingStore } from "../useTypingStore";
import { buildFeedbackEmptyAlignments } from "@/lib/feedback/freeformTyping";

vi.mock("@/lib/practice/hardcoreModel", () => ({
  generateHardcorePracticeText: vi.fn(() => "mock_hardcore_text"),
}));

describe("createInputSlice edge cases", () => {
  beforeEach(() => {
    useTypingStore.setState({
      targetText: "hello",
      targetLanguage: "en",
      targetId: "test_target",
      typedText: "",
      qwertyBuffer: "",
      events: [],
      status: "idle",
      mode: "normal",
    });
  });

  it("handles setMode('hardcore')", async () => {
    const store = useTypingStore.getState();
    await store.setMode("hardcore");
    
    const state = useTypingStore.getState();
    expect(state.mode).toBe("hardcore");
    expect(state.targetText).toBe("mock_hardcore_text");
    expect(state.targetId).toBe("target_hardcore_mock");
    expect(state.targetLanguage).toBe("ko");
  });

  it("handles setMode('feedback')", async () => {
    const store = useTypingStore.getState();
    await store.setMode("feedback");
    
    const state = useTypingStore.getState();
    expect(state.mode).toBe("feedback");
    expect(state.targetText).toBe("");
    expect(state.targetId).toBe("feedback");
    expect(state.alignments).toEqual(buildFeedbackEmptyAlignments());
  });

  it("handles nextTarget() for hardcore mode", async () => {
    await useTypingStore.getState().setMode("hardcore");
    await useTypingStore.getState().nextTarget();
    
    const state = useTypingStore.getState();
    expect(state.targetText).toBe("mock_hardcore_text");
    expect(state.targetId).toContain("target_hardcore_");
  });

  it("handles nextTarget() for feedback mode", async () => {
    await useTypingStore.getState().setMode("feedback");
    useTypingStore.setState({ typedText: "abc", qwertyBuffer: "abc" });
    
    await useTypingStore.getState().nextTarget();
    const state = useTypingStore.getState();
    expect(state.typedText).toBe("");
    expect(state.qwertyBuffer).toBe("");
  });

  it("handles setTarget() with a string parameter", async () => {
    await useTypingStore.getState().setTarget("안녕하세요");
    const state = useTypingStore.getState();
    expect(state.targetText).toBe("안녕하세요");
    expect(state.targetLanguage).toBe("ko");
    expect(state.targetId).toContain("target_custom_");
  });

  it("handles setTargetLanguage() in feedback mode", async () => {
    await useTypingStore.getState().setMode("feedback");
    useTypingStore.setState({ qwertyBuffer: "gks" });
    
    await useTypingStore.getState().setTargetLanguage("ko");
    const state = useTypingStore.getState();
    expect(state.targetLanguage).toBe("ko");
    expect(state.typedText).toBe("한");
  });

  it("handles setTargetLanguage() with string target and state fallback", async () => {
    await useTypingStore.getState().setMode("topic");
    await useTypingStore.getState().setTarget({
      id: "mock",
      content: "hello",
      language: "en"
    });
    useTypingStore.setState({ qwertyBuffer: "gks" });
    
    await useTypingStore.getState().setTargetLanguage("ko");
    const state = useTypingStore.getState();
    expect(state.targetLanguage).toBe("ko");
    expect(state.typedText).toBe("한");
  });
  
  it("handles setTypedText() fallback when target is English but contains Korean", async () => {
    await useTypingStore.getState().setMode("topic");
    await useTypingStore.getState().setTarget({
      id: "mock_mixed",
      content: "hello 안녕",
      language: "en" 
    });
    
    useTypingStore.getState().setTypedText("안");
    const state = useTypingStore.getState();
    
    // It should detect Korean characters in targetText and fallback to Korean MVSA processing
    expect(state.typedText).toBe("안");
    expect(state.alignments).toBeDefined(); // MVSA successfully ran
  });
});
