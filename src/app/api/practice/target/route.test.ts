import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetRandomTargetText = vi.fn();

vi.mock("@/utils/db", () => ({
  db: {
    getRandomTargetText: (...args: unknown[]) => mockGetRandomTargetText(...args),
  },
}));

import { GET } from "./route";
import { NextRequest } from "next/server";

function makeTargetRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/practice/target?${query}`);
}

describe("/api/practice/target route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for unsupported language", async () => {
    const response = await GET(makeTargetRequest("language=fr"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Invalid language");
    expect(mockGetRandomTargetText).not.toHaveBeenCalled();
  });

  it("returns one random target for the requested language", async () => {
    mockGetRandomTargetText.mockResolvedValueOnce({
      id: "target_001",
      content: "테스트 문장입니다.",
      language: "ko",
    });

    const response = await GET(makeTargetRequest("language=ko"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toEqual({
      id: "target_001",
      content: "테스트 문장입니다.",
      language: "ko",
    });
    expect(mockGetRandomTargetText).toHaveBeenCalledWith("ko", undefined);
  });

  it("passes exclude id and retries without exclude when no row is found", async () => {
    mockGetRandomTargetText
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "target_002",
        content: "fallback sentence",
        language: "en",
      });

    const response = await GET(makeTargetRequest("language=en&exclude=target_001"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.id).toBe("target_002");
    expect(mockGetRandomTargetText).toHaveBeenNthCalledWith(1, "en", "target_001");
    expect(mockGetRandomTargetText).toHaveBeenNthCalledWith(2, "en");
  });

  it("returns 404 when no targets exist", async () => {
    mockGetRandomTargetText.mockResolvedValue(null);

    const response = await GET(makeTargetRequest("language=ko"));
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe("No targets found");
  });
});
