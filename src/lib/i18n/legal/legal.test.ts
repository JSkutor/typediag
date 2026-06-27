import { describe, expect, it } from "vitest";
import { getPrivacyDocument, getPrivacyMetadata } from "./privacy";
import { getTermsDocument, getTermsMetadata } from "./terms";

describe("legal i18n documents", () => {
  it("returns page-specific metadata for terms", () => {
    const ko = getTermsMetadata("ko");
    expect(ko.title).toContain("이용약관");
    expect(ko.description).toContain("TypeDiag");

    const en = getTermsMetadata("en");
    expect(en.title).toContain("Terms of Service");
  });

  it("returns page-specific metadata for privacy", () => {
    const ko = getPrivacyMetadata("ko");
    expect(ko.title).toContain("개인정보");
    expect(ko.description).toContain("TypeDiag");

    const en = getPrivacyMetadata("en");
    expect(en.title).toContain("Privacy Policy");
  });

  it("keeps unique section ids within each document", () => {
    for (const lang of ["ko", "en"] as const) {
      const termsIds = getTermsDocument(lang).sections.map((section) => section.id);
      const privacyIds = getPrivacyDocument(lang).sections.map((section) => section.id);

      expect(new Set(termsIds).size).toBe(termsIds.length);
      expect(new Set(privacyIds).size).toBe(privacyIds.length);
    }
  });

  it("aligns section count with dashboard cards", () => {
    expect(getTermsDocument("ko").dashboardCards).toHaveLength(4);
    expect(getPrivacyDocument("ko").dashboardCards).toHaveLength(4);
    expect(getTermsDocument("en").sections).toHaveLength(16);
    expect(getPrivacyDocument("en").sections).toHaveLength(11);
  });
});
