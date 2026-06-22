import constraints from "./targetSentenceConstraints.json";

const ALLOWED_PUNCTUATION = /^[가-힣0-9\s.,!?]+$/;
const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\\]/;

export const SUBJECT_GENERATE_HANGUL_RANGE = constraints.subjectGenerate;
export const BATCH_HANGUL_RANGE = constraints.batch;

/** 공백·문장부호를 제외한 순수 한글 글자 수 (manage_targets.get_pure_hangul_count) */
export function getPureHangulCount(text: string): number {
  const matches = text.match(/[가-힣]/g);
  return matches?.length ?? 0;
}

/** 문장 정제 (manage_targets.clean_sentence) */
export function cleanSentence(text: string): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

export type TargetSentenceRejectReason =
  | "empty"
  | "control_char"
  | "multiline"
  | "invalid_char"
  | "hangul_count";

export interface TargetSentenceValidation {
  isValid: boolean;
  reason?: TargetSentenceRejectReason;
  pureHangulCount: number;
  cleaned: string;
}

export function validateTargetSentence(
  raw: string,
  minPureHangul: number,
  maxPureHangul: number,
): TargetSentenceValidation {
  const cleaned = cleanSentence(raw);
  const pureHangulCount = getPureHangulCount(cleaned);

  if (!cleaned) {
    return { isValid: false, reason: "empty", pureHangulCount, cleaned };
  }
  if (CONTROL_CHAR_PATTERN.test(cleaned)) {
    return { isValid: false, reason: "control_char", pureHangulCount, cleaned };
  }
  if (/[\r\n]/.test(cleaned)) {
    return { isValid: false, reason: "multiline", pureHangulCount, cleaned };
  }
  if (!ALLOWED_PUNCTUATION.test(cleaned)) {
    return { isValid: false, reason: "invalid_char", pureHangulCount, cleaned };
  }
  if (pureHangulCount < minPureHangul || pureHangulCount > maxPureHangul) {
    return { isValid: false, reason: "hangul_count", pureHangulCount, cleaned };
  }

  return { isValid: true, pureHangulCount, cleaned };
}

export function filterSubjectGeneratedSentences(rawSentences: unknown[]): string[] {
  const { minPureHangul, maxPureHangul } = SUBJECT_GENERATE_HANGUL_RANGE;

  return rawSentences
    .filter((s): s is string => typeof s === "string")
    .map((s) => validateTargetSentence(s, minPureHangul, maxPureHangul))
    .filter((result) => result.isValid)
    .map((result) => result.cleaned);
}
