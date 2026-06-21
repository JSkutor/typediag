import { NextResponse } from "next/server";
import { findNearestNeighbors } from "@/utils/vectorSearchMock";
import fs from "fs";
import path from "path";
import { validateSubject } from "@/utils/validation";

interface VectorTarget {
  id: string;
  content: string;
  language: string;
  source: "default" | "subject" | "custom";
  generator_model: string | null;
  subject: string | null;
  user_id: string | null;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  embedding: number[];
}

// 캐싱을 위한 전역 변수
let cachedVectorTargets: VectorTarget[] | null = null;

function getVectorTargets() {
  if (cachedVectorTargets) return cachedVectorTargets;
  const filePath = path.join(process.cwd(), "src", "data", "targets_vector.json");
  const data = fs.readFileSync(filePath, "utf-8");
  cachedVectorTargets = JSON.parse(data);
  return cachedVectorTargets;
}

export async function POST(req: Request) {
  try {
    const { subject } = await req.json();

    if (!subject || typeof subject !== "string") {
      return NextResponse.json(
        { error: "Invalid subject provided" },
        { status: 400 }
      );
    }

    // 1단계: 유효성 검사 실행
    const validation = validateSubject(subject);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.reason || "올바르지 않은 주제입니다." },
        { status: 400 }
      );
    }

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
        input: subject,
        model: "embedding-query",
      }),
    });

    if (!embeddingRes.ok) {
      const errorText = await embeddingRes.text();
      throw new Error(`OpenAI API Error: ${errorText}`);
    }

    const embeddingData = await embeddingRes.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // 2. 벡터 유사도 검색
    const targets = getVectorTargets() || [];
    const results = findNearestNeighbors(queryEmbedding, targets, 1);

    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: "No matching targets found" },
        { status: 404 }
      );
    }

    // 3. 결과 반환 (프론트엔드로는 큰 embedding 배열을 보낼 필요가 없음)
    const bestMatch = results[0];
    const { embedding: _embedding, ...matchWithoutEmbedding } = bestMatch;

    return NextResponse.json({
      success: true,
      data: matchWithoutEmbedding,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Subject Mode Search Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
