import { NextRequest, NextResponse } from "next/server";
import { getPostHogClient } from "@/lib/posthog-server";
import { parseTopicRequest } from "@/lib/api/parseTopicRequest";
import {
  TopicGenerateApiError,
  topicGenerateUserError,
  generateTopicSentences,
  resolveTopicGenerateError,
  TOPIC_GENERATE_TRUNCATED_ERROR,
} from "@/lib/api/topicGenerateOpenAI";
import { db } from "@/utils/db";
import { resolveApiUser, withGuestToken } from "@/lib/api/resolveApiUser";
import { checkTopicRateLimit } from "@/lib/api/topicRateLimiter";

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
      const authErrorMessage =
        authError instanceof Error
          ? authError.message
          : "Unauthorized: Missing guest or user identification";
      return NextResponse.json({ error: authErrorMessage }, { status: 401 });
    }
    const { userId, issueGuestToken } = resolvedUser;

    // 3. Check and increment generation rate limit
    const limitCheck = await checkTopicRateLimit(req, userId, "generate");
    if (!limitCheck.allowed) {
      return NextResponse.json(
        withGuestToken({ error: "일일 생성 한도를 초과했습니다. (최대 15회)" }, issueGuestToken),
        { status: 429 },
      );
    }

    // 4. Generate sentences using OpenAI
    const sentences = await generateTopicSentences(topic);

    if (!sentences.sentences || sentences.sentences.length === 0) {
      const error = resolveTopicGenerateError(sentences);
      return NextResponse.json(withGuestToken({ error }, issueGuestToken), { status: 422 });
    }

    const responseData = sentences.sentences.map((content) => ({
      id: `target_gen_${crypto.randomUUID()}`,
      content,
      language: "ko",
    }));

    void cacheTopicTargetsWithRetry(responseData.map((item) => ({ ...item, topic })));

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: userId,
      event: "topic_generated",
      properties: { topic, sentence_count: responseData.length },
    });

    return NextResponse.json(
      withGuestToken({ success: true, data: responseData }, issueGuestToken),
    );
  } catch (error: unknown) {
    console.error("[generate/route] Error:", error);

    // Dynamic error handling
    if (error instanceof TopicGenerateApiError && error.retryable) {
      const userError =
        error.message === "OpenAI response truncated"
          ? TOPIC_GENERATE_TRUNCATED_ERROR
          : topicGenerateUserError(error.statusCode);
      return NextResponse.json({ error: userError }, { status: 503 });
    }

    return NextResponse.json(
      { error: "부적절한 주제이거나 문장 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
