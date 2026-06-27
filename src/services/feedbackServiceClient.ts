import { applyGuestTokenFromResponse, getGuestAuthHeaders } from "@/utils/guestUser";

export interface SubmitFeedbackPayload {
  message: string;
  language: "ko" | "en";
}

export const feedbackServiceClient = {
  async submitFeedback(payload: SubmitFeedbackPayload): Promise<void> {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getGuestAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    applyGuestTokenFromResponse(data);

    if (!res.ok) {
      const errorMessage =
        typeof data.error === "string" ? data.error : "Failed to submit feedback";
      throw new Error(errorMessage);
    }
  },
};
