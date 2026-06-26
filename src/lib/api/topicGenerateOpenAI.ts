import { filterTopicGeneratedSentences } from "@/lib/practice/targetSentence";
import prompts from "@/lib/practice/prompts.json";

const TOPIC_SENTENCE_JSON_SCHEMA = {
  type: "object",
  properties: {
    sentences: {
      type: "array",
      items: { type: "string" },
      minItems: 20,
      maxItems: 20,
    },
  },
  required: ["sentences"],
  additionalProperties: false,
} as const;

export const OPENAI_TOPIC_MODEL = "gpt-4.1-nano" as const;
/** 20×(≤110 한글+부호) JSON — 4000 tok에서 잘림이 발생해 여유 있게 설정 */
export const TOPIC_GENERATE_MAX_OUTPUT_TOKENS = 8192 as const;
/** Backoff between retryable failures (429/503/truncation). 4 retries after the initial attempt. */
export const TOPIC_GENERATE_RETRY_DELAYS_MS = [2500, 5000, 8000, 12000] as const;

export const TOPIC_GENERATE_TRUNCATED_ERROR =
  "문장 생성 응답이 잘렸습니다. 잠시 후 다시 시도해 주세요.";

export const TOPIC_GENERATE_PARSE_ERROR =
  "문장 생성 응답을 해석하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export const TOPIC_GENERATE_VALIDATION_ERROR =
  "생성된 문장이 형식 요건에 맞지 않습니다. 다시 시도해 주세요.";

export const TOPIC_GENERATE_EMPTY_ERROR =
  "부적절한 주제이거나 문장 생성에 실패했습니다.";

export function topicGenerateUserError(statusCode: number): string {
  if (statusCode === 429) {
    return "문장 생성 API 할당량이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (statusCode === 503) {
    return "문장 생성 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해 주세요.";
  }
  return "문장 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

export class TopicGenerateApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "TopicGenerateApiError";
  }
}

export function parseTopicGenerateErrorStatus(errText: string): number | null {
  try {
    const parsed = JSON.parse(errText) as { error?: { code?: string | number } };
    const code = parsed.error?.code;
    if (typeof code === "number") {
      return code;
    }
    if (code === "rate_limit_exceeded") {
      return 429;
    }
    return null;
  } catch {
    return null;
  }
}

export function isRetryableTopicGenerateStatus(status: number | null): boolean {
  return status === 429 || status === 503;
}

export function parseTopicSentencesResponse(rawText: string): {
  sentences: string[];
  rawCount: number;
  parseFailed: boolean;
} {
  try {
    const parsed = JSON.parse(rawText) as { sentences?: unknown };
    if (Array.isArray(parsed.sentences)) {
      const filtered = filterTopicGeneratedSentences(parsed.sentences);
      return { sentences: filtered, rawCount: parsed.sentences.length, parseFailed: false };
    }
  } catch {
    return { sentences: [], rawCount: 0, parseFailed: true };
  }
  return { sentences: [], rawCount: 0, parseFailed: true };
}

export type TopicGenerateResult = {
  sentences: string[];
  rawCount: number;
  truncated: boolean;
  parseFailed: boolean;
};

export function resolveTopicGenerateError(result: Pick<
  TopicGenerateResult,
  "sentences" | "rawCount" | "truncated" | "parseFailed"
>): string {
  if (result.sentences.length > 0) {
    return "";
  }
  if (result.truncated) {
    return TOPIC_GENERATE_TRUNCATED_ERROR;
  }
  if (result.parseFailed) {
    return TOPIC_GENERATE_PARSE_ERROR;
  }
  if (result.rawCount > 0) {
    return TOPIC_GENERATE_VALIDATION_ERROR;
  }
  return TOPIC_GENERATE_EMPTY_ERROR;
}

async function callOpenAITopicGenerate(
  apiKey: string,
  topic: string,
): Promise<TopicGenerateResult> {
  const systemInstruction = prompts.topic.system_instruction;

  const hasNum = Math.random() < prompts.number_constraint.inclusion_ratio;
  const numberCondition = hasNum
    ? prompts.number_constraint.with_numbers
    : prompts.number_constraint.without_numbers;

  const userPrompt = prompts.topic.user_prompt_template
    .replace("{complex_sentence}", prompts.common_rules.complex_sentence)
    .replace("{no_newlines}", prompts.common_rules.no_newlines)
    .replace("{allowed_punctuation}", prompts.common_rules.allowed_punctuation)
    .replace("{topic}", topic)
    .replace("{number_condition}", numberCondition);

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_TOPIC_MODEL,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: TOPIC_GENERATE_MAX_OUTPUT_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "topic_sentences",
          strict: true,
          schema: TOPIC_SENTENCE_JSON_SCHEMA,
        },
      },
    }),
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    const statusCode = parseTopicGenerateErrorStatus(errText) ?? openaiRes.status;
    throw new TopicGenerateApiError(
      `OpenAI API error: ${errText}`,
      statusCode,
      isRetryableTopicGenerateStatus(statusCode),
    );
  }

  const openaiData = await openaiRes.json();
  const finishReason = openaiData?.choices?.[0]?.finish_reason;
  const truncated = finishReason === "length";
  if (truncated) {
    console.warn(
      `[generate/route] OpenAI response truncated (max_tokens=${TOPIC_GENERATE_MAX_OUTPUT_TOKENS})`,
    );
  }

  const rawText =
    openaiData?.choices?.[0]?.message?.content?.trim() ?? '{"sentences":[]}';

  const parsed = parseTopicSentencesResponse(rawText);
  if (parsed.rawCount > 0 && parsed.sentences.length === 0) {
    console.warn(
      `[generate/route] All ${parsed.rawCount} OpenAI sentences rejected by validation`,
    );
  }

  if (truncated && parsed.sentences.length === 0) {
    throw new TopicGenerateApiError("OpenAI response truncated", 503, true);
  }

  return { ...parsed, truncated };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateTopicSentences(
  topic: string,
): Promise<TopicGenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in environment variables.");
  }

  let lastError: TopicGenerateApiError | null = null;

  for (let attempt = 0; attempt <= TOPIC_GENERATE_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await callOpenAITopicGenerate(apiKey, topic);
    } catch (error) {
      if (!(error instanceof TopicGenerateApiError)) {
        throw error;
      }
      lastError = error;
      const canRetry = error.retryable && attempt < TOPIC_GENERATE_RETRY_DELAYS_MS.length;
      if (!canRetry) {
        break;
      }
      console.warn(
        `[generate/route] OpenAI ${OPENAI_TOPIC_MODEL} attempt ${attempt + 1} failed (${error.statusCode}), retrying in ${TOPIC_GENERATE_RETRY_DELAYS_MS[attempt]}ms...`,
      );
      await sleep(TOPIC_GENERATE_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError ?? new Error("OpenAI API request failed.");
}
