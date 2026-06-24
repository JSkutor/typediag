import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { drizzleDb } from "@/db";
import { POST } from "./route";

vi.mock("@/db", () => ({
  drizzleDb: {
    select: vi.fn(),
  },
}));

function makeTopicRequest(topic: unknown): Request {
  return new Request("http://localhost/api/practice/topic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
}

describe("/api/practice/topic route", () => {
  const originalUpstageKey = process.env.UPSTAGE_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalUpstageKey === undefined) {
      delete process.env.UPSTAGE_API_KEY;
    } else {
      process.env.UPSTAGE_API_KEY = originalUpstageKey;
    }
  });

  it("returns 400 for invalid topic before calling external APIs", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    const response = await POST(makeTopicRequest("a"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("글자수가 적습니다.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when topic is missing", async () => {
    const response = await POST(makeTopicRequest(undefined));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Invalid topic provided");
  });

  it("returns 500 when UPSTAGE_API_KEY is not configured", async () => {
    delete process.env.UPSTAGE_API_KEY;

    const response = await POST(makeTopicRequest("타자 연습"));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe("Internal server error");
  });

  it("returns only public target fields on cache hit", async () => {
    process.env.UPSTAGE_API_KEY = "test-upstage-key";

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }), { status: 200 }),
    );

    const mockLimit = vi.fn().mockResolvedValue([
      {
        id: "target_1",
        content: "타자 연습 문장입니다.",
        language: "ko",
        similarity: 0.82,
      },
    ]);
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(drizzleDb.select).mockReturnValue({ from: mockFrom } as never);

    const response = await POST(makeTopicRequest("타자 연습"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toEqual([
      {
        id: "target_1",
        content: "타자 연습 문장입니다.",
        language: "ko",
        similarity: 0.82,
      },
    ]);
    expect(payload.data[0]).not.toHaveProperty("userId");
    expect(payload.data[0]).not.toHaveProperty("usageCount");
    expect(payload.data[0]).not.toHaveProperty("generatorModel");
  });
});
