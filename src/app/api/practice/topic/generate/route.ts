import { NextResponse } from "next/server";
import { parseTopicRequest } from "@/lib/api/parseTopicRequest";
import {
  GeminiApiError,
  geminiUserError,
  generateSentencesWithGemini,
} from "@/lib/api/topicGenerateGemini";
import { db } from "@/utils/db";
import crypto from "crypto";

const TOPIC_CACHE_RETRY_DELAYS_MS = [500, 1500] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cacheTopicTargetsWithRetry(
  items: Array<{ id: string; content: string; language: string; topic: string }>,
): Promise<void> {
  for (let attempt = 0; attempt <= TOPIC_CACHE_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      await db.insertTopicGeneratedTargets(items);
      return;
    } catch (err) {
      const isLastAttempt = attempt >= TOPIC_CACHE_RETRY_DELAYS_MS.length;
      if (isLastAttempt) {
        console.error("[generate/route] insertTopicGeneratedTargets failed after retries:", err);
        return;
      }
      await sleep(TOPIC_CACHE_RETRY_DELAYS_MS[attempt]);
    }
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await parseTopicRequest(req);
    if (!parsed.ok) {
      return parsed.response;
    }
    const { topic } = parsed;

    const sentences = await generateSentencesWithGemini(topic);

    if (!sentences.sentences || sentences.sentences.length === 0) {
      const error =
        sentences.rawCount > 0
          ? "생성된 문장이 형식 요건에 맞지 않습니다. 다시 시도해 주세요."
          : "부적절한 주제이거나 문장 생성에 실패했습니다.";
      return NextResponse.json({ error }, { status: 422 });
    }

    const responseData = sentences.sentences.map((content) => ({
      id: `target_gen_${crypto.randomUUID()}`,
      content,
      language: "ko",
    }));

    void cacheTopicTargetsWithRetry(responseData.map((item) => ({ ...item, topic })));

    return NextResponse.json({ success: true, data: responseData });
  } catch (error: unknown) {
    console.error("[generate/route] Error:", error);

    if (error instanceof GeminiApiError && error.retryable) {
      return NextResponse.json({ error: geminiUserError(error.statusCode) }, { status: 503 });
    }

    return NextResponse.json(
      { error: "부적절한 주제이거나 문장 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
