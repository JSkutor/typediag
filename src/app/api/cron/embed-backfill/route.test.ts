import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./route";
import { drizzleDb } from "@/db";
import { NextRequest } from "next/server";

vi.mock("@/db", () => ({
  drizzleDb: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

function makeCronRequest(authHeader: string | null): NextRequest {
  const headers: Record<string, string> = {};
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }
  return new NextRequest("http://localhost/api/cron/embed-backfill", {
    method: "GET",
    headers,
  });
}

describe("/api/cron/embed-backfill route", () => {
  const originalCronSecret = process.env.CRON_SECRET;
  const originalUpstageKey = process.env.UPSTAGE_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.CRON_SECRET = "super-secret-token";
    process.env.UPSTAGE_API_KEY = "test-upstage-key";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret;
    process.env.UPSTAGE_API_KEY = originalUpstageKey;
  });

  it("returns 401 when Authorization header is invalid", async () => {
    const response = await GET(makeCronRequest("Bearer wrong-token"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Unauthorized");
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(makeCronRequest("Bearer super-secret-token"));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe("Configuration error");
  });

  it("returns 200 and exit message when no pending texts require embedding", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(drizzleDb.select).mockReturnValue({ from: mockFrom } as never);

    const response = await GET(makeCronRequest("Bearer super-secret-token"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain("No texts pending embeddings.");
  });

  it("fetches Upstage embeddings and updates DB on pending texts", async () => {
    const mockLimit = vi.fn().mockResolvedValue([
      { id: "text_1", content: "첫 번째 테스트 문장" },
      { id: "text_2", content: "두 번째 테스트 문장" },
    ]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(drizzleDb.select).mockReturnValue({ from: mockFrom } as never);

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { embedding: [0.1, 0.2, 0.3] },
            { embedding: [0.4, 0.5, 0.6] },
          ],
        }),
        { status: 200 }
      )
    );

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    vi.mocked(drizzleDb.transaction).mockImplementation(async (cb) => {
      const mockTx = {
        update: mockUpdate,
      };
      return cb(mockTx as any);
    });

    const response = await GET(makeCronRequest("Bearer super-secret-token"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain("Successfully backfilled 2 embeddings.");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(drizzleDb.transaction).toHaveBeenCalledTimes(1);
  });
});
