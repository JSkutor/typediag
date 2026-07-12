import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { feedbackServiceClient } from "./feedbackServiceClient";
import * as guestUser from "@/utils/guestUser";

describe("feedbackServiceClient", () => {
  const mockFetch = vi.fn();
  const mockGetGuestAuthHeaders = vi.spyOn(guestUser, "getGuestAuthHeaders");
  const mockApplyGuestTokenFromResponse = vi.spyOn(guestUser, "applyGuestTokenFromResponse");

  beforeEach(() => {
    global.fetch = mockFetch;
    mockGetGuestAuthHeaders.mockReturnValue({ "X-Guest-User-Id": "guest_123" });
    mockApplyGuestTokenFromResponse.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should submit feedback successfully", async () => {
    const mockPayload = { guestToken: "new_token" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(mockPayload),
    });

    await feedbackServiceClient.submitFeedback({
      message: "이 앱 최고예요!",
      language: "ko",
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Guest-User-Id": "guest_123",
      },
      body: JSON.stringify({ message: "이 앱 최고예요!", language: "ko" }),
    });
    expect(mockApplyGuestTokenFromResponse).toHaveBeenCalledWith(mockPayload);
  });

  it("should throw specific error message when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValueOnce({ error: "Rate limit exceeded" }),
    });

    await expect(
      feedbackServiceClient.submitFeedback({ message: "테스트", language: "ko" }),
    ).rejects.toThrow("Rate limit exceeded");
  });

  it("should throw default error message when response is not ok and no error string is provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValueOnce({}),
    });

    await expect(
      feedbackServiceClient.submitFeedback({ message: "테스트", language: "ko" }),
    ).rejects.toThrow("Failed to submit feedback");
  });

  it("should handle json parsing error gracefully by throwing default error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockRejectedValueOnce(new Error("Parse fail")),
    });

    await expect(
      feedbackServiceClient.submitFeedback({ message: "테스트", language: "ko" }),
    ).rejects.toThrow("Failed to submit feedback");
  });
});
