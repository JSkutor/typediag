import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useFeedbackStore } from "./useFeedbackStore";
import { useTypingStore } from "./useTypingStore";
import { feedbackServiceClient } from "@/services/feedbackServiceClient";

// Mock the feedbackServiceClient
vi.mock("@/services/feedbackServiceClient", () => ({
  feedbackServiceClient: {
    submitFeedback: vi.fn(),
  },
}));

describe("useFeedbackStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useFeedbackStore.setState({ submitStatus: "idle", submitError: null });
    useTypingStore.setState({
      typedText: "",
      targetLanguage: "ko",
      mode: "feedback",
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should have initial state", () => {
    const state = useFeedbackStore.getState();
    expect(state.submitStatus).toBe("idle");
    expect(state.submitError).toBeNull();
  });

  it("should return error if typedText is empty on submit", async () => {
    useTypingStore.setState({ typedText: "   " }); // Only whitespaces

    const promise = useFeedbackStore.getState().submit();
    // submit internally awaits, but since it returns early on error, we can await it
    await promise;

    const state = useFeedbackStore.getState();
    expect(state.submitStatus).toBe("error");
    expect(state.submitError).toBe("내용을 입력해 주세요.");
    expect(feedbackServiceClient.submitFeedback).not.toHaveBeenCalled();
  });

  it("should ignore submit if already submitting", async () => {
    useFeedbackStore.setState({ submitStatus: "submitting" });

    await useFeedbackStore.getState().submit();

    expect(feedbackServiceClient.submitFeedback).not.toHaveBeenCalled();
  });

  it("should submit feedback successfully, update typing store, and schedule return to normal mode", async () => {
    useTypingStore.setState({ typedText: "좋은 앱입니다.", targetLanguage: "en" });
    vi.mocked(feedbackServiceClient.submitFeedback).mockResolvedValueOnce();

    const submitPromise = useFeedbackStore.getState().submit();
    
    // While submitting
    expect(useFeedbackStore.getState().submitStatus).toBe("submitting");
    expect(useFeedbackStore.getState().submitError).toBeNull();

    await submitPromise;

    // After success
    const state = useFeedbackStore.getState();
    expect(state.submitStatus).toBe("success");
    expect(feedbackServiceClient.submitFeedback).toHaveBeenCalledWith({
      message: "좋은 앱입니다.",
      language: "en",
    });

    // Check typing store for feedback notice state
    const typingState = useTypingStore.getState();
    expect(typingState.targetText).toContain("Feedback sent."); // English success text

    const setModeSpy = vi.spyOn(useTypingStore.getState(), "setMode").mockResolvedValue();

    // Fast-forward timer to trigger scheduleReturnToNormalMode
    vi.advanceTimersByTime(2000);

    // After timer
    expect(useFeedbackStore.getState().submitStatus).toBe("idle");
    expect(setModeSpy).toHaveBeenCalledWith("normal");
  });

  it("should handle submission error", async () => {
    useTypingStore.setState({ typedText: "버그 있어요.", targetLanguage: "ko" });
    vi.mocked(feedbackServiceClient.submitFeedback).mockRejectedValueOnce(
      new Error("Network Error")
    );

    await useFeedbackStore.getState().submit();

    const state = useFeedbackStore.getState();
    expect(state.submitStatus).toBe("error");
    expect(state.submitError).toBe("Network Error");
  });

  it("should handle unknown error properly", async () => {
    useTypingStore.setState({ typedText: "버그 있어요.", targetLanguage: "ko" });
    vi.mocked(feedbackServiceClient.submitFeedback).mockRejectedValueOnce("String error");

    await useFeedbackStore.getState().submit();

    const state = useFeedbackStore.getState();
    expect(state.submitStatus).toBe("error");
    expect(state.submitError).toBe("피드백 전송에 실패했습니다.");
  });

  it("should reset submit status and clear timer", () => {
    useFeedbackStore.setState({ submitStatus: "error", submitError: "Some error" });

    useFeedbackStore.getState().resetSubmitStatus();

    const state = useFeedbackStore.getState();
    expect(state.submitStatus).toBe("idle");
    expect(state.submitError).toBeNull();
  });
});
