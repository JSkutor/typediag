import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/utils/db";
import { GuestAuthError, signGuestToken } from "@/utils/guestAuth";
import { resolveApiUser, withGuestToken } from "./resolveApiUser";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/utils/db", () => ({
  db: {
    getOrCreateUserByClerkId: vi.fn(),
  },
}));

describe("resolveApiUser", () => {
  const guestId = "guest_96deeccb-82a3-46c3-9d84-3723b9792f90";
  const clerkId = "user_clerk_abc123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    vi.mocked(db.getOrCreateUserByClerkId).mockImplementation(async (id: string) => ({
      id: `db_${id}`,
      clerkId: id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  function makeGuestRequest(headers: Record<string, string> = {}): NextRequest {
    return new NextRequest("http://localhost/api/session", {
      headers: {
        "x-guest-user-id": guestId,
        ...headers,
      },
    });
  }

  it("returns DB user for authenticated Clerk session", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: clerkId } as never);

    const result = await resolveApiUser(makeGuestRequest());

    expect(result).toEqual({ userId: `db_${clerkId}` });
    expect(db.getOrCreateUserByClerkId).toHaveBeenCalledWith(clerkId);
  });

  it("bootstraps guest token when guest id is valid but token is missing", async () => {
    const result = await resolveApiUser(makeGuestRequest());

    expect(result.userId).toBe(`db_${guestId}`);
    expect(result.issueGuestToken).toBe(signGuestToken(guestId));
  });

  it("does not issue token when guest token is valid", async () => {
    const result = await resolveApiUser(
      makeGuestRequest({ "x-guest-token": signGuestToken(guestId) }),
    );

    expect(result).toEqual({ userId: `db_${guestId}` });
  });

  it("reissues token when guest token is invalid", async () => {
    const result = await resolveApiUser(
      makeGuestRequest({ "x-guest-token": "invalid-token" }),
    );

    expect(result.userId).toBe(`db_${guestId}`);
    expect(result.issueGuestToken).toBe(signGuestToken(guestId));
  });

  it("throws when guest id is missing or invalid", async () => {
    const request = new NextRequest("http://localhost/api/session");

    await expect(resolveApiUser(request)).rejects.toThrow(GuestAuthError);
    await expect(resolveApiUser(request)).rejects.toThrow(
      "Unauthorized: Missing or invalid guest identification",
    );
  });

  it("enforces guest token when requireGuestToken is true", async () => {
    await expect(
      resolveApiUser(makeGuestRequest(), { requireGuestToken: true }),
    ).rejects.toThrow("Unauthorized: Guest token required or invalid");

    await expect(
      resolveApiUser(makeGuestRequest({ "x-guest-token": "bad" }), {
        requireGuestToken: true,
      }),
    ).rejects.toThrow("Unauthorized: Guest token required or invalid");
  });

  it("allows guest with valid token when requireGuestToken is true", async () => {
    const result = await resolveApiUser(
      makeGuestRequest({ "x-guest-token": signGuestToken(guestId) }),
      { requireGuestToken: true },
    );

    expect(result).toEqual({ userId: `db_${guestId}` });
  });
});

describe("withGuestToken", () => {
  it("adds guestToken to response body when provided", () => {
    expect(withGuestToken({ success: true }, "signed-token")).toEqual({
      success: true,
      guestToken: "signed-token",
    });
  });

  it("returns body unchanged when token is omitted", () => {
    const body = { success: true, runId: "run-1" };
    expect(withGuestToken(body)).toBe(body);
    expect(withGuestToken(body, undefined)).toBe(body);
  });
});
