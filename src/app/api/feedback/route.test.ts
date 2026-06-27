import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { auth } from "@clerk/nextjs/server";
import { signGuestToken } from "@/utils/guestAuth";

const mockCreateUserFeedback = vi.fn();
const mockCheckFeedbackRateLimit = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/utils/db", () => ({
  db: {
    getOrCreateUserByClerkId: vi.fn().mockImplementation(async (id: string) => ({ id })),
    createUserFeedback: (...args: unknown[]) => mockCreateUserFeedback(...args),
  },
}));

vi.mock("@/lib/api/feedbackRateLimiter", () => ({
  checkFeedbackRateLimit: (...args: unknown[]) => mockCheckFeedbackRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  FEEDBACK_DAILY_LIMIT: 10,
}));

describe("POST /api/feedback", () => {
  const guestId = "guest_96deeccb-82a3-46c3-9d84-3723b9792f90";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    mockCheckFeedbackRateLimit.mockResolvedValue({
      allowed: true,
      currentCount: 0,
      limit: 10,
    });
    mockCreateUserFeedback.mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001" });
  });

  it("stores feedback for a guest user", async () => {
    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-guest-user-id": guestId,
      },
      body: JSON.stringify({ message: "great app", language: "ko" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.guestToken).toBe(signGuestToken(guestId));
    expect(mockCreateUserFeedback).toHaveBeenCalledWith({
      user_id: guestId,
      message: "great app",
      language: "ko",
      ip_address: "127.0.0.1",
    });
  });

  it("rejects invalid payload", async () => {
    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-guest-user-id": guestId,
      },
      body: JSON.stringify({ message: "   ", language: "ko" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(mockCreateUserFeedback).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockCheckFeedbackRateLimit.mockResolvedValueOnce({
      allowed: false,
      currentCount: 10,
      limit: 10,
    });

    const request = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-guest-user-id": guestId,
      },
      body: JSON.stringify({ message: "spam", language: "ko" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    expect(mockCreateUserFeedback).not.toHaveBeenCalled();
  });
});
