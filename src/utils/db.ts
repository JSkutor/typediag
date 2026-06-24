/**
 * Database access layer for TypeDiag.
 *
 * Replaces the previous localStorage-based implementation with Drizzle ORM
 * queries against PostgreSQL (TimescaleDB).
 *
 * The public API (function signatures) is intentionally kept compatible with
 * the previous version so that sessionService.ts and other consumers need
 * minimal changes.
 */

import { eq, desc, sql, inArray } from "drizzle-orm";
import { drizzleDb } from "@/db";
import {
  users,
  targetTexts,
  runs,
  pages,
  keyEvents,
  type Run,
  type Page,
  type NewKeyEvent,
} from "@/db/schema";

// --- Row type re-exports for consumers ---

export type { Run as RunRow } from "@/db/schema";
export type { Page as PageRow } from "@/db/schema";
export type { TargetText as TargetTextRow } from "@/db/schema";

export interface KeyEventSchema {
  from_key: string | null;
  to_key: string;
  key_char: string;
  latency: number;
  hold_duration_ms: number | null;
  is_correct: boolean | null;
  expected_char: string | null;
}

function isPostgresUniqueViolation(error: unknown): boolean {
  const candidates = [error, (error as { cause?: unknown })?.cause];
  return candidates.some((candidate) => (candidate as { code?: string })?.code === "23505");
}

// --- Asynchronous DB API (Drizzle ORM) ---

