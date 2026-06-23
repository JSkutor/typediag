import { filterTopicGeneratedSentences } from "@/lib/practice/targetSentence";
import prompts from "@/lib/practice/prompts.json";

const TOPIC_SENTENCE_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    sentences: {
      type: "ARRAY",
      items: { type: "STRING" },
      minItems: 20,
      maxItems: 20,
    },
  },
  required: ["sentences"],
} as const;

export const GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite"] as const;
export const GEMINI_RETRY_DELAYS_MS = [1000, 2000] as const;

export function geminiUserError(statusCode: number): string {
  if (statusCode === 429) {
    return "문장 생성 API 할당량이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (statusCode === 503) {
    return "문장 생성 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해 주세요.";
  }
  return "문장 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

export class GeminiApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "GeminiApiError";
  }
}

export function parseGeminiErrorStatus(errText: string): number | null {
  try {
    const parsed = JSON.parse(errText) as { error?: { code?: number } };
    return typeof parsed.error?.code === "number" ? parsed.error.code : null;
  } catch {
    return null;
  }
}

export function isRetryableGeminiStatus(status: number | null): boolean {
  return status === 429 || status === 503;
}

export function parseGeminiSentencesResponse(rawText: string): {
  sentences: string[];
  rawCount: number;
} {
  try {
    const parsed = JSON.parse(rawText) as { sentences?: unknown };
    if (Array.isArray(parsed.sentences)) {
      const filtered = filterTopicGeneratedSentences(parsed.sentences);
      return { sentences: filtered, rawCount: parsed.sentences.length };
    }
  } catch {
    return { sentences: [], rawCount: 0 };
  }
  return { sentences: [], rawCount: 0 };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiGenerateContent(
  apiKey: string,
  topic: string,
  model: (typeof GEMINI_MODELS)[number],
): Promise<{ sentences: string[]; rawCount: number }> {
  const systemInstruction = prompts.topic.system_instruction;

  const hasNum = Math.random() < prompts.number_constraint.inclusion_ratio;
  const numberCondition = hasNum
    ? prompts.number_constraint.with_numbers
    : prompts.number_constraint.without_numbers;

  const userPrompt = prompts.topic.user_prompt_template
    .replace("{topic}", topic)
    .replace("{number_condition}", numberCondition)
    .replace("{complex_sentence}", prompts.common_rules.complex_sentence)
    .replace("{no_newlines}", prompts.common_rules.no_newlines)
    .replace("{allowed_punctuation}", prompts.common_rules.allowed_punctuation);

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
          responseMimeType: "application/json",
          responseSchema: TOPIC_SENTENCE_RESPONSE_SCHEMA,
        },
      }),
    },
  );

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    const statusCode = parseGeminiErrorStatus(errText) ?? geminiRes.status;
    throw new GeminiApiError(
      `Gemini API error: ${errText}`,
      statusCode,
      isRetryableGeminiStatus(statusCode),
    );
  }

  const geminiData = await geminiRes.json();
  const finishReason = geminiData?.candidates?.[0]?.finishReason;
  if (finishReason === "MAX_TOKENS") {
    console.warn("[generate/route] Gemini response truncated (MAX_TOKENS)");
  }

  const rawText =
    geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '{"sentences":[]}';

  const parsed = parseGeminiSentencesResponse(rawText);
  if (parsed.rawCount > 0 && parsed.sentences.length === 0) {
    console.warn(
      `[generate/route] All ${parsed.rawCount} Gemini sentences rejected by validation`,
    );
  }
  return parsed;
}

export async function generateSentencesWithGemini(
  topic: string,
): Promise<{ sentences: string[]; rawCount: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables.");
  }

  let lastError: GeminiApiError | null = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt <= GEMINI_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        return await callGeminiGenerateContent(apiKey, topic, model);
      } catch (error) {
        if (!(error instanceof GeminiApiError)) {
          throw error;
        }
        lastError = error;
        const canRetry = error.retryable && attempt < GEMINI_RETRY_DELAYS_MS.length;
        if (!canRetry) {
          break;
        }
        console.warn(
          `[generate/route] Gemini ${model} attempt ${attempt + 1} failed (${error.statusCode}), retrying...`,
        );
        await sleep(GEMINI_RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  throw lastError ?? new Error("Gemini API request failed.");
}
