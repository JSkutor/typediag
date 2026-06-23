import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { drizzleDb } from "@/db";
import { targetTexts } from "@/db/schema";
import { validateTopic } from "@/utils/validation";

function devOnly() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Forbidden (API only available in development mode)" },
      { status: 403 },
    );
  }
  return null;
}

async function embedQuery(topic: string): Promise<number[]> {
  const upstageApiKey = process.env.UPSTAGE_API_KEY;
  if (!upstageApiKey) {
    throw new Error("UPSTAGE_API_KEY is not set in environment variables.");
  }

  const embeddingRes = await fetch("https://api.upstage.ai/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${upstageApiKey}`,
    },
    body: JSON.stringify({
      input: topic,
      model: "embedding-query",
    }),
  });

  if (!embeddingRes.ok) {
    const errorText = await embeddingRes.text();
    throw new Error(`Upstage API Error: ${errorText}`);
  }

  const embeddingData = await embeddingRes.json();
  const embedding = embeddingData.data?.[0]?.embedding as number[] | undefined;
  if (!Array.isArray(embedding)) {
    throw new Error("Upstage API returned an invalid embedding payload.");
  }
  return embedding;
}

export async function POST(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const topic = typeof body?.topic === "string" ? body.topic : "";
    const limitRaw = body?.limit;
    const limit =
      typeof limitRaw === "number" && Number.isFinite(limitRaw)
        ? Math.min(100, Math.max(1, Math.floor(limitRaw)))
        : 50;

    const validation = validateTopic(topic);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.reason || "올바르지 않은 주제입니다." },
        { status: 400 },
      );
    }

    const queryEmbedding = await embedQuery(topic.trim());
    const vectorStr = `[${queryEmbedding.join(",")}]`;

    const [countRow] = await drizzleDb
      .select({ count: sql<number>`count(*)::int` })
      .from(targetTexts)
      .where(sql`${targetTexts.embedding} IS NOT NULL`);

    const results = await drizzleDb
      .select({
        id: targetTexts.id,
        content: targetTexts.content,
        language: targetTexts.language,
        source: targetTexts.source,
        topic: targetTexts.topic,
        similarity: sql<number>`1 - (${targetTexts.embedding} <=> ${vectorStr}::vector)`,
      })
      .from(targetTexts)
      .where(sql`${targetTexts.embedding} IS NOT NULL`)
      .orderBy(sql`${targetTexts.embedding} <=> ${vectorStr}::vector`)
      .limit(limit);

    return NextResponse.json({
      queryTopic: topic.trim(),
      totalWithEmbedding: countRow?.count ?? 0,
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Dev cosine similarity error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
