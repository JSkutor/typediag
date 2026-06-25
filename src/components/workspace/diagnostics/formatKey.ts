const KEY_LABEL: Record<string, string> = { space: "␣", ",": ",", ".": "." };

export function formatKey(key: string) {
  return KEY_LABEL[key] ?? key.toUpperCase();
}
