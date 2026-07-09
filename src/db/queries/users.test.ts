import { describe, it, expect, afterEach } from "vitest";
import { eq, or, like } from "drizzle-orm";
import { drizzleDb } from "@/db";
import { targetTexts, users } from "@/db/schema";

import { getOrCreateUserByClerkId, mergeGuestData } from "./users";
import { createRun, getRun } from "./sessions";

describe("mergeGuestData", () => {
  afterEach(async () => {
    await drizzleDb
      .delete(targetTexts)
      .where(
        or(like(targetTexts.id, "guest-target-%"), like(targetTexts.content, "guest-content-%")),
      );
  });

  it("should transfer guest runs and target texts to a member account and delete the guest row", async () => {
    const guestClerkId = `guest_${crypto.randomUUID()}`;
    const memberClerkId = `user_${crypto.randomUUID()}`;

    const guestUser = await getOrCreateUserByClerkId(guestClerkId);
    const memberUser = await getOrCreateUserByClerkId(memberClerkId);

    const guestRun = await createRun({
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

    await mergeGuestData(guestUser.id, memberUser.id);

    const transferredRun = await getRun(guestRun.id);
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
    const user = await getOrCreateUserByClerkId(clerkId);

    // Call merge with identical IDs
    await mergeGuestData(user.id, user.id);

    // Ensure user still exists
    const existing = await drizzleDb.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(existing).toHaveLength(1);
  });
});
