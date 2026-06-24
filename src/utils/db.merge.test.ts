import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { drizzleDb } from "@/db";
import { targetTexts, users } from "@/db/schema";
import { db } from "./db";

describe("mergeGuestData", () => {
  it("should transfer guest runs and target texts to a member account and delete the guest row", async () => {
    const guestClerkId = `guest_${crypto.randomUUID()}`;
    const memberClerkId = `user_${crypto.randomUUID()}`;

    const guestUser = await db.getOrCreateUserByClerkId(guestClerkId);
    const memberUser = await db.getOrCreateUserByClerkId(memberClerkId);

    const guestRun = await db.createRun({
      user_id: guestUser.id,
      status: "completed",
      started_at: "2026-06-15T00:00:00Z",
    });

    const targetTextId = `guest-target-${crypto.randomUUID().slice(0, 8)}`;
    await drizzleDb.insert(targetTexts).values({
      id: targetTextId,
      content: `guest-content-${crypto.randomUUID()}`,
      language: "ko",
      source: "default",
      userId: guestUser.id,
    });

    await db.mergeGuestData(guestUser.id, memberUser.id);

    const transferredRun = await db.getRun(guestRun.id);
    expect(transferredRun?.userId).toBe(memberUser.id);

    const transferredTargetText = await drizzleDb
      .select()
      .from(targetTexts)
      .where(eq(targetTexts.id, targetTextId))
      .limit(1);
    expect(transferredTargetText[0]?.userId).toBe(memberUser.id);

    const deletedGuest = await drizzleDb
      .select()
      .from(users)
      .where(eq(users.id, guestUser.id))
      .limit(1);
    expect(deletedGuest).toHaveLength(0);
  });

  it("should skip merging if guestUserId and memberUserId are identical", async () => {
    const clerkId = `guest_${crypto.randomUUID()}`;
    const user = await db.getOrCreateUserByClerkId(clerkId);

    // Call merge with identical IDs
    await db.mergeGuestData(user.id, user.id);

    // Ensure user still exists
    const existing = await drizzleDb.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(existing).toHaveLength(1);
  });
});
