import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchRandomNormalTarget } from "./normalTargetClient";
import * as guestUser from "@/utils/guestUser";

describe("fetchRandomNormalTarget", () => {
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

  it("should fetch normal target successfully without excludeId", async () => {
    const mockPayload = {
      data: {
        id: "target_1",
        content: "안녕하세요",
        language: "ko",
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(mockPayload),
    });

    const result = await fetchRandomNormalTarget("ko");

    expect(mockFetch).toHaveBeenCalledWith("/api/practice/target?language=ko", {
      headers: { "X-Guest-User-Id": "guest_123" },
    });
    expect(mockApplyGuestTokenFromResponse).toHaveBeenCalledWith(mockPayload);
    expect(result).toEqual({
      id: "target_1",
      content: "안녕하세요",
      language: "ko",
    });
  });

  it("should include excludeId in query params if provided", async () => {
    const mockPayload = {
      data: { id: "target_2", content: "hello", language: "en" },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(mockPayload),
    });

    await fetchRandomNormalTarget("en", "target_1");

    expect(mockFetch).toHaveBeenCalledWith("/api/practice/target?language=en&exclude=target_1", {
      headers: expect.objectContaining({ "X-Guest-User-Id": expect.any(String) }),
    });
  });

  it("should throw an error if response is not ok (with specific error message)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValueOnce({ error: "No target available" }),
    });

    await expect(fetchRandomNormalTarget("ko")).rejects.toThrow("No target available");
  });

  it("should throw a default error if response is not ok and no string error is provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValueOnce({}),
    });

    await expect(fetchRandomNormalTarget("ko")).rejects.toThrow("Failed to load practice sentence");
  });

  it("should throw an error if response data is missing required fields", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({
        data: { id: "target_1", content: "안녕하세요" }, // language missing
      }),
    });

    await expect(fetchRandomNormalTarget("ko")).rejects.toThrow("Invalid practice sentence response");
  });

  it("should handle json parsing error gracefully by throwing default error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockRejectedValueOnce(new Error("Parse error")),
    });

    await expect(fetchRandomNormalTarget("ko")).rejects.toThrow("Failed to load practice sentence");
  });
});
