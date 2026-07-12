// 한글 자음/모음 분류 및 정합성 검사 규칙
// 규칙기반 한글쌍 정합성 검사를 위해 예외 없이 과하게 5분류로 정리한 파일.

// ---------------------------------------------------------
// 1. 분류 (5분류)
// ---------------------------------------------------------

// 1) 자음: 쌍자음
const CONSONANTS_DOUBLE = ["ㄲ", "ㄸ", "ㅃ", "ㅆ", "ㅉ"];
const CONSONANTS_NO_JONGSEONG = ["ㅃ", "ㅉ", "ㄸ"];

// QWEROP 키에 해당하는 자모 (Shift + q, w, e, r, o, p)
const QWEROP_JAMO = ["ㅃ", "ㅉ", "ㄸ", "ㄲ", "ㅒ", "ㅖ"];

// 2) 자음: 겹받침 (논리적 개념, QWERTY 단일 키로는 존재하지 않음)
const CONSONANTS_COMPOUND = [
  "ㄳ",
  "ㄵ",
  "ㄶ",
  "ㄺ",
  "ㄻ",
  "ㄼ",
  "ㄽ",
  "ㄾ",
  "ㄿ",
  "ㅀ",
  "ㅄ",
];

// 3) 자음: 그 외 자음 (단일 자음)
const CONSONANTS_SINGLE = [
  "ㄱ",
  "ㄴ",
  "ㄷ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅅ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

// 4) 모음: 복모음 (논리적 개념, QWERTY 단일 키로는 존재하지 않음)
const VOWELS_COMPOUND = ["ㅘ", "ㅙ", "ㅚ", "ㅝ", "ㅞ", "ㅟ", "ㅢ"];

// 5) 모음: 그 외 모음 (단일 모음 및 단일 키로 입력되는 ㅒ, ㅖ)
const VOWELS_SINGLE = [
  "ㅏ",
  "ㅐ",
  "ㅑ",
  "ㅒ",
  "ㅓ",
  "ㅔ",
  "ㅕ",
  "ㅖ",
  "ㅗ",
  "ㅛ",
  "ㅜ",
  "ㅠ",
  "ㅡ",
  "ㅣ",
];

// ---------------------------------------------------------
// 2. QWERTY -> Jamo 매핑
// ---------------------------------------------------------
const QWERTY_TO_JAMO: Record<string, string> = {
  q: "ㅂ",
  w: "ㅈ",
  e: "ㄷ",
  r: "ㄱ",
  t: "ㅅ",
  y: "ㅛ",
  u: "ㅕ",
  i: "ㅑ",
  o: "ㅐ",
  p: "ㅔ",
  a: "ㅁ",
  s: "ㄴ",
  d: "ㅇ",
  f: "ㄹ",
  g: "ㅎ",
  h: "ㅗ",
  j: "ㅓ",
  k: "ㅏ",
  l: "ㅣ",
  z: "ㅋ",
  x: "ㅌ",
  c: "ㅊ",
  v: "ㅍ",
  b: "ㅠ",
  n: "ㅜ",
  m: "ㅡ",
  Q: "ㅃ",
  W: "ㅉ",
  E: "ㄸ",
  R: "ㄲ",
  T: "ㅆ",
  O: "ㅒ",
  P: "ㅖ",
  ㅃ: "ㅃ",
  ㅉ: "ㅉ",
  ㄸ: "ㄸ",
  ㄲ: "ㄲ",
  ㅆ: "ㅆ",
  ㅒ: "ㅒ",
  ㅖ: "ㅖ",
};

const COMPLEX_VOWEL_PAIRS: Record<string, string[]> = {
  ㅗ: ["ㅏ", "ㅐ", "ㅣ"],
  ㅜ: ["ㅓ", "ㅔ", "ㅣ"],
  ㅡ: ["ㅣ"],
};

const COMPOUND_CONSONANT_PAIRS: Record<string, string[]> = {
  ㄱ: ["ㅅ"],
  ㄴ: ["ㅈ", "ㅎ"],
  ㄹ: ["ㄱ", "ㅁ", "ㅂ", "ㅅ", "ㅌ", "ㅍ", "ㅎ"],
  ㅂ: ["ㅅ"],
};

export const PUNCTUATION_AND_SPACE = [" ", ",", ".", "?", "!", "\n"];

export function toJamo(char: string): string {
  return QWERTY_TO_JAMO[char] || char;
}

/** Jamo → lowercase QWERTY layout key (Dubeolsik, unshifted preferred). */
const JAMO_TO_QWERTY_KEY: Record<string, string> = {};
for (const [qwerty, jamo] of Object.entries(QWERTY_TO_JAMO)) {
  if (/^[a-z]$/.test(qwerty) && !(jamo in JAMO_TO_QWERTY_KEY)) {
    JAMO_TO_QWERTY_KEY[jamo] = qwerty;
  }
}

function jamoToQwertyKey(jamo: string): string | null {
  return JAMO_TO_QWERTY_KEY[jamo] ?? null;
}

/** Map expected character (Latin or Hangul jamo) to a layout key token. */
export function charToLayoutKey(char: string | null | undefined): string | null {
  if (!char || char.length === 0) return null;
  const c = char[0];
  if (/^[a-z]$/.test(c)) return c;
  if (/^[A-Z]$/.test(c)) return c.toLowerCase();
  return jamoToQwertyKey(c);
}

function isConsonant(jamo: string): boolean {
  return CONSONANTS_SINGLE.includes(jamo) || CONSONANTS_DOUBLE.includes(jamo);
}

export function isVowel(jamo: string): boolean {
  return VOWELS_SINGLE.includes(jamo);
}

// ---------------------------------------------------------
// 3. 정합성 검사 로직 (isValidHangulSequence)
// ---------------------------------------------------------
export function isValidHangulSequence(
  prevPrevChar: string,
  prevChar: string,
  nextChar: string,
  prevPrevPrevChar?: string,
): boolean {
  const prevPrev = toJamo(prevPrevChar);
  const prev = toJamo(prevChar);
  const next = toJamo(nextChar);

  // QWEROP 중복 방지 규칙: 이전 2글자 안에 QWEROP 자모 중 하나가 포함되어 있으면 또 나오는 것을 금지
  if (QWEROP_JAMO.includes(next)) {
    if (QWEROP_JAMO.includes(prev) || QWEROP_JAMO.includes(prevPrev)) {
      return false;
    }
  }

  const prevPrevIsV = isVowel(prevPrev);
  const prevPrevIsC = isConsonant(prevPrev);
  const prevPrevIsPunct = PUNCTUATION_AND_SPACE.includes(prevPrevChar);

  const prevIsV = isVowel(prev);
  const prevIsC = isConsonant(prev);
  const prevIsPunct = PUNCTUATION_AND_SPACE.includes(prevChar);

  const nextIsV = isVowel(next);
  const nextIsC = isConsonant(next);
  const nextIsPunct = PUNCTUATION_AND_SPACE.includes(nextChar);

  // 0. 문장부호 관련 특수 규칙 (순서 준수)
  if (nextIsPunct) {
    // A. 문장부호 다음에 문장부호는 불가능
    if (prevIsPunct) {
      return false;
    }

    // D. 문장부호 자음 문장부호: 불가능
    if (prevPrevIsPunct && prevIsC) {
      return false;
    }

    // B. 자음 자음 자음 부호: 불가능
    if (prevPrevIsC && prevIsC) {
      const prevPrevPrev = prevPrevPrevChar ? toJamo(prevPrevPrevChar) : " ";
      const prevPrevPrevIsC = isConsonant(prevPrevPrev);
      if (prevPrevPrevIsC) {
        return false;
      }
    }

    // C. 자음 자음 부호: 자음 2개가 겹받침 순서쌍인 경우만 가능
    if (prevPrevIsC && prevIsC) {
      const isValidPair = !!(
        COMPOUND_CONSONANT_PAIRS[prevPrev] && COMPOUND_CONSONANT_PAIRS[prevPrev].includes(prev)
      );
      if (!isValidPair) {
        return false;
      }
    }

    // E. 모음 + 받침불가자음 + 문장부호: 불가능 (예: ㅔ + ㅃ + 공백 -> '에ㅃ ')
    if (prevPrevIsV && prevIsC && CONSONANTS_NO_JONGSEONG.includes(prev)) {
      return false;
    }

    return true;
  }

  // 1. 문장기호 모음: 불가능
  if (prevIsPunct && nextIsV) {
    return false;
  }

  // 1-2. 문장부호 자음 자음: 불가능
  if (prevPrevIsPunct && prevIsC && nextIsC) {
    return false;
  }

  // 2. 자음 자음 자음(기준): 불가능
  if (prevPrevIsC && prevIsC && nextIsC) {
    return false;
  }

  // 3. 모음 자음 자음(기준): 겹받침의 두번째 키만 가능
  if (prevPrevIsV && prevIsC && nextIsC) {
    const isValidJongseongSecondKey = !!(
      COMPOUND_CONSONANT_PAIRS[prev] && COMPOUND_CONSONANT_PAIRS[prev].includes(next)
    );

    return isValidJongseongSecondKey;
  }

  // 4. 모음 모음 자음(기준): 겹받침의 첫번째 키만 가능
  if (prevPrevIsV && prevIsV && nextIsC) {
    const allowedFirstKeys = ["ㄱ", "ㄴ", "ㄹ", "ㅂ"];
    return allowedFirstKeys.includes(next);
  }

  // 5. 모음 모음(기준): 복모음의 두번째 키만 가능
  if (prevIsV && nextIsV) {
    const validNextVowels = COMPLEX_VOWEL_PAIRS[prev];
    return !!(validNextVowels && validNextVowels.includes(next));
  }

  // 이거 외에는 다 되는거
  return true;
}
