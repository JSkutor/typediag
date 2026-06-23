export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Validates the input topic for Topic Mode practice.
 *
 * Rules:
 * 1. Only Korean characters (syllables, consonants, vowels) and whitespace are allowed.
 * 2. The trimmed length must be between 2 and 15 characters (inclusive).
 * 3. Cannot contain single consonants or vowels anywhere (e.g., "ㄴㄴ나무", "가나다ㄹㄹ", "ㅋㅋㅋ").
 * 4. Cannot contain a single character repeated 4 or more times consecutively (e.g., "가가가가").
 * 5. Cannot contain a 2-4 character pattern repeated 3 or more times (e.g., "안녕안녕안녕").
 */
export function validateTopic(topic: string): ValidationResult {
  const trimmed = topic.trim();

  // 1. Length check: between 2 and 15 characters (includes empty strings as shorter than 2)
  if (trimmed.length < 2) {
    return { isValid: false, reason: "글자수가 적습니다." };
  }
  if (trimmed.length > 15) {
    return { isValid: false, reason: "글자수가 많습니다." };
  }

  // 2. Allow Korean, English, numbers, spaces, and common punctuation characters
  const topicRegex = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s.,\-_+/()]+$/;
  if (!topicRegex.test(trimmed)) {
    return { isValid: false, reason: "올바른 주제 입력이 아닙니다." };
  }

  // 3. Cannot contain single consonants/vowels anywhere in the word (e.g. "ㄴㄴ나무", "ㅋㅋㅋ", "가나다ㄹ")
  const containsJamoRegex = /[ㄱ-ㅎㅏ-ㅣ]/;
  if (containsJamoRegex.test(trimmed)) {
    return { isValid: false, reason: "올바른 주제 입력이 아닙니다." };
  }

  // 4. Check for 4 or more consecutive identical characters (e.g., "가가가가")
  const consecutiveIdenticalRegex = /(.)\1{3,}/;
  if (consecutiveIdenticalRegex.test(trimmed)) {
    return { isValid: false, reason: "올바른 주제 입력이 아닙니다." };
  }

  // 5. Check for 2-4 character pattern repeated 3 or more times (e.g., "안녕안녕안녕")
  const repeatedPatternRegex = /(.{2,4})\1{2,}/;
  if (repeatedPatternRegex.test(trimmed)) {
    return { isValid: false, reason: "올바른 주제 입력이 아닙니다." };
  }

  return { isValid: true };
}
