import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  GEMINI_RETRY_DELAYS_MS,
  GeminiApiError,
  geminiUserError,
  generateSentencesWithGemini,
  isRetryableGeminiStatus,
  parseGeminiErrorStatus,
  parseGeminiSentencesResponse,
} from "./topicGenerateGemini";

const VALID_SENTENCE =
  "요즘 들어 날씨 변화가 심해져서 출근길에 우산을 챙길지 말지 고민하는 사람이 많고, 특히 장거리 이동이 예정된 날에는 미리 예보를 확인해 준비하는 습관이 도움이 됩니다.";

function geminiSuccessResponse(sentences: string[]) {
  return {
    ok: true,
    json: async () => ({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify({ sentences }) }] },
        },
      ],
    }),
  } as Response;
}

function geminiErrorResponse(status: number, code?: number) {
  return {
    ok: false,
    status,
    text: async () => JSON.stringify({ error: { code: code ?? status, message: "error" } }),
  } as Response;
}

describe("topicGenerateGemini helpers", () => {
  it("maps Gemini status codes to user-facing messages", () => {
    expect(geminiUserError(429)).toContain("할당량");
    expect(geminiUserError(503)).toContain("과부하");
    expect(geminiUserError(400)).toContain("문장 생성에 실패");
  });

  it("parses Gemini error JSON status codes", () => {
    expect(parseGeminiErrorStatus('{"error":{"code":429}}')).toBe(429);
    expect(parseGeminiErrorStatus("not-json")).toBeNull();
  });

  it("marks only 429 and 503 as retryable", () => {
    expect(isRetryableGeminiStatus(429)).toBe(true);
    expect(isRetryableGeminiStatus(503)).toBe(true);
    expect(isRetryableGeminiStatus(400)).toBe(false);
    expect(isRetryableGeminiStatus(null)).toBe(false);
  });

  it("filters invalid sentences from Gemini JSON payload", () => {
    const result = parseGeminiSentencesResponse(
      JSON.stringify({ sentences: [VALID_SENTENCE, "짧음", 123, null] }),
    );

    expect(result.rawCount).toBe(4);
    expect(result.sentences).toEqual([VALID_SENTENCE]);
  });

  it("returns empty result for malformed Gemini JSON text", () => {
    expect(parseGeminiSentencesResponse("not-json")).toEqual({
      sentences: [],
      rawCount: 0,
    });
    expect(parseGeminiSentencesResponse(JSON.stringify({ sentences: "bad" }))).toEqual({
      sentences: [],
      rawCount: 0,
    });
  });
});

describe("generateSentencesWithGemini", () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  });

  it("throws when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(generateSentencesWithGemini("타자 연습")).rejects.toThrow(
      "GEMINI_API_KEY is not set",
    );
  });

  it("retries on 429 and returns filtered sentences", async () => {
    vi.useFakeTimers();
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(geminiErrorResponse(429, 429))
      .mockResolvedValueOnce(geminiSuccessResponse([VALID_SENTENCE]));

    const resultPromise = generateSentencesWithGemini("타자 연습");
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.sentences).toEqual([VALID_SENTENCE]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("waits between retry attempts using configured delays", async () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(global, "setTimeout");

    vi.mocked(global.fetch)
      .mockResolvedValueOnce(geminiErrorResponse(503, 503))
      .mockResolvedValueOnce(geminiSuccessResponse([VALID_SENTENCE]));

    const resultPromise = generateSentencesWithGemini("타자 연습");
    await vi.runAllTimersAsync();
    await resultPromise;

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), GEMINI_RETRY_DELAYS_MS[0]);
  });

  it("fails over to the second model after first model retries are exhausted", async () => {
    vi.useFakeTimers();
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(geminiErrorResponse(429, 429))
      .mockResolvedValueOnce(geminiErrorResponse(429, 429))
      .mockResolvedValueOnce(geminiErrorResponse(429, 429))
      .mockResolvedValueOnce(geminiSuccessResponse([VALID_SENTENCE]));

    const resultPromise = generateSentencesWithGemini("타자 연습");
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.sentences).toEqual([VALID_SENTENCE]);
    expect(global.fetch).toHaveBeenCalledTimes(4);
    const firstCall = vi.mocked(global.fetch).mock.calls[0]?.[0];
    const lastCall = vi.mocked(global.fetch).mock.calls[3]?.[0];
    expect(String(firstCall)).toContain("gemini-2.0-flash");
    expect(String(lastCall)).toContain("gemini-1.5-flash");
  });

  it("throws retryable GeminiApiError after all models and attempts fail", async () => {
    vi.useFakeTimers();
    vi.mocked(global.fetch).mockResolvedValue(geminiErrorResponse(429, 429));

    const resultPromise = generateSentencesWithGemini("타자 연습");
    const expectation = expect(resultPromise).rejects.toBeInstanceOf(GeminiApiError);
    await vi.runAllTimersAsync();
    await expectation;

    // 2 models x (1 initial + 2 retries) = 6 calls
    expect(global.fetch).toHaveBeenCalledTimes(6);
  });
});
