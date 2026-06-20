// 한글 자음/모음 분류 및 정합성 검사 규칙
// 규칙기반 한글쌍 정합성 검사를 위해 예외 없이 과하게 5분류로 정리한 파일.

// ---------------------------------------------------------
// 1. 분류 (5분류)
// ---------------------------------------------------------

// 1) 자음: 쌍자음
export const CONSONANTS_DOUBLE = ['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ'];

// 2) 자음: 겹받침 (논리적 개념, QWERTY 단일 키로는 존재하지 않음)
export const CONSONANTS_COMPOUND = ['ㄳ', 'ㄵ', 'ㄶ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅄ'];

// 3) 자음: 그 외 자음 (단일 자음)
export const CONSONANTS_SINGLE = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

// 4) 모음: 복모음 (논리적 개념, QWERTY 단일 키로는 존재하지 않음)
export const VOWELS_COMPOUND = ['ㅘ', 'ㅙ', 'ㅚ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅢ'];

// 5) 모음: 그 외 모음 (단일 모음 및 단일 키로 입력되는 ㅒ, ㅖ)
export const VOWELS_SINGLE = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ'];

// ---------------------------------------------------------
// 2. QWERTY -> Jamo 매핑
// ---------------------------------------------------------
export const QWERTY_TO_JAMO: Record<string, string> = {
  q: "ㅂ", w: "ㅈ", e: "ㄷ", r: "ㄱ", t: "ㅅ",
  y: "ㅛ", u: "ㅕ", i: "ㅑ", o: "ㅐ", p: "ㅔ",
  a: "ㅁ", s: "ㄴ", d: "ㅇ", f: "ㄹ", g: "ㅎ",
  h: "ㅗ", j: "ㅓ", k: "ㅏ", l: "ㅣ",
  z: "ㅋ", x: "ㅌ", c: "ㅊ", v: "ㅍ", b: "ㅠ",
  n: "ㅜ", m: "ㅡ",
  Q: "ㅃ", W: "ㅉ", E: "ㄸ", R: "ㄲ", T: "ㅆ",
  O: "ㅒ", P: "ㅖ",
  ㅃ: "ㅃ", ㅉ: "ㅉ", ㄸ: "ㄸ", ㄲ: "ㄲ", ㅆ: "ㅆ", ㅒ: "ㅒ", ㅖ: "ㅖ"
};

export const COMPLEX_VOWEL_PAIRS: Record<string, string[]> = {
  'ㅗ': ['ㅏ', 'ㅐ', 'ㅣ'],
  'ㅜ': ['ㅓ', 'ㅔ', 'ㅣ'],
  'ㅡ': ['ㅣ'],
};

export const COMPOUND_CONSONANT_PAIRS: Record<string, string[]> = {
  'ㄱ': ['ㅅ'],
  'ㄴ': ['ㅈ', 'ㅎ'],
  'ㄹ': ['ㄱ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅌ', 'ㅍ', 'ㅎ'],
  'ㅂ': ['ㅅ'],
};

export const PUNCTUATION_AND_SPACE = [" ", ",", ".", "?", "!", "\n"];

export function toJamo(char: string): string {
  return QWERTY_TO_JAMO[char] || char;
}

export function isConsonant(jamo: string): boolean {
  return CONSONANTS_SINGLE.includes(jamo) || CONSONANTS_DOUBLE.includes(jamo);
}

export function isVowel(jamo: string): boolean {
  return VOWELS_SINGLE.includes(jamo);
}

// ---------------------------------------------------------
// 3. 정합성 검사 로직 (isValidHangulSequence)
// ---------------------------------------------------------
export function isValidHangulSequence(prevPrevChar: string, prevChar: string, nextChar: string): boolean {
  // 스페이스나 문장부호 후보는 언제나 입력 가능
  if (PUNCTUATION_AND_SPACE.includes(nextChar)) {
    return true;
  }

  const prevPrev = toJamo(prevPrevChar);
  const prev = toJamo(prevChar);
  const next = toJamo(nextChar);

  const prevPrevIsV = isVowel(prevPrev);
  const prevPrevIsC = isConsonant(prevPrev);

  const prevIsV = isVowel(prev);
  const prevIsC = isConsonant(prev);
  const prevIsPunct = PUNCTUATION_AND_SPACE.includes(prevChar);

  const nextIsV = isVowel(next);
  const nextIsC = isConsonant(next);

  // 1. 문장기호 모음: 불가능
  if (prevIsPunct && nextIsV) {
    return false;
  }

  // 2. 자음 자음 자음(기준): 불가능
  if (prevPrevIsC && prevIsC && nextIsC) {
    return false;
  }

  // 3. 모음 자음 자음(기준): 겹받침, 일부 쌍자음의 두번째 키만 가능
  if (prevPrevIsV && prevIsC && nextIsC) {
    const isValidJongseongSecondKey = 
      (COMPOUND_CONSONANT_PAIRS[prev] && COMPOUND_CONSONANT_PAIRS[prev].includes(next)) || 
      (prev === next && ['ㄱ', 'ㅅ'].includes(prev)); // ㄲ, ㅆ
    
    return isValidJongseongSecondKey;
  }

  // 4. 모음 모음 자음(기준): 겹받침, 일부 쌍자음의 첫번째 키만 가능
  if (prevPrevIsV && prevIsV && nextIsC) {
    const allowedFirstKeys = ['ㄱ', 'ㄴ', 'ㄹ', 'ㅂ', 'ㅅ'];
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
