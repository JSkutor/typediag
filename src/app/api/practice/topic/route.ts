import { NextRequest, NextResponse } from "next/server";
import { parseTopicRequest } from "@/lib/api/parseTopicRequest";
import { drizzleDb } from "@/db";
import { targetTexts } from "@/db/schema";
import { sql } from "drizzle-orm";
import { resolveApiUser, withGuestToken } from "@/lib/api/resolveApiUser";
import { checkTopicRateLimit } from "@/lib/api/topicRateLimiter";

export async function POST(req: NextRequest) {
  try {
    // 1. Parse and validate the topic request body first to avoid counting invalid requests
    const parsed = await parseTopicRequest(req);
    if (!parsed.ok) {
      return parsed.response;
    }
    const { topic } = parsed;

    // 2. Identify the user (Clerk user or Guest user)
    let resolvedUser;
    try {
      resolvedUser = await resolveApiUser(req);
    } catch (authError: unknown) {
      const authErrorMessage = authError instanceof Error ? authError.message : "Unauthorized: Missing guest or user identification";
      return NextResponse.json(
        { error: authErrorMessage },
        { status: 401 }
      );
    }
    const { userId, issueGuestToken } = resolvedUser;

    // 3. Check and increment search rate limit
    const limitCheck = await checkTopicRateLimit(req, userId, "search");
    if (!limitCheck.allowed) {
      return NextResponse.json(
        withGuestToken(
          { error: "일일 검색 한도를 초과했습니다. (최대 100회)" },
          issueGuestToken
        ),
        { status: 429 }
      );
    }

    // 4. Call Upstage embedding API
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
    const queryEmbedding = embeddingData.data[0].embedding as number[];

    // 5. pgvector Cosine similarity search
    const vectorLiteral = sql.raw(`'[${queryEmbedding.join(",")}]'::vector`);

    const results = await drizzleDb
      .select({
        id: targetTexts.id,
        content: targetTexts.content,
        language: targetTexts.language,
        similarity: sql<number>`1 - (${targetTexts.embedding} <=> ${vectorLiteral})`,
      })
      .from(targetTexts)
      .where(
        sql`${targetTexts.embedding} IS NOT NULL AND (1 - (${targetTexts.embedding} <=> ${vectorLiteral})) > 0.5`,
      )
      .orderBy(sql`${targetTexts.embedding} <=> ${vectorLiteral}`)
      .limit(100);

    if (!results || results.length === 0) {
      return NextResponse.json(
        withGuestToken({ error: "No matching targets found" }, issueGuestToken),
        { status: 404 }
      );
    }

    return NextResponse.json(
      withGuestToken({ success: true, data: results }, issueGuestToken)
    );
  } catch (error: unknown) {
    console.error("Topic Mode Search Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
