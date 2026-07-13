import { eq, desc } from "drizzle-orm";
import { drizzleDb } from "@/db";
import { runs, pages } from "@/db/schema";
import type { KeyEvent } from "@/lib/skdm";

/**
 * Unpacks a page's parallel arrays back into a KeyEvent array.
 * The index i across all packed columns corresponds to the i-th keystroke.
 */
function unpackKeyEvents(page: {
  packedFromKeys: (string | null)[] | null;
  packedToKeys: (string | null)[] | null;
  packedLatencies: (number | null)[] | null;
  packedHolds: (number | null)[] | null;
  packedIsCorrects: (boolean | null)[] | null;
  packedExpectedChars: (string | null)[] | null;
  packedKeyChars: (string | null)[] | null;
}): KeyEvent[] {
  const toKeys = page.packedToKeys;
  if (!toKeys || toKeys.length === 0) return [];

  return toKeys.map((toKey, i) => ({
    fromKey: page.packedFromKeys?.[i] || null, // "" sentinel → null
    toKey: toKey ?? "",
    latencyMs: page.packedLatencies?.[i] ?? 0,
    holdDurationMs: (page.packedHolds?.[i] ?? -1) === -1 ? null : page.packedHolds![i], // -1 sentinel → null
    isCorrect: page.packedIsCorrects?.[i] ?? null,
    expectedChar: page.packedExpectedChars?.[i] || null, // "" sentinel → null
    keyChar: page.packedKeyChars?.[i] || undefined, // "" sentinel → undefined
  }));
}

/**
 * Get all key events for a specific page, unpacked from parallel arrays.
 */
export async function getKeyEventsForPage(pageId: string): Promise<KeyEvent[]> {
  const result = await drizzleDb
    .select({
      packedFromKeys: pages.packedFromKeys,
      packedToKeys: pages.packedToKeys,
      packedLatencies: pages.packedLatencies,
      packedHolds: pages.packedHolds,
      packedIsCorrects: pages.packedIsCorrects,
      packedExpectedChars: pages.packedExpectedChars,
      packedKeyChars: pages.packedKeyChars,
    })
    .from(pages)
    .where(eq(pages.id, pageId))
    .limit(1);

  if (result.length === 0) return [];
  return unpackKeyEvents(result[0]);
}

/**
 * Get all key events for a specific user across all runs and pages,
 * unpacked from parallel arrays. Ordered by run.startedAt → page.orderIndex.
 */
export async function getKeyEventsForUser(userId: string): Promise<KeyEvent[]> {
  const userPages = await drizzleDb
    .select({
      packedFromKeys: pages.packedFromKeys,
      packedToKeys: pages.packedToKeys,
      packedLatencies: pages.packedLatencies,
      packedHolds: pages.packedHolds,
      packedIsCorrects: pages.packedIsCorrects,
      packedExpectedChars: pages.packedExpectedChars,
      packedKeyChars: pages.packedKeyChars,
      orderIndex: pages.orderIndex,
      runStartedAt: runs.startedAt,
    })
    .from(pages)
    .innerJoin(runs, eq(pages.runId, runs.id))
    .where(eq(runs.userId, userId))
    .orderBy(desc(runs.startedAt), pages.orderIndex);

  return userPages.flatMap((p) => unpackKeyEvents(p));
}
