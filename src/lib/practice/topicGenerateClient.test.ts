import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TOPIC_GENERATE_CLIENT_RETRY_DELAYS_MS,
  TopicGenerateClientError,
  fetchTopicGenerateWithRetry,
} from "./topicGenerateClient";

vi.mock("@/utils/guestUser", () => ({
  getGuestAuthHeaders: () => ({ "X-Guest-User-Id": "guest_test" }),
  applyGuestTokenFromResponse: vi.fn(),
}));

function jsonResponse(ok: boolean, status: number, body: unknown): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe("fetchTopicGenerateWithRetry", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns data on first success", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse(true, 200, {
        data: [{ id: "1", content: "문장", language: "ko" }],
      }),
    );

    const result = await fetchTopicGenerateWithRetry("타자");
    expect(result).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 503 then succeeds", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse(false, 503, { error: "busy" }))
      .mockResolvedValueOnce(
        jsonResponse(true, 200, {
          data: [{ id: "1", content: "문장", language: "ko" }],
        }),
      );

    const promise = fetchTopicGenerateWithRetry("타자");
    await vi.advanceTimersByTimeAsync(TOPIC_GENERATE_CLIENT_RETRY_DELAYS_MS[0]);
    const result = await promise;

    expect(result).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 422", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse(false, 422, { error: "형식 오류" }),
    );

    await expect(fetchTopicGenerateWithRetry("타자")).rejects.toMatchObject({
      errorKey: "validationFailed",
      retryable: false,
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
