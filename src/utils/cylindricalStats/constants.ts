/** Cylindrical Diagnostics SSOT — focusKey / reference·outgoing transition 용어: docs/DIAGNOSTICS.md */

/** 3-Gram 맥락 오타: 최소 진입 횟수 */
export const FATAL_NGRAM_MIN_SAMPLES = 10;
/** 3-Gram 맥락 오타: 오타율 하한(%) */
export const FATAL_NGRAM_ERROR_RATE_THRESHOLD = 20;

export const LATENCY_CONSISTENCY_MIN_SAMPLES = 5;
/** 무의식적 incorrect TopN: 키별 최소 타건 수(초과) */
export const UNCONSCIOUS_KEY_MIN_SAMPLES = 5;
export const LATENCY_HISTOGRAM_BINS = 12;

export const CLOUD_TYPING_ND_MAX = 0.25;
/** ND 분모 하한(ms). 빠른 타건에서 비율 폭주를 막는 휴리스틱. */
export const CLOUD_TYPING_MIN_DENOM = 300;
export const CLOUD_TYPING_MIN_SAMPLES = 10;
export const CLOUD_TYPING_LEVEL_WEAK = 0.7;
export const CLOUD_TYPING_LEVEL_MODERATE = 0.8;
export const CLOUD_TYPING_LEVEL_STRONG = 0.9;
export const CLOUD_TYPING_CORRELATION_R_THRESHOLD = 0.3;
export const CLOUD_TYPING_CORRELATION_P_THRESHOLD = 0.05;
export const CLOUD_TYPING_CORRELATION_MIN_SAMPLES = 5;

/** 버스트 연타: 2번째 키부터 허용 최대 latency(ms) */
export const BURST_LATENCY_MAX_MS = 30;
/** 버스트 패턴 최소 달성 횟수 */
export const BURST_MIN_SAMPLES = 10;
/** focusKey 포함 버스트 패턴 상위 노출 개수 */
export const BURST_TOP_N = 3;

export const CLOUD_TYPING_EXCLUDE_TO_KEYS = new Set(["shift_l", "shift_r", "backspace", "enter"]);
export const ACCUMULATOR_EXCLUDE_KEYS = new Set(["shift_l", "shift_r", "backspace", "enter"]);
export const ALPHA_KEY_REGEX = /^[a-zA-Z]$/;
