import { describe, it, expect } from "vitest";
import {
  TOPIC_LOADING_DELAYED_AFTER_MS,
  TOPIC_ERROR_RESET_AFTER_MS,
  getTopicGuideText,
  isTopicGuideText,
  mapGenerateApiError,
  resolveTopicError,
  resolveTopicFatalOverlay,
  validationReasonToErrorKey,
} from "./topicLoading";

describe("topicLoading", () => {
  it("uses 6.5s delayed loading threshold", () => {
    expect(TOPIC_LOADING_DELAYED_AFTER_MS).toBe(6_500);
  });

  it("uses 2s fatal error reset delay", () => {
    expect(TOPIC_ERROR_RESET_AFTER_MS).toBe(2_000);
  });

  it("resolves guide text and validation errors per language", () => {
    expect(getTopicGuideText("ko")).toBe("원하는 주제를 입력하세요...");
    expect(getTopicGuideText("en")).toBe("Enter a topic to practice...");
    expect(isTopicGuideText(getTopicGuideText("ko"))).toBe(true);
    expect(validationReasonToErrorKey("글자수가 적습니다.")).toBe("topicTooShort");
    expect(resolveTopicError("searchFailed", "en")).toContain("Could not search");
  });

  it("maps generate API status and payload to error keys", () => {
    expect(mapGenerateApiError(429)).toBe("rateLimited");
    expect(mapGenerateApiError(503)).toBe("serverBusy");
    expect(mapGenerateApiError(422, "생성된 문장이 형식 요건에 맞지 않습니다.")).toBe(
      "validationFailed",
    );
  });

  it("maps internal error keys to user-facing fatal overlay copy", () => {
    expect(resolveTopicFatalOverlay("validationFailed", "ko").primary).toBe(
      "연습 문장을 준비하지 못했습니다.",
    );
    expect(resolveTopicFatalOverlay("searchNoResults", "en").primary).toContain(
      "couldn't prepare sentences",
    );
    expect(resolveTopicFatalOverlay("rateLimited", "ko").hint).toContain("주제 입력 화면");
  });
});
