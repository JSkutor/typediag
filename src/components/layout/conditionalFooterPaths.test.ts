import { describe, it, expect } from "vitest";
import { shouldHideFooter } from "@/components/layout/conditionalFooterPaths";

describe("conditionalFooterPaths", () => {
  it("hides footer on landing and practice routes", () => {
    expect(shouldHideFooter("/")).toBe(true);
    expect(shouldHideFooter("/practice")).toBe(true);
    expect(shouldHideFooter("/practice?tab=dashboard")).toBe(true);
  });

  it("shows footer on auth and other routes", () => {
    expect(shouldHideFooter("/sign-in")).toBe(false);
    expect(shouldHideFooter("/sign-up")).toBe(false);
    expect(shouldHideFooter(null)).toBe(false);
  });
});
