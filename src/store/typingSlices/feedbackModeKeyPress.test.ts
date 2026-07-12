import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleFeedbackModeKeyPress } from "./feedbackModeKeyPress";
import { useFeedbackStore } from "@/store/useFeedbackStore";

describe("handleFeedbackModeKeyPress", () => {
  const setMock = vi.fn();
  let getMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    useFeedbackStore.setState({ submitStatus: "idle", submitError: null });

    getMock = vi.fn().mockReturnValue({
      mode: "feedback",
      targetLanguage: "ko",
      qwertyBuffer: "",
      typedText: "",
    });
  });

  it("should return false and do nothing if mode is not feedback", () => {
    getMock.mockReturnValueOnce({ mode: "normal" });

    const result = handleFeedbackModeKeyPress(setMock, getMock, "KeyA", false);

    expect(result).toBe(false);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("should return true and ignore input if feedback is submitting", () => {
    useFeedbackStore.setState({ submitStatus: "submitting" });

    const result = handleFeedbackModeKeyPress(setMock, getMock, "KeyA", false);

    expect(result).toBe(true);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("should return true and ignore input if feedback submit is success", () => {
    useFeedbackStore.setState({ submitStatus: "success" });

    const result = handleFeedbackModeKeyPress(setMock, getMock, "KeyA", false);

    expect(result).toBe(true);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("should ignore ShiftLeft and ShiftRight keys", () => {
    let result = handleFeedbackModeKeyPress(setMock, getMock, "ShiftLeft", false);
    expect(result).toBe(true);

    result = handleFeedbackModeKeyPress(setMock, getMock, "ShiftRight", false);
    expect(result).toBe(true);

    expect(setMock).not.toHaveBeenCalled();
  });

  it("should handle Enter key and apply freeform newline", () => {
    const result = handleFeedbackModeKeyPress(setMock, getMock, "Enter", false);

    expect(result).toBe(true);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        qwertyBuffer: "\n",
        typedText: "\n",
      })
    );
  });

  it("should handle Space key and apply freeform space", () => {
    const result = handleFeedbackModeKeyPress(setMock, getMock, "Space", false);

    expect(result).toBe(true);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        qwertyBuffer: " ",
        typedText: " ",
      })
    );
  });

  it("should handle Backspace key and apply freeform backspace", () => {
    getMock.mockReturnValueOnce({
      mode: "feedback",
      targetLanguage: "ko",
      qwertyBuffer: "g",
      typedText: "ㅎ",
    });

    const result = handleFeedbackModeKeyPress(setMock, getMock, "Backspace", false);

    expect(result).toBe(true);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        qwertyBuffer: "",
        typedText: "",
      })
    );
  });

  it("should not call set if Backspace results in no state change (empty text)", () => {
    getMock.mockReturnValueOnce({
      mode: "feedback",
      targetLanguage: "ko",
      qwertyBuffer: "",
      typedText: "",
    });

    const result = handleFeedbackModeKeyPress(setMock, getMock, "Backspace", false);

    expect(result).toBe(true);
    // applyFreeformBackspace returns null if there's nothing to backspace
    expect(setMock).not.toHaveBeenCalled();
  });

  it("should handle normal char input", () => {
    // English language test
    getMock.mockReturnValueOnce({
      mode: "feedback",
      targetLanguage: "en",
      qwertyBuffer: "",
      typedText: "",
    });

    const result = handleFeedbackModeKeyPress(setMock, getMock, "KeyA", true); // Shift + a = A

    expect(result).toBe(true);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        qwertyBuffer: "A",
        typedText: "A",
      })
    );
  });

  it("should return true but ignore invalid key codes", () => {
    // getQwertyChar will return null for invalid code like F1
    const result = handleFeedbackModeKeyPress(setMock, getMock, "F1", false);

    expect(result).toBe(true);
    expect(setMock).not.toHaveBeenCalled();
  });
});
