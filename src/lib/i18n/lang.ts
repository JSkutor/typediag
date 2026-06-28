export const SUPPORTED_LANGS = ["ko", "en"] as const;

export type LandingLang = (typeof SUPPORTED_LANGS)[number];

/** When false, /en routes redirect to /ko and the practice language pill is hidden. Logic remains in codebase. */
export const EN_PUBLIC_ENABLED = false;

export function isValidLang(lang: string): lang is LandingLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(lang);
}

export function isPublicLangRoute(lang: string): lang is LandingLang {
  return isValidLang(lang) && (lang !== "en" || EN_PUBLIC_ENABLED);
}

export function getPublicLangs(): LandingLang[] {
  return EN_PUBLIC_ENABLED ? [...SUPPORTED_LANGS] : ["ko"];
}

export function getDefaultPublicLang(): LandingLang {
  return "ko";
}

/** Resolve display language from an Accept-Language header value. */
export function resolveLangFromAcceptLanguage(header: string): LandingLang {
  const primary = header.split(",")[0]?.trim().toLowerCase() ?? "";
  return primary.startsWith("ko") ? "ko" : "en";
}
