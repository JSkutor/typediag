import { describe, it, expect } from "vitest";
import { parseTopicRequest } from "./parseTopicRequest";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/practice/topic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("parseTopicRequest", () => {
  it("returns validated topic on success", async () => {
    const result = await parseTopicRequest(makeRequest({ topic: "타자 연습" }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.topic).toBe("타자 연습");
    }
  });

  it("rejects missing topic", async () => {
    const result = await parseTopicRequest(makeRequest({}));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const payload = await result.response.json();
      expect(payload.error).toBe("Invalid topic provided");
    }
  });

  it("rejects non-string topic", async () => {
    const result = await parseTopicRequest(makeRequest({ topic: 123 }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  it("rejects topic that fails validation", async () => {
    const result = await parseTopicRequest(makeRequest({ topic: "a" }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const payload = await result.response.json();
      expect(payload.error).toBe("글자수가 적습니다.");
    }
  });
});
