import { create } from "zustand";
import { feedbackServiceClient } from "@/services/feedbackServiceClient";
import { useTypingStore } from "@/store/useTypingStore";
import {
  buildFeedbackNoticeState,
  getFeedbackSuccessText,
} from "@/lib/feedback/freeformTyping";

export type FeedbackSubmitStatus = "idle" | "submitting" | "success" | "error";

const FEEDBACK_SUCCESS_DISPLAY_MS = 2000;

let successReturnTimer: ReturnType<typeof setTimeout> | null = null;

function clearSuccessReturnTimer(): void {
  if (successReturnTimer !== null) {
    clearTimeout(successReturnTimer);
    successReturnTimer = null;
  }
}

function scheduleReturnToNormalMode(): void {
  clearSuccessReturnTimer();
  successReturnTimer = setTimeout(() => {
    successReturnTimer = null;
    useFeedbackStore.getState().resetSubmitStatus();
    void useTypingStore.getState().setMode("normal");
  }, FEEDBACK_SUCCESS_DISPLAY_MS);
}

interface FeedbackStore {
  submitStatus: FeedbackSubmitStatus;
  submitError: string | null;
  resetSubmitStatus: () => void;
  submit: () => Promise<void>;
}

export const useFeedbackStore = create<FeedbackStore>((set, get) => ({
  submitStatus: "idle",
  submitError: null,

  resetSubmitStatus: () => {
    clearSuccessReturnTimer();
    set({ submitStatus: "idle", submitError: null });
  },

  submit: async () => {
    const { submitStatus } = get();
    if (submitStatus === "submitting") {
      return;
    }

    const { typedText, targetLanguage } = useTypingStore.getState();
    const message = typedText.trim();
    if (message.length === 0) {
      set({ submitStatus: "error", submitError: "내용을 입력해 주세요." });
      return;
    }

    const language = targetLanguage === "en" ? "en" : "ko";
    set({ submitStatus: "submitting", submitError: null });

    try {
      await feedbackServiceClient.submitFeedback({ message, language });
      const successText = getFeedbackSuccessText(language);
      useTypingStore.setState(buildFeedbackNoticeState(successText, language));
      set({ submitStatus: "success", submitError: null });
      scheduleReturnToNormalMode();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "피드백 전송에 실패했습니다.";
      set({ submitStatus: "error", submitError: errorMessage });
    }
  },
}));
