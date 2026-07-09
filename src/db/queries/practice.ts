import { eq, ne, and, sql } from "drizzle-orm";
import { drizzleDb } from "@/db";
import { targetTexts } from "@/db/schema";
import { OPENAI_TOPIC_MODEL } from "@/lib/api/topicGenerateOpenAI";

/**
 * Get list of all target texts.
 */
export async function getTargetTexts() {
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
}

/**
 * Pick one random target text for Normal mode practice.
 */
export async function getRandomTargetText(language: string, excludeId?: string) {
  const conditions = [eq(targetTexts.language, language)];
  if (excludeId) {
    conditions.push(ne(targetTexts.id, excludeId));
  }

  const result = await drizzleDb
    .select({
      id: targetTexts.id,
      content: targetTexts.content,
      language: targetTexts.language,
    })
    .from(targetTexts)
    .where(and(...conditions))
    .orderBy(sql`RANDOM()`)
    .limit(1);

  return result[0] ?? null;
}

/**
 * Find a target text by its ID or content.
 */
export async function findTargetText(query: { id?: string; content?: string }) {
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
}

/**
 * Persist LLM-generated topic sentences without embedding.
 * Skips duplicates by content (unique constraint).
 */
export async function insertTopicGeneratedTargets(
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
        generatorModel: OPENAI_TOPIC_MODEL,
        topic: item.topic,
      })),
    )
    .onConflictDoNothing({ target: targetTexts.content });
}
