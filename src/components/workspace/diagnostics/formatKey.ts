import { toJamo } from "@/lib/practice/hangulRules";

const KEY_LABEL: Record<string, string> = { space: "␣", ",": ",", ".": "." };

/** 레이아웃 키 토큰 → 패널 헤더 등 QWERTY 표기 */
export function formatKey(key: string) {
  return KEY_LABEL[key] ?? key.toUpperCase();
}

/** 레이아웃 키 토큰 → 진단 카드용 한글 자모 */
export function formatKeyJamo(key: string) {
  if (KEY_LABEL[key]) return KEY_LABEL[key];
  if (key.length === 1) return toJamo(key);
  return key;
}
