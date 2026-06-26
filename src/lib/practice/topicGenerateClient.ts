import { getGuestAuthHeaders, applyGuestTokenFromResponse } from "@/utils/guestUser";
import { mapGenerateApiError, type TopicErrorKey } from "@/lib/practice/topicLoading";

export interface TopicTarget {
  id: string;
  content: string;
  language: string;
}

/** Client-side backoff when our API still returns 429/503 or the network flakes. */
export const TOPIC_GENERATE_CLIENT_RETRY_DELAYS_MS = [2000, 4000, 6000] as const;

export class TopicGenerateClientError extends Error {
  constructor(
    readonly errorKey: TopicErrorKey,
    readonly retryable: boolean,
  ) {
    super(errorKey);
    this.name = "TopicGenerateClientError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503;
}

export async function fetchTopicGenerateWithRetry(topic: string): Promise<TopicTarget[]> {
  const maxAttempts = TOPIC_GENERATE_CLIENT_RETRY_DELAYS_MS.length + 1;
  let lastError: TopicGenerateClientError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const res = await fetch("/api/practice/topic/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getGuestAuthHeaders(),
        },
        body: JSON.stringify({ topic }),
      });

      const payload = await res.json().catch(() => ({}));
      applyGuestTokenFromResponse(payload);

      if (res.ok) {
        const data = payload.data;
        if (Array.isArray(data) && data.length > 0) {
          return data as TopicTarget[];
        }
        lastError = new TopicGenerateClientError("generateEmpty", false);
        break;
      }

      const apiError = typeof payload.error === "string" ? payload.error : undefined;
      const errorKey = mapGenerateApiError(res.status, apiError);
      const retryable = isRetryableStatus(res.status);
      lastError = new TopicGenerateClientError(errorKey, retryable);

      if (!retryable || attempt >= TOPIC_GENERATE_CLIENT_RETRY_DELAYS_MS.length) {
        break;
      }
    } catch (error) {
      if (error instanceof TopicGenerateClientError) {
        lastError = error;
        if (!error.retryable || attempt >= TOPIC_GENERATE_CLIENT_RETRY_DELAYS_MS.length) {
          break;
        }
      } else {
        lastError = new TopicGenerateClientError("networkError", true);
        if (attempt >= TOPIC_GENERATE_CLIENT_RETRY_DELAYS_MS.length) {
          break;
        }
      }
    }

    await sleep(TOPIC_GENERATE_CLIENT_RETRY_DELAYS_MS[attempt]);
  }

  throw lastError ?? new TopicGenerateClientError("generateFailed", false);
}
