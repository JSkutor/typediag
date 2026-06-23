import { describe, it, expect, afterEach, vi } from "vitest";
import { isDevOnlyEnabled } from "@/lib/api/isDevOnlyRoute";

describe("isDevOnlyEnabled", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    vi.stubEnv("NODE_ENV", originalNodeEnv);
  });

  it("is true only in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isDevOnlyEnabled()).toBe(true);

    vi.stubEnv("NODE_ENV", "production");
    expect(isDevOnlyEnabled()).toBe(false);

    vi.stubEnv("NODE_ENV", "test");
    expect(isDevOnlyEnabled()).toBe(false);
  });
});
