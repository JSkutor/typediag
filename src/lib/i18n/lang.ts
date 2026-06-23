export const SUPPORTED_LANGS = ["ko", "en"] as const;

export type LandingLang = (typeof SUPPORTED_LANGS)[number];

export function isValidLang(lang: string): lang is LandingLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(lang);
}

/** Resolve display language from an Accept-Language header value. */
export function resolveLangFromAcceptLanguage(header: string): LandingLang {
  const primary = header.split(",")[0]?.trim().toLowerCase() ?? "";
  return primary.startsWith("ko") ? "ko" : "en";
}
