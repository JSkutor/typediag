import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/utils/db";
import { signGuestToken } from "@/utils/guestAuth";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

describe("/api/user/sync route", () => {
  const guestId = `guest_${crypto.randomUUID()}`;
  const clerkId = `user_${crypto.randomUUID()}`;

  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ userId: clerkId } as never);
  });

  it("rejects guest merge without a valid guest token", async () => {
    await db.getOrCreateUserByClerkId(guestId);
    await db.getOrCreateUserByClerkId(clerkId);

    const request = new NextRequest("http://localhost/api/user/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-guest-user-id": guestId,
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("merges guest data when guest token is valid", async () => {
    const guestUser = await db.getOrCreateUserByClerkId(guestId);
    const memberUser = await db.getOrCreateUserByClerkId(clerkId);

    await db.createRun({
      user_id: guestUser.id,
      status: "completed",
      started_at: "2026-06-15T00:00:00Z",
    });

    const request = new NextRequest("http://localhost/api/user/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-guest-user-id": guestId,
        "x-guest-token": signGuestToken(guestId),
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.userId).toBe(memberUser.id);
  });
});
