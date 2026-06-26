/** Normal loading UI until this elapses; then show the delayed message. */
export const TOPIC_LOADING_DELAYED_AFTER_MS = 6_500;

/** After a fatal error (retries exhausted), return to the topic guide screen. */
export const TOPIC_ERROR_RESET_AFTER_MS = 2_000;

export type TopicLang = "ko" | "en";

export type TopicErrorKey =
  | "topicTooShort"
  | "topicTooLong"
  | "topicInvalid"
  | "topicMeaningless"
  | "searchFailed"
  | "searchNoResults"
  | "generateEmpty"
  | "generateFailed"
  | "rateLimited"
  | "serverBusy"
  | "networkError"
  | "responseTruncated"
  | "responseParseFailed"
  | "validationFailed";

const topicMessages = {
  ko: {
    guide: "원하는 주제를 입력하세요...",
    remaining: (count: number) => `남은 문장: ${count}`,
    loading: "주제에 맞는 문장을 찾는 중...",
    generating: "문장을 생성하는 중...",
    delayed: "예상보다 시간이 걸리고 있습니다.",
    delayedHint: "잠시만 기다려 주세요.",
    errors: {
      topicTooShort: "주제가 너무 짧습니다. 2자 이상 입력해 주세요.",
      topicTooLong: "주제가 너무 깁니다. 15자 이하로 입력해 주세요.",
      topicInvalid: "올바른 주제를 입력해 주세요.",
      topicMeaningless: "의미 있는 주제를 입력해 주세요.",
      searchFailed: "문장 검색에 실패했습니다. 다시 시도해 주세요.",
      searchNoResults: "검색 결과가 없습니다. 다시 시도해 주세요.",
      generateEmpty: "생성된 문장이 없습니다. 다른 주제로 다시 시도해 주세요.",
      generateFailed: "문장 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      rateLimited: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
      serverBusy: "서버가 바쁩니다. 잠시 후 다시 시도해 주세요.",
      networkError: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      responseTruncated: "문장 생성 응답이 잘렸습니다. 다시 시도해 주세요.",
      responseParseFailed: "문장 생성 응답을 해석하지 못했습니다. 다시 시도해 주세요.",
      validationFailed: "생성된 문장이 형식에 맞지 않습니다. 다시 시도해 주세요.",
    },
  },
  en: {
    guide: "Enter a topic to practice...",
    remaining: (count: number) => `Sentences left: ${count}`,
    loading: "Finding sentences for your topic...",
    generating: "Generating practice sentences...",
    delayed: "This is taking longer than expected.",
    delayedHint: "Please wait a moment.",
    errors: {
      topicTooShort: "Topic is too short. Enter at least 2 characters.",
      topicTooLong: "Topic is too long. Use 15 characters or fewer.",
      topicInvalid: "Enter a valid topic.",
      topicMeaningless: "Enter a meaningful topic.",
      searchFailed: "Could not search for sentences. Please try again.",
      searchNoResults: "No sentences found. Please try again.",
      generateEmpty: "No sentences were generated. Try a different topic.",
      generateFailed: "Could not generate sentences. Please try again later.",
      rateLimited: "Too many requests. Please try again in a moment.",
      serverBusy: "The server is busy. Please try again in a moment.",
      networkError: "A network error occurred. Please try again later.",
      responseTruncated: "The generation response was cut off. Please try again.",
      responseParseFailed: "Could not read the generation response. Please try again.",
      validationFailed: "Generated sentences did not meet the format. Please try again.",
    },
  },
} as const;

/** @deprecated Use `getTopicGuideText("ko")` */
export const TOPIC_GUIDE_TEXT = topicMessages.ko.guide;

export type TopicLoadingPhase = "idle" | "loading" | "delayed";

export function getTopicLang(language: string): TopicLang {
  return language === "en" ? "en" : "ko";
}

export function getTopicGuideText(lang: TopicLang): string {
  return topicMessages[lang].guide;
}

export function isTopicGuideText(text: string): boolean {
  return text === topicMessages.ko.guide || text === topicMessages.en.guide;
}

