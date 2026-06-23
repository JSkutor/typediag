import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { db } from "@/utils/db";
import * as topicGenerateGemini from "@/lib/api/topicGenerateGemini";

vi.mock("@/utils/db", () => ({
  db: {
    insertTopicGeneratedTargets: vi.fn(),
  },
}));

vi.mock("@/lib/api/topicGenerateGemini", async (importOriginal) => {
  const actual = await importOriginal<typeof topicGenerateGemini>();
  return {
    ...actual,
    generateSentencesWithGemini: vi.fn(),
  };
});

const VALID_SENTENCE =
  "요즘 들어 날씨 변화가 심해져서 출근길에 우산을 챙길지 말지 고민하는 사람이 많고, 특히 장거리 이동이 예정된 날에는 미리 예보를 확인해 준비하는 습관이 도움이 됩니다.";

function makeRequest(topic: unknown): Request {
  return new Request("http://localhost/api/practice/topic/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
}

describe("/api/practice/topic/generate route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.insertTopicGeneratedTargets).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 400 for invalid topic before calling Gemini", async () => {
    const response = await POST(makeRequest("a"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("글자수가 적습니다.");
    expect(topicGenerateGemini.generateSentencesWithGemini).not.toHaveBeenCalled();
  });

  it("returns 200 with generated targets on success", async () => {
    vi.mocked(topicGenerateGemini.generateSentencesWithGemini).mockResolvedValue({
      sentences: [VALID_SENTENCE],
      rawCount: 1,
    });

    const response = await POST(makeRequest("타자 연습"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].content).toBe(VALID_SENTENCE);
    expect(payload.data[0].language).toBe("ko");
    expect(payload.data[0].id).toMatch(/^target_gen_/);
  });

  it("returns 422 when all Gemini sentences fail validation", async () => {
    vi.mocked(topicGenerateGemini.generateSentencesWithGemini).mockResolvedValue({
      sentences: [],
      rawCount: 3,
    });

    const response = await POST(makeRequest("타자 연습"));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toBe("생성된 문장이 형식 요건에 맞지 않습니다. 다시 시도해 주세요.");
  });

  it("returns 422 when Gemini returns no sentences", async () => {
    vi.mocked(topicGenerateGemini.generateSentencesWithGemini).mockResolvedValue({
      sentences: [],
      rawCount: 0,
    });

    const response = await POST(makeRequest("타자 연습"));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toBe("부적절한 주제이거나 문장 생성에 실패했습니다.");
  });

  it("returns 503 with quota message for retryable Gemini errors", async () => {
    vi.mocked(topicGenerateGemini.generateSentencesWithGemini).mockRejectedValue(
      new topicGenerateGemini.GeminiApiError("rate limited", 429, true),
    );

    const response = await POST(makeRequest("타자 연습"));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toContain("할당량");
  });

  it("returns 500 for non-retryable failures", async () => {
    vi.mocked(topicGenerateGemini.generateSentencesWithGemini).mockRejectedValue(
      new Error("GEMINI_API_KEY is not set in environment variables."),
    );

    const response = await POST(makeRequest("타자 연습"));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe("부적절한 주제이거나 문장 생성에 실패했습니다.");
  });

  it("still returns 200 when DB cache insert fails after retries", async () => {
    vi.useFakeTimers();
    vi.mocked(topicGenerateGemini.generateSentencesWithGemini).mockResolvedValue({
      sentences: [VALID_SENTENCE],
      rawCount: 1,
    });
    vi.mocked(db.insertTopicGeneratedTargets).mockRejectedValue(new Error("db down"));

    const responsePromise = POST(makeRequest("타자 연습"));
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(db.insertTopicGeneratedTargets).toHaveBeenCalledTimes(3);
  });
});
