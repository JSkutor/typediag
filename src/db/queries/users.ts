import { eq } from "drizzle-orm";
import { drizzleDb } from "@/db";
import { users, runs, targetTexts } from "@/db/schema";

export function isPostgresUniqueViolation(error: unknown): boolean {
  const candidates = [error, (error as { cause?: unknown })?.cause];
  return candidates.some((candidate) => (candidate as { code?: string })?.code === "23505");
}

/**
 * Get an existing user by their Clerk ID or create a new user (guest or normal).
 */
export async function getOrCreateUserByClerkId(clerkId: string) {
  const existing = await drizzleDb.select().from(users).where(eq(users.id, clerkId)).limit(1);
  if (existing[0]) {
    return existing[0];
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [newUser] = await drizzleDb
        .insert(users)
        .values({ id: clerkId })
        .onConflictDoNothing({ target: users.id })
        .returning();

      if (newUser) {
        return newUser;
      }

      const concurrentUser = await drizzleDb
        .select()
        .from(users)
        .where(eq(users.id, clerkId))
        .limit(1);
      if (concurrentUser[0]) {
        return concurrentUser[0];
      }
    } catch (error: unknown) {
      if (!isPostgresUniqueViolation(error)) {
        throw error;
      }

      const concurrentUser = await drizzleDb
        .select()
        .from(users)
        .where(eq(users.id, clerkId))
        .limit(1);
      if (concurrentUser[0]) {
        return concurrentUser[0];
      }
    }
  }

  throw new Error(`Failed to create user for clerkId: ${clerkId}`);
}

/**
 * Transfer all guest-owned runs and target texts to a member account, then remove the guest row.
 */
export async function mergeGuestData(guestUserId: string, memberUserId: string): Promise<void> {
  if (guestUserId === memberUserId) {
    return;
  }

  await drizzleDb.transaction(async (tx) => {
    await tx.update(runs).set({ userId: memberUserId }).where(eq(runs.userId, guestUserId));
    await tx
      .update(targetTexts)
      .set({ userId: memberUserId })
      .where(eq(targetTexts.userId, guestUserId));
    await tx.delete(users).where(eq(users.id, guestUserId));
  });
}
