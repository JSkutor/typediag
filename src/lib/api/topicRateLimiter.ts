import type { NextRequest } from "next/server";
import { drizzleDb } from "@/db";
import { topicUsageLimits } from "@/db/schema";
import { sql, and, eq } from "drizzle-orm";

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
}

export const TOPIC_LIMITS = {
  search: 100,
  generate: 15,
} as const;

/**
 * Checks if a user has exceeded their daily quota for Topic Mode search/generation.
 * Increments the request count if the user is allowed to proceed.
 */
export async function checkTopicRateLimit(
  request: NextRequest,
  userId: string,
  actionType: "search" | "generate"
): Promise<RateLimitResult> {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  // Use current UTC date string YYYY-MM-DD to align with DB date type representation
  const todayStr = new Date().toISOString().slice(0, 10);
  const limit = TOPIC_LIMITS[actionType];

  // 1. Query the current usage count for the day
  const [existingRecord] = await drizzleDb
    .select({ requestCount: topicUsageLimits.requestCount })
    .from(topicUsageLimits)
    .where(
      and(
        eq(topicUsageLimits.userId, userId),
        eq(topicUsageLimits.actionType, actionType),
        eq(topicUsageLimits.usageDate, todayStr)
      )
    );

  const currentCount = existingRecord ? existingRecord.requestCount : 0;

  if (currentCount >= limit) {
    return {
      allowed: false,
      currentCount,
      limit,
    };
  }

  // 2. Increment request count using upsert (on conflict do update)
  await drizzleDb
    .insert(topicUsageLimits)
    .values({
      userId,
      ipAddress,
      actionType,
      usageDate: todayStr,
      requestCount: 1,
    })
    .onConflictDoUpdate({
      target: [
        topicUsageLimits.userId,
        topicUsageLimits.actionType,
        topicUsageLimits.usageDate,
      ],
      set: {
        requestCount: sql`${topicUsageLimits.requestCount} + 1`,
        ipAddress,
      },
    });

  return {
    allowed: true,
    currentCount: currentCount + 1,
    limit,
  };
}
