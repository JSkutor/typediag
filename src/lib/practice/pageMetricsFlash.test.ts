import { describe, it, expect } from "vitest";
import { formatPageMetricsFlashCpm } from "./pageMetricsFlash";

describe("pageMetricsFlash", () => {
  it("formats CPM label", () => {
    expect(formatPageMetricsFlashCpm(420)).toBe("420 CPM");
    expect(formatPageMetricsFlashCpm(312)).toBe("312 CPM");
  });
});
