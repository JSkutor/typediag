import { assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import type { AlignResult } from "@/utils/mvsa";
import { runMvsa } from "@/utils/mvsa";

export type FeedbackLanguage = "ko" | "en";

export interface FreeformTypingState {
  qwertyBuffer: string;
  typedText: string;
  language: FeedbackLanguage;
}

export function createInitialFreeformState(language: FeedbackLanguage): FreeformTypingState {
  return {
    qwertyBuffer: "",
    typedText: "",
    language,
  };
}

function isKoreanInput(language: FeedbackLanguage, buffer: string): boolean {
  return language === "ko" || (language === "en" && /[가-힣]/.test(buffer));
}

function withTypedText(
  state: FreeformTypingState,
  nextBuffer: string,
): { qwertyBuffer: string; typedText: string } {
  const isKorean = isKoreanInput(state.language, nextBuffer);
  const nextTyped = isKorean ? assembleHangulWithPunctuation(nextBuffer) : nextBuffer;

  return {
    qwertyBuffer: nextBuffer,
    typedText: nextTyped,
  };
}

export function applyFreeformChar(
  state: FreeformTypingState,
  char: string,
): { qwertyBuffer: string; typedText: string } {
  return withTypedText(state, state.qwertyBuffer + char);
}

export function applyFreeformBackspace(
  state: FreeformTypingState,
): { qwertyBuffer: string; typedText: string } | null {
  if (state.qwertyBuffer.length === 0) {
    return null;
  }

  return withTypedText(state, state.qwertyBuffer.slice(0, -1));
}

/** 빈 피드백 입력 시 practice와 동일한 커서 앵커 */
export function buildFeedbackEmptyAlignments(): AlignResult[] {
  return [
    {
      op: "PENDING",
      char: "",
      targetChar: "\u00a0",
      targetIndex: 0,
    },
  ];
}

/** PracticeChar 렌더링과 동일한 EQUAL 정렬 (target 없이 자유 입력) */
export function buildFeedbackAlignments(typedText: string): AlignResult[] {
  if (typedText.length === 0) {
    return buildFeedbackEmptyAlignments();
  }

  return [...typedText].map((char, index) => ({
    op: "EQUAL",
    char,
    targetChar: char,
    inputIndex: index,
    targetIndex: index,
  }));
}

export function getFeedbackSuccessText(language: FeedbackLanguage): string {
  return language === "en" ? "Feedback sent." : "피드백이 전송되었습니다.";
}

/** Topic mode notice와 동일하게 targetText + runMvsa로 표시 */
export function buildFeedbackNoticeState(text: string, language: FeedbackLanguage) {
  const isKorean = language === "ko";
  return {
    targetText: text,
    typedText: "",
    qwertyBuffer: "",
    maxTypedTextLength: 0,
    mvsaCache: new Map(),
    alignments: runMvsa(text, "", isKorean),
  };
}