export function getTopicRemainingLabel(lang: TopicLang, count: number): string {
  return topicMessages[lang].remaining(count);
}

export function getTopicLoadingCopy(lang: TopicLang) {
  return {
    loading: topicMessages[lang].loading,
    generating: topicMessages[lang].generating,
    delayed: topicMessages[lang].delayed,
    delayedHint: topicMessages[lang].delayedHint,
  };
}

export function resolveTopicError(key: TopicErrorKey, lang: TopicLang): string {
  return topicMessages[lang].errors[key];
}

/** User-facing fatal overlay copy — hides internal/technical error keys. */
export type TopicFatalOverlayKey = "busy" | "notFound" | "unavailable";

export function topicErrorToFatalOverlayKey(key: TopicErrorKey): TopicFatalOverlayKey {
  if (key === "rateLimited" || key === "serverBusy") {
    return "busy";
  }
  if (key === "searchNoResults" || key === "generateEmpty") {
    return "notFound";
  }
  return "unavailable";
}

const fatalOverlayMessages = {
  ko: {
    busy: {
      primary: "지금은 요청이 많습니다.",
      hint: "잠시 후 주제 입력 화면으로 돌아갑니다.",
    },
    notFound: {
      primary: "이 주제로 연습 문장을 준비하지 못했습니다.",
      hint: "다른 주제를 입력해 보세요. 잠시 후 입력 화면으로 돌아갑니다.",
    },
    unavailable: {
      primary: "연습 문장을 준비하지 못했습니다.",
      hint: "잠시 후 다시 시도해 주세요. 곧 주제 입력 화면으로 돌아갑니다.",
    },
  },
  en: {
    busy: {
      primary: "Too many requests right now.",
      hint: "Returning to the topic screen shortly.",
    },
    notFound: {
      primary: "We couldn't prepare sentences for this topic.",
      hint: "Try a different topic. Returning to the input screen shortly.",
    },
    unavailable: {
      primary: "We couldn't prepare practice sentences.",
      hint: "Please try again later. Returning to the topic screen shortly.",
    },
  },
} as const;

export function resolveTopicFatalOverlay(
  key: TopicErrorKey,
  lang: TopicLang,
): { primary: string; hint: string } {
  const overlayKey = topicErrorToFatalOverlayKey(key);
  return fatalOverlayMessages[lang][overlayKey];
}

const VALIDATION_REASON_TO_KEY: Record<string, TopicErrorKey> = {
  "글자수가 적습니다.": "topicTooShort",
  "글자수가 많습니다.": "topicTooLong",
  "올바른 주제 입력이 아닙니다.": "topicInvalid",
};

export function validationReasonToErrorKey(reason: string | undefined): TopicErrorKey {
  if (!reason) {
    return "topicMeaningless";
  }
  return VALIDATION_REASON_TO_KEY[reason] ?? "topicInvalid";
}

export function resolveValidationError(reason: string | undefined, lang: TopicLang): string {
  return resolveTopicError(validationReasonToErrorKey(reason), lang);
}

export function mapGenerateApiError(status: number, error?: string): TopicErrorKey {
  if (status === 429) {
    return "rateLimited";
  }
  if (status === 503) {
    return "serverBusy";
  }
  if (error?.includes("잘렸습니다") || error?.includes("cut off")) {
    return "responseTruncated";
  }
  if (error?.includes("해석하지 못했습니다") || error?.includes("Could not read")) {
    return "responseParseFailed";
  }
  if (error?.includes("형식") || error?.includes("format")) {
    return "validationFailed";
  }
  if (error?.includes("부적절한 주제") || error?.includes("No sentences were generated")) {
    return "generateEmpty";
  }
  if (error?.includes("생성된 문장이 없습니다") || error?.includes("No sentences were generated")) {
    return "generateEmpty";
  }
  return "generateFailed";
}

export function isTopicErrorKey(value: string): value is TopicErrorKey {
  return value in topicMessages.ko.errors;
}
