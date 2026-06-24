import { NextResponse } from "next/server";
import { parseTopicRequest } from "@/lib/api/parseTopicRequest";
import { drizzleDb } from "@/db";
import { targetTexts } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const parsed = await parseTopicRequest(req);
    if (!parsed.ok) {
      return parsed.response;
    }
    const { topic } = parsed;

    // 1. Upstage 임베딩 API 호출
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

    // 2. pgvector 코사인 유사도 검색
    // sql.raw()로 벡터 문자열을 삽입하여 Drizzle이 이를 파라미터가 아닌 리터럴로 처리하게 함.
    // queryEmbedding은 Upstage API에서 받은 number[] 배열이므로 인젝션 위험 없음 (숫자만 포함).
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
      return NextResponse.json({ error: "No matching targets found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: unknown) {
    console.error("Topic Mode Search Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
