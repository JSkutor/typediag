import type { NextRequest } from "next/server";
import { drizzleDb } from "@/db";
import { userFeedbacks } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

export interface FeedbackRateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
}

export const FEEDBACK_DAILY_LIMIT = 10;

export async function checkFeedbackRateLimit(userId: string): Promise<FeedbackRateLimitResult> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [row] = await drizzleDb
    .select({ count: sql<number>`count(*)::int` })
    .from(userFeedbacks)
    .where(and(eq(userFeedbacks.userId, userId), gte(userFeedbacks.createdAt, todayStart)));

  const currentCount = row?.count ?? 0;

  return {
    allowed: currentCount < FEEDBACK_DAILY_LIMIT,
    currentCount,
    limit: FEEDBACK_DAILY_LIMIT,
  };
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}
