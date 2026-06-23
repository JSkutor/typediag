import { describe, it, expect, vi, beforeEach } from "vitest";
import { sessionServiceClient } from "./sessionServiceClient";
import * as guestUser from "@/utils/guestUser";

vi.mock("@/utils/guestUser", () => ({
  getGuestAuthHeaders: vi.fn(() => ({
    "X-Guest-User-Id": "guest_00000000-0000-0000-0000-000000000001",
    "X-Guest-Token": "test-token",
  })),
  applyGuestTokenFromResponse: vi.fn(),
}));

describe("sessionServiceClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("startPage sends guest headers and returns runId", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ runId: "run-123", guestToken: "new-token" }),
    } as Response);

    const runId = await sessionServiceClient.startPage(new Date("2026-06-16T10:00:00Z"));

    expect(runId).toBe("run-123");
    expect(guestUser.getGuestAuthHeaders).toHaveBeenCalled();
    expect(guestUser.applyGuestTokenFromResponse).toHaveBeenCalledWith({
      runId: "run-123",
      guestToken: "new-token",
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/session",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Guest-User-Id": "guest_00000000-0000-0000-0000-000000000001",
          "X-Guest-Token": "test-token",
        }),
        body: JSON.stringify({
          action: "start",
          now: "2026-06-16T10:00:00.000Z",
        }),
      }),
    );
  });

  it("startPage throws with server error message", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    } as Response);

    await expect(sessionServiceClient.startPage(new Date())).rejects.toThrow("Unauthorized");
  });

  it("finishPage posts page payload with guest headers", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ runId: "run-456" }),
    } as Response);

    const runId = await sessionServiceClient.finishPage(
      "run-123",
      "타자 연습",
      "타자",
      [],
      1000,
      2000,
      "target-1",
      "ko",
    );

    expect(runId).toBe("run-456");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/session",
      expect.objectContaining({
        body: JSON.stringify({
          action: "finish",
          runId: "run-123",
          targetText: "타자 연습",
          typedText: "타자",
          events: [],
          startedAt: 1000,
          finishedAt: 2000,
          targetId: "target-1",
          language: "ko",
        }),
      }),
    );
  });

  it("syncSessionOnMount applies guest token from response", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, guestToken: "sync-token" }),
    } as Response);

    await sessionServiceClient.syncSessionOnMount();

    expect(guestUser.applyGuestTokenFromResponse).toHaveBeenCalledWith({
      success: true,
      guestToken: "sync-token",
    });
  });

  it("syncSessionOnMount throws when request fails", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Sync failed" }),
    } as Response);

    await expect(sessionServiceClient.syncSessionOnMount()).rejects.toThrow("Sync failed");
  });
});
