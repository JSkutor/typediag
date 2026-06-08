/**
 * Local practice content for the MVP. Phase 2 ships with curated Korean
 * sentences; later phases can swap this for a DB or on-demand LLM generation.
 */
export const KO_TEXTS: string[] = [
  "오늘도 차분한 마음으로 한 글자씩 정확하게 눌러 봅니다.",
  "빠른 갈색 여우가 게으른 강아지를 가볍게 뛰어넘었다.",
  "손가락이 키 위에서 자연스럽게 흐르도록 천천히 연습한다.",
  "좋은 습관은 작은 반복에서 시작되어 단단한 실력이 된다.",
  "공간 타건 동역학은 당신의 손끝이 머무는 자리를 읽어낸다.",
  "정확함이 먼저이고 속도는 그 뒤를 조용히 따라온다.",
];

/** Pick a pseudo-random text different from `current` when possible. */
export function pickText(current?: string): string {
  if (KO_TEXTS.length === 1) return KO_TEXTS[0];
  let next = current;
  while (next === current || next === undefined) {
    next = KO_TEXTS[Math.floor(Math.random() * KO_TEXTS.length)];
  }
  return next;
}