export const db = {
  /**
   * Get an existing user by their Clerk ID or create a new user (guest or normal).
   */
  async getOrCreateUserByClerkId(clerkId: string) {
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
  },

  /**
   * Transfer all guest-owned runs and target texts to a member account, then remove the guest row.
   */
  async mergeGuestData(guestUserId: string, memberUserId: string): Promise<void> {
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
  },
  /**
   * Get list of all target texts.
   */
  async getTargetTexts() {
    return drizzleDb
      .select({
        id: targetTexts.id,
        content: targetTexts.content,
        language: targetTexts.language,
        source: targetTexts.source,
        generatorModel: targetTexts.generatorModel,
        topic: targetTexts.topic,
        userId: targetTexts.userId,
        usageCount: targetTexts.usageCount,
        lastUsedAt: targetTexts.lastUsedAt,
        createdAt: targetTexts.createdAt,
      })
      .from(targetTexts);
  },

  /**
   * Find a target text by its ID or content.
   */
  async findTargetText(query: { id?: string; content?: string }) {
    if (query.id) {
      const result = await drizzleDb
        .select()
        .from(targetTexts)
        .where(eq(targetTexts.id, query.id))
        .limit(1);
      return result[0] || null;
    }
    if (query.content) {
      const result = await drizzleDb
        .select()
        .from(targetTexts)
        .where(eq(targetTexts.content, query.content))
        .limit(1);
      return result[0] || null;
    }
    return null;
  },

  /**
   * Persist LLM-generated topic sentences without embedding.
   * Skips duplicates by content (unique constraint).
   */
  async insertTopicGeneratedTargets(
    items: Array<{ id: string; content: string; language: string; topic: string }>,
  ): Promise<void> {
    if (items.length === 0) return;

    await drizzleDb
      .insert(targetTexts)
      .values(
        items.map((item) => ({
          id: item.id,
          content: item.content,
          language: item.language,
          source: "topic",
          generatorModel: "gemini-2.5-flash-lite",
          topic: item.topic,
        })),
      )
      .onConflictDoNothing({ target: targetTexts.content });
  },

  /**
   * Create a new practice run (session).
   */
  async createRun(runData: {
    id?: string;
    user_id?: string | null;
    status: string;
    started_at: string;
  }): Promise<Run> {
    const [newRun] = await drizzleDb
      .insert(runs)
      .values({
        ...(runData.id ? { id: runData.id } : {}),
        userId: runData.user_id || null,
        status: runData.status,
        startedAt: new Date(runData.started_at),
      })
      .returning();
    return newRun;
  },

  /**
   * Delete a run session.
   */
  async deleteRun(runId: string): Promise<void> {
    await drizzleDb.delete(runs).where(eq(runs.id, runId));
  },

  /**
   * Update an existing run session.
   */
  async updateRun(
    runId: string,
    updates: {
      status?: string;
      started_at?: string;
      finished_at?: string | null;
      cpm?: number | null;
      wpm?: number | null;
      accuracy?: number | null;
    },
  ): Promise<Run> {
    const updateValues: Record<string, unknown> = {};
    if (updates.status !== undefined) updateValues.status = updates.status;
    if (updates.started_at !== undefined) updateValues.startedAt = new Date(updates.started_at);
    if (updates.finished_at !== undefined)
      updateValues.finishedAt = updates.finished_at ? new Date(updates.finished_at) : null;
    if (updates.cpm !== undefined) updateValues.cpm = updates.cpm;
    if (updates.wpm !== undefined) updateValues.wpm = updates.wpm;
    if (updates.accuracy !== undefined) updateValues.accuracy = updates.accuracy;

    const [updated] = await drizzleDb
      .update(runs)
      .set(updateValues)
      .where(eq(runs.id, runId))
      .returning();

    if (!updated) {
      throw new Error(`Run with ID ${runId} not found`);
    }
    return updated;
  },

  /**
   * Get a run by its ID.
   */
  async getRun(runId: string): Promise<Run | null> {
    const result = await drizzleDb.select().from(runs).where(eq(runs.id, runId)).limit(1);
    return result[0] || null;
  },

  /**
   * Get all runs in descending order.
   */
  async getAllRuns(): Promise<Run[]> {
    return drizzleDb.select().from(runs).orderBy(desc(runs.createdAt));
  },

  /**
   * Get the latest run (session) for a specific user.
   */
  async getLatestRun(userId: string): Promise<Run | null> {
    const result = await drizzleDb
      .select()
      .from(runs)
      .where(eq(runs.userId, userId))
      .orderBy(desc(runs.createdAt))
      .limit(1);
    return result[0] || null;
  },

  /**
   * Create a new page typing result and its associated key events.
   * Key events are bulk-inserted into the separate key_events table.
   */
  async createPage(pageData: {
    id?: string;
    run_id: string;
    target_text_id: string | null;
    order_index: number;
    language: string;
    typed_text: string;
    wpm: number;
    cpm: number;
    accuracy: number;
    started_at: string;
    finished_at: string;
    elapsed_time_ms: number;
    key_events: KeyEventSchema[];
  }): Promise<Page> {
    // Ensure target text exists in target_texts to prevent FK violation
    let targetTextId: string | null = pageData.target_text_id;
    if (targetTextId) {
      const exists = await drizzleDb
        .select({ id: targetTexts.id })
        .from(targetTexts)
        .where(eq(targetTexts.id, targetTextId))
        .limit(1);
      if (exists.length === 0) {
        targetTextId = null;
      }
    }

    // page와 key_events를 하나의 트랜잭션으로 묶어 고아 page 생성 방지
    const newPage = await drizzleDb.transaction(async (tx) => {
      const [page] = await tx
        .insert(pages)
        .values({
          runId: pageData.run_id,
          targetTextId,
          orderIndex: pageData.order_index,
          language: pageData.language,
          typedText: pageData.typed_text,
          wpm: pageData.wpm,
          cpm: pageData.cpm,
          accuracy: pageData.accuracy,
          startedAt: new Date(pageData.started_at),
          finishedAt: new Date(pageData.finished_at),
          elapsedTimeMs: pageData.elapsed_time_ms,
        })
        .returning();

      // Bulk insert key events into the normalized key_events table
      if (pageData.key_events.length > 0) {
        const keyEventRows: NewKeyEvent[] = pageData.key_events.map((ev, idx) => ({
          pageId: page.id,
          seq: idx,
          fromKey: ev.from_key ? ev.from_key.substring(0, 20) : null,
          toKey: ev.to_key ? ev.to_key.substring(0, 20) : "",
          keyChar: ev.key_char ? ev.key_char.substring(0, 10) : "",
          latency: Math.round(typeof ev.latency === "number" ? ev.latency : 0),
          holdDurationMs: ev.hold_duration_ms != null ? Math.round(ev.hold_duration_ms) : null,
          isCorrect: ev.is_correct ?? null,
          expectedChar: ev.expected_char ? ev.expected_char.substring(0, 10) : null,
          createdAt: page.createdAt ?? new Date(),
        }));

        // Batch insert in chunks of 500 to avoid exceeding query parameter limits
        const CHUNK_SIZE = 500;
        for (let i = 0; i < keyEventRows.length; i += CHUNK_SIZE) {
          const chunk = keyEventRows.slice(i, i + CHUNK_SIZE);
          await tx.insert(keyEvents).values(chunk);
        }
      }

      return page;
    });

    return newPage;
  },

  /**
   * Get all pages for a specific run.
   */
  async getPagesForRun(runId: string): Promise<Page[]> {
    return drizzleDb.select().from(pages).where(eq(pages.runId, runId)).orderBy(pages.orderIndex);
  },

  /**
   * Get key events for a specific page.
   */
  async getKeyEventsForPage(pageId: string) {
    return drizzleDb
      .select()
      .from(keyEvents)
      .where(eq(keyEvents.pageId, pageId))
      .orderBy(keyEvents.seq);
  },

  /**
   * Finalize a run by compiling metrics from all its pages.
   */
  async finalizeRun(runId: string, finishedAtStr?: string): Promise<Run | null> {
    const run = await this.getRun(runId);
    if (!run) return null;

    const runPages = await this.getPagesForRun(runId);
    if (runPages.length === 0) {
      return this.updateRun(runId, {
        status: "completed",
        finished_at: finishedAtStr || new Date().toISOString(),
        cpm: 0,
        wpm: 0,
        accuracy: 100,
      });
    }

    const validPages = runPages.filter((p) => p.elapsedTimeMs > 0);
    const pagesToAggregate = validPages.length > 0 ? validPages : runPages;

    const totalTimeMs = pagesToAggregate.reduce((sum, p) => sum + p.elapsedTimeMs, 0);

    // Count key events per page for weighted accuracy calculation
    const pageIds = pagesToAggregate.map((p) => p.id);
    const countMap = new Map<string, number>();

    if (pageIds.length > 0) {
      const keyEventCountsResult = await drizzleDb
        .select({ pageId: keyEvents.pageId, count: sql<number>`count(*)::int` })
        .from(keyEvents)
        .where(inArray(keyEvents.pageId, pageIds))
        .groupBy(keyEvents.pageId);

      for (const r of keyEventCountsResult) {
        countMap.set(r.pageId, r.count);
      }
    }

    const pageKeyEventCounts = pagesToAggregate.map((p) => countMap.get(p.id) ?? 0);

    const avgCpm =
      totalTimeMs > 0
        ? Math.round(
            pagesToAggregate.reduce((sum, p) => sum + p.cpm * p.elapsedTimeMs, 0) / totalTimeMs,
          )
        : Math.round(pagesToAggregate.reduce((sum, p) => sum + p.cpm, 0) / pagesToAggregate.length);

    const avgWpm =
      totalTimeMs > 0
        ? Math.round(
            pagesToAggregate.reduce((sum, p) => sum + p.wpm * p.elapsedTimeMs, 0) / totalTimeMs,
          )
        : Math.round(pagesToAggregate.reduce((sum, p) => sum + p.wpm, 0) / pagesToAggregate.length);

    const totalKeystrokes = pageKeyEventCounts.reduce((sum, c) => sum + c, 0);
    const avgAccuracy =
      totalKeystrokes > 0
        ? pagesToAggregate.reduce(
            (sum, p, i) => sum + (p.accuracy ?? 0) * pageKeyEventCounts[i],
            0,
          ) / totalKeystrokes
        : totalTimeMs > 0
          ? pagesToAggregate.reduce((sum, p) => sum + (p.accuracy ?? 0) * p.elapsedTimeMs, 0) /
            totalTimeMs
          : pagesToAggregate.reduce((sum, p) => sum + (p.accuracy ?? 0), 0) /
            pagesToAggregate.length;

    return this.updateRun(runId, {
      status: "completed",
      finished_at: finishedAtStr || new Date().toISOString(),
      cpm: avgCpm,
      wpm: avgWpm,
      accuracy: avgAccuracy,
    });
  },

  /**
   * Sync active session on app mount:
   * If there is an unfinished run, finalize it if idle for more than 3 minutes.
   */
  async syncSessionOnMount(userId: string): Promise<void> {
    const latestRun = await this.getLatestRun(userId);
    if (!latestRun || latestRun.status === "completed") {
      return;
    }

    if (latestRun.status === "pending") {
      await this.deleteRun(latestRun.id);
      return;
    }

    const runPages = await this.getPagesForRun(latestRun.id);
    const lastActiveStr =
      runPages.length > 0
        ? runPages[runPages.length - 1].finishedAt.toISOString()
        : latestRun.startedAt.toISOString();
    const lastActiveAt = new Date(lastActiveStr).getTime();
    const now = Date.now();

    if (now - lastActiveAt > 3 * 60 * 1000) {
      await this.finalizeRun(latestRun.id, lastActiveStr);
    }
  },
};
