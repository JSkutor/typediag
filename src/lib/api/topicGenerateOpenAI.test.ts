import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TOPIC_GENERATE_RETRY_DELAYS_MS,
  TopicGenerateApiError,
  topicGenerateUserError,
  generateTopicSentences,
  isRetryableTopicGenerateStatus,
  parseTopicGenerateErrorStatus,
  parseTopicSentencesResponse,
  resolveTopicGenerateError,
  TOPIC_GENERATE_PARSE_ERROR,
  TOPIC_GENERATE_TRUNCATED_ERROR,
} from "./topicGenerateOpenAI";

const VALID_SENTENCE =
  "요즘 들어 날씨 변화가 심해져서 출근길에 우산을 챙길지 말지 고민하는 사람이 많고, 특히 장거리 이동이 예정된 날에는 미리 예보를 확인해 준비하는 습관이 도움이 됩니다.";

function openaiSuccessResponse(sentences: string[]) {
  return {
    ok: true,
    json: async () => ({
      choices: [
        {
          finish_reason: "stop",
          message: { content: JSON.stringify({ sentences }) },
        },
      ],
    }),
  } as Response;
}

function openaiTruncatedResponse() {
  return {
    ok: true,
    json: async () => ({
      choices: [
        {
          finish_reason: "length",
          message: { content: '{"sentences":["짧' },
        },
      ],
    }),
  } as Response;
}

function openaiErrorResponse(status: number, code?: string) {
  return {
    ok: false,
    status,
    text: async () =>
      JSON.stringify({
        error: { code: code ?? String(status), message: "error" },
      }),
  } as Response;
}

describe("topicGenerateOpenAI helpers", () => {
  it("maps API status codes to user-facing messages", () => {
    expect(topicGenerateUserError(429)).toContain("할당량");
    expect(topicGenerateUserError(503)).toContain("과부하");
    expect(topicGenerateUserError(400)).toContain("문장 생성에 실패");
  });

  it("parses OpenAI error JSON status codes", () => {
    expect(parseTopicGenerateErrorStatus('{"error":{"code":"rate_limit_exceeded"}}')).toBe(429);
    expect(parseTopicGenerateErrorStatus('{"error":{"code":503}}')).toBe(503);
    expect(parseTopicGenerateErrorStatus("not-json")).toBeNull();
  });

  it("marks only 429 and 503 as retryable", () => {
    expect(isRetryableTopicGenerateStatus(429)).toBe(true);
    expect(isRetryableTopicGenerateStatus(503)).toBe(true);
    expect(isRetryableTopicGenerateStatus(400)).toBe(false);
    expect(isRetryableTopicGenerateStatus(null)).toBe(false);
  });

  it("filters invalid sentences from JSON payload", () => {
    const result = parseTopicSentencesResponse(
      JSON.stringify({ sentences: [VALID_SENTENCE, "짧음", 123, null] }),
    );

    expect(result.rawCount).toBe(4);
    expect(result.sentences).toEqual([VALID_SENTENCE]);
  });

  it("returns empty result for malformed JSON text", () => {
    expect(parseTopicSentencesResponse("not-json")).toEqual({
      sentences: [],
      rawCount: 0,
      parseFailed: true,
    });
    expect(parseTopicSentencesResponse(JSON.stringify({ sentences: "bad" }))).toEqual({
      sentences: [],
      rawCount: 0,
      parseFailed: true,
    });
  });

  it("resolves user-facing errors by failure kind", () => {
    expect(
      resolveTopicGenerateError({
        sentences: [],
        rawCount: 0,
        truncated: true,
        parseFailed: true,
      }),
    ).toBe(TOPIC_GENERATE_TRUNCATED_ERROR);

    expect(
      resolveTopicGenerateError({
        sentences: [],
        rawCount: 0,
        truncated: false,
        parseFailed: true,
      }),
    ).toBe(TOPIC_GENERATE_PARSE_ERROR);
  });
});

describe("generateTopicSentences", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });

  it("throws when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(generateTopicSentences("타자 연습")).rejects.toThrow("OPENAI_API_KEY is not set");
  });

  it("retries on 429 and returns filtered sentences", async () => {
    vi.useFakeTimers();
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(openaiErrorResponse(429, "rate_limit_exceeded"))
      .mockResolvedValueOnce(openaiSuccessResponse([VALID_SENTENCE]));

    const resultPromise = generateTopicSentences("타자 연습");
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.sentences).toEqual([VALID_SENTENCE]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const [url, init] = vi.mocked(global.fetch).mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.openai.com/v1/chat/completions");
    expect((init as RequestInit)?.headers).toMatchObject({
      Authorization: "Bearer test-openai-key",
    });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe("gpt-4.1-nano");
  });

  it("waits between retry attempts using configured delays", async () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(global, "setTimeout");

    vi.mocked(global.fetch)
      .mockResolvedValueOnce(openaiErrorResponse(503, "503"))
      .mockResolvedValueOnce(openaiSuccessResponse([VALID_SENTENCE]));

    const resultPromise = generateTopicSentences("타자 연습");
    await vi.runAllTimersAsync();
    await resultPromise;

    expect(setTimeoutSpy).toHaveBeenCalledWith(
      expect.any(Function),
      TOPIC_GENERATE_RETRY_DELAYS_MS[0],
    );
  });

  it("retries the same model until success after multiple 429s", async () => {
    vi.useFakeTimers();
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(openaiErrorResponse(429, "rate_limit_exceeded"))
      .mockResolvedValueOnce(openaiErrorResponse(429, "rate_limit_exceeded"))
      .mockResolvedValueOnce(openaiErrorResponse(429, "rate_limit_exceeded"))
      .mockResolvedValueOnce(openaiSuccessResponse([VALID_SENTENCE]));

    const resultPromise = generateTopicSentences("타자 연습");
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.sentences).toEqual([VALID_SENTENCE]);
    expect(global.fetch).toHaveBeenCalledTimes(4);
    for (const call of vi.mocked(global.fetch).mock.calls) {
      const body = JSON.parse((call[1] as RequestInit).body as string);
      expect(body.model).toBe("gpt-4.1-nano");
    }
  });

  it("retries when response is truncated without usable sentences", async () => {
    vi.useFakeTimers();
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(openaiTruncatedResponse())
      .mockResolvedValueOnce(openaiSuccessResponse([VALID_SENTENCE]));

    const resultPromise = generateTopicSentences("타자 연습");
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.sentences).toEqual([VALID_SENTENCE]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("throws retryable TopicGenerateApiError after all attempts fail", async () => {
    vi.useFakeTimers();
    vi.mocked(global.fetch).mockResolvedValue(openaiErrorResponse(429, "rate_limit_exceeded"));

    const resultPromise = generateTopicSentences("타자 연습");
    const expectation = expect(resultPromise).rejects.toBeInstanceOf(TopicGenerateApiError);
    await vi.runAllTimersAsync();
    await expectation;

    // 1 initial + 4 retries = 5 calls
    expect(global.fetch).toHaveBeenCalledTimes(5);
  });
});
