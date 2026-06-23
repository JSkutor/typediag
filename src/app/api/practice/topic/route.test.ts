import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

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
});
