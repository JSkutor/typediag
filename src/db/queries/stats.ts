import { eq, and, gt, type SQL } from "drizzle-orm";
import { drizzleDb } from "@/db";
import { runs, pages, keyEvents } from "@/db/schema";

/**
 * Get key events for a specific page.
 */
export async function getKeyEventsForPage(pageId: string) {
  return drizzleDb
    .select()
    .from(keyEvents)
    .where(eq(keyEvents.pageId, pageId))
    .orderBy(keyEvents.seq);
}

/**
 * Get all key events for a specific user across all runs and pages.
 *
 * Internally fetches in cursor-based batches of BATCH_SIZE to avoid
 * loading unbounded rows into memory in a single query.
 * The returned array contains all events, ordered by (run.startedAt,
 * page.orderIndex, key_event.seq) — same semantics as before.
 */
export async function getKeyEventsForUser(userId: string) {
  const BATCH_SIZE = 5_000;
  const results: {
    id: bigint;
    pageId: string;
    seq: number;
    fromKey: string | null;
    toKey: string;
    keyChar: string | null;
    latency: number;
    holdDurationMs: number | null;
    isCorrect: boolean | null;
    expectedChar: string | null;
    createdAt: Date;
  }[] = [];

  // cursor는 마지막으로 가져온 key_events.id (bigint). null이면 처음부터 조회.
  let cursor: bigint | null = null;

  while (true) {
    const conditions: SQL[] = [
      eq(runs.userId, userId),
      ...(cursor !== null ? [gt(keyEvents.id, cursor)] : []),
    ];

    const batch = await drizzleDb
      .select({
        id: keyEvents.id,
        pageId: keyEvents.pageId,
        seq: keyEvents.seq,
        fromKey: keyEvents.fromKey,
        toKey: keyEvents.toKey,
        keyChar: keyEvents.keyChar,
        latency: keyEvents.latency,
        holdDurationMs: keyEvents.holdDurationMs,
        isCorrect: keyEvents.isCorrect,
        expectedChar: keyEvents.expectedChar,
        createdAt: keyEvents.createdAt,
      })
      .from(keyEvents)
      .innerJoin(pages, eq(keyEvents.pageId, pages.id))
      .innerJoin(runs, eq(pages.runId, runs.id))
      .where(and(...conditions))
      .orderBy(keyEvents.id)
      .limit(BATCH_SIZE);

    if (batch.length === 0) break;

    results.push(...batch);

    // 배치가 꽉 찼을 때만 다음 페이지 요청
    if (batch.length < BATCH_SIZE) break;

    cursor = batch[batch.length - 1].id;
  }

  return results;
}
