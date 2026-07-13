import { describe, it, expect } from "vitest";
import { resolveJsonDefault } from "./resolveJsonDefault";

describe("resolveJsonDefault", () => {
  it("should return the default property if it exists in an object", () => {
    const mockJson = { default: { key: "value" } };
    const result = resolveJsonDefault(mockJson);
    expect(result).toEqual({ key: "value" });
  });

  it("should return the object itself if there is no default property", () => {
    const mockJson = { key: "value" };
    const result = resolveJsonDefault(mockJson);
    expect(result).toEqual({ key: "value" });
  });

  it("should return primitive values as is", () => {
    expect(resolveJsonDefault(null)).toBeNull();
    expect(resolveJsonDefault(undefined)).toBeUndefined();
    expect(resolveJsonDefault("string")).toBe("string");
    expect(resolveJsonDefault(123)).toBe(123);
  });
});
