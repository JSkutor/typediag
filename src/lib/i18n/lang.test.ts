import { describe, it, expect } from "vitest";
import { SUPPORTED_LANGS, isValidLang, resolveLangFromAcceptLanguage } from "@/lib/i18n/lang";
import { getLandingCopy } from "@/lib/i18n/landing";

describe("i18n/lang", () => {
  it("supports ko and en only", () => {
    expect(SUPPORTED_LANGS).toEqual(["ko", "en"]);
    expect(isValidLang("ko")).toBe(true);
    expect(isValidLang("en")).toBe(true);
    expect(isValidLang("fr")).toBe(false);
    expect(isValidLang("")).toBe(false);
  });

  it("resolves Accept-Language with ko preference", () => {
    expect(resolveLangFromAcceptLanguage("ko-KR,ko;q=0.9,en;q=0.8")).toBe("ko");
    expect(resolveLangFromAcceptLanguage("ko")).toBe("ko");
  });

  it("falls back to en for non-korean languages", () => {
    expect(resolveLangFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(resolveLangFromAcceptLanguage("ja-JP,ja;q=0.9")).toBe("en");
    expect(resolveLangFromAcceptLanguage("")).toBe("en");
  });
});

describe("i18n/landing", () => {
  it("returns copy for each supported language", () => {
    for (const lang of SUPPORTED_LANGS) {
      const copy = getLandingCopy(lang);
      expect(copy.meta.title.length).toBeGreaterThan(0);
      expect(copy.hero.cta).toMatch(/Diagnostics|진단/);
      expect(copy.problem.pains).toHaveLength(3);
      expect(copy.features.items).toHaveLength(4);
    }
  });

  it("uses distinct hero headlines per language", () => {
    expect(getLandingCopy("ko").hero.headlinePrimary).not.toBe(
      getLandingCopy("en").hero.headlinePrimary,
    );
  });
});
