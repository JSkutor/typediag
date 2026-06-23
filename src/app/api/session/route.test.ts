import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "./route";
import { auth } from "@clerk/nextjs/server";
import { signGuestToken } from "@/utils/guestAuth";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

describe("/api/session route", () => {
  const guestId = "guest_96deeccb-82a3-46c3-9d84-3723b9792f90";

  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
  });

  it("bootstraps guest token on POST sync without token", async () => {
    const request = new NextRequest("http://localhost/api/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-guest-user-id": guestId,
      },
      body: JSON.stringify({ action: "sync" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.guestToken).toBe(signGuestToken(guestId));
  });

  it("rejects analysis GET without guest token", async () => {
    const request = new NextRequest(
      "http://localhost/api/session?action=analysis&runId=00000000-0000-0000-0000-000000000001",
      {
        method: "GET",
        headers: {
          "x-guest-user-id": guestId,
        },
      },
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("allows analysis GET with valid guest token", async () => {
    const request = new NextRequest(
      "http://localhost/api/session?action=analysis&runId=00000000-0000-0000-0000-000000000001",
      {
        method: "GET",
        headers: {
          "x-guest-user-id": guestId,
          "x-guest-token": signGuestToken(guestId),
        },
      },
    );

    const response = await GET(request);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("Unauthorized or Run not found");
  });

  describe("mock action", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      vi.stubEnv("NODE_ENV", originalNodeEnv);
    });

    it("returns 403 outside development", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const request = new NextRequest("http://localhost/api/session?action=mock");
      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });
});
