import { eq, desc } from "drizzle-orm";
import { drizzleDb } from "@/db";
import {
  runs,
  pages,
  targetTexts,
  type Run,
  type Page,
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

/**
 * Create a new practice run (session).
 */
export async function createRun(runData: {
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
}

/**
 * Delete a run session.
 */
export async function deleteRun(runId: string): Promise<void> {
  await drizzleDb.delete(runs).where(eq(runs.id, runId));
}

/**
 * Update an existing run session.
 */
export async function updateRun(
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
}

/**
 * Get a run by its ID.
 */
export async function getRun(runId: string): Promise<Run | null> {
  const result = await drizzleDb.select().from(runs).where(eq(runs.id, runId)).limit(1);
  return result[0] || null;
}

/**
 * Get all runs in descending order.
 */
export async function getAllRuns(): Promise<Run[]> {
  return drizzleDb.select().from(runs).orderBy(desc(runs.createdAt));
}

/**
 * Get the latest run (session) for a specific user.
 */
export async function getLatestRun(userId: string): Promise<Run | null> {
  const result = await drizzleDb
    .select()
    .from(runs)
    .where(eq(runs.userId, userId))
    .orderBy(desc(runs.createdAt))
    .limit(1);
  return result[0] || null;
}

/**
 * Create a new page typing result and pack all key events as parallel arrays.
 * A single INSERT replaces the previous page + key_events bulk transaction.
 */
export async function createPage(pageData: {
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

  // Pack all key events into parallel arrays (one element per keystroke).
  // Nullable fields: fromKey → "" (empty string sentinel), expectedChar → "" (empty string sentinel).
  // holdDurationMs → -1 sentinel for "no hold recorded". isCorrect → stored as boolean[].
  const evs = pageData.key_events;
  const packedFromKeys = evs.length > 0 ? evs.map((e) => (e.from_key ? e.from_key.substring(0, 20) : "")) : null;
  const packedToKeys = evs.length > 0 ? evs.map((e) => (e.to_key ? e.to_key.substring(0, 20) : "")) : null;
  const packedLatencies = evs.length > 0 ? evs.map((e) => Math.round(typeof e.latency === "number" ? e.latency : 0)) : null;
  const packedHolds = evs.length > 0 ? evs.map((e) => (e.hold_duration_ms != null ? Math.round(e.hold_duration_ms) : -1)) : null;
  const packedIsCorrects = evs.length > 0 ? evs.map((e) => e.is_correct ?? true) : null;
  const packedExpectedChars = evs.length > 0 ? evs.map((e) => (e.expected_char ? e.expected_char.substring(0, 10) : "")) : null;
  const packedKeyChars = evs.length > 0 ? evs.map((e) => (e.key_char ? e.key_char.substring(0, 10) : "")) : null;

  const baseValues = {
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
    packedFromKeys,
    packedToKeys,
    packedLatencies,
    packedHolds,
    packedIsCorrects,
    packedExpectedChars,
    packedKeyChars,
  };

  const [newPage] = await drizzleDb
    .insert(pages)
    .values(pageData.id ? { id: pageData.id, ...baseValues } : baseValues)
    .returning();

  return newPage;
}

/**
 * Get all pages for a specific run.
 */
export async function getPagesForRun(runId: string): Promise<Page[]> {
  return drizzleDb.select().from(pages).where(eq(pages.runId, runId)).orderBy(pages.orderIndex);
}

/**
 * Finalize a run by compiling metrics from all its pages.
 */
export async function finalizeRun(runId: string, finishedAtStr?: string): Promise<Run | null> {
  const run = await getRun(runId);
  if (!run) return null;

  const runPages = await getPagesForRun(runId);
  if (runPages.length === 0) {
    return updateRun(runId, {
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

  // Count keystrokes per page from packed arrays (replaces key_events JOIN).
  // packedToKeys is always set when events exist; fall back to 0 if no events recorded.
  const pageKeyEventCounts = pagesToAggregate.map((p) => p.packedToKeys?.length ?? 0);

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
      ? pagesToAggregate.reduce((sum, p, i) => sum + (p.accuracy ?? 0) * pageKeyEventCounts[i], 0) /
        totalKeystrokes
      : totalTimeMs > 0
        ? pagesToAggregate.reduce((sum, p) => sum + (p.accuracy ?? 0) * p.elapsedTimeMs, 0) /
          totalTimeMs
        : pagesToAggregate.reduce((sum, p) => sum + (p.accuracy ?? 0), 0) / pagesToAggregate.length;

  return updateRun(runId, {
    status: "completed",
    finished_at: finishedAtStr || new Date().toISOString(),
    cpm: avgCpm,
    wpm: avgWpm,
    accuracy: avgAccuracy,
  });
}

/**
 * Sync active session on app mount:
 * If there is an unfinished run, finalize it if idle for more than 3 minutes.
 */
export async function syncSessionOnMount(userId: string): Promise<void> {
  const latestRun = await getLatestRun(userId);
  if (!latestRun || latestRun.status === "completed") {
    return;
  }

  if (latestRun.status === "pending") {
    await deleteRun(latestRun.id);
    return;
  }

  const runPages = await getPagesForRun(latestRun.id);
  const lastActiveStr =
    runPages.length > 0
      ? runPages[runPages.length - 1].finishedAt.toISOString()
      : latestRun.startedAt.toISOString();
  const lastActiveAt = new Date(lastActiveStr).getTime();
  const now = Date.now();

  if (now - lastActiveAt > 3 * 60 * 1000) {
    await finalizeRun(latestRun.id, lastActiveStr);
  }
}
