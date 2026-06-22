import { describe, it, expect } from "vitest";
import { db } from "./db";

describe("guest user", () => {
  it("should get or create guest user idempotently", async () => {
    const clerkId = "guest_96deeccb-82a3-46c3-9d84-3723b9792f90";
    const user1 = await db.getOrCreateUserByClerkId(clerkId);
    const user2 = await db.getOrCreateUserByClerkId(clerkId);
    expect(user1.id).toBe(user2.id);
    expect(user1.clerkId).toBe(clerkId);
  });

  it("should return existing guest after concurrent insert race", async () => {
    const clerkId = `guest_${crypto.randomUUID()}`;
    const first = await db.getOrCreateUserByClerkId(clerkId);

    const results = await Promise.all([
      db.getOrCreateUserByClerkId(clerkId),
      db.getOrCreateUserByClerkId(clerkId),
      db.getOrCreateUserByClerkId(clerkId),
    ]);

    expect(results.every((user) => user.id === first.id)).toBe(true);
  });
});
