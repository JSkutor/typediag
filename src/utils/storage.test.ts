import { describe, it, expect, beforeEach, vi } from "vitest";
import { safeParseStorage, safeSetStorage } from "./storage";

describe("storage utilities", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  describe("safeParseStorage", () => {
    it("should return default value when window is undefined (SSR scenario)", () => {
      // Mock window as undefined temporarily
      const originalWindow = globalThis.window;
      // @ts-expect-error - mock deletion of window on global scope
      delete globalThis.window;

      try {
        const result = safeParseStorage("test_key", "default_val");
        expect(result).toBe("default_val");
      } finally {
        globalThis.window = originalWindow;
      }
    });

    it("should return default value if the key does not exist", () => {
      const result = safeParseStorage("non_existent_key", { a: 1 });
      expect(result).toEqual({ a: 1 });
    });

    it("should parse and return the value when it exists and is valid JSON", () => {
      localStorage.setItem("valid_key", JSON.stringify({ name: "typediag" }));
      const result = safeParseStorage("valid_key", { name: "default" });
      expect(result).toEqual({ name: "typediag" });
    });

    it("should handle invalid JSON by returning default value and removing the corrupt key", () => {
      localStorage.setItem("corrupt_key", "not-a-valid-json-string{");

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = safeParseStorage("corrupt_key", "fallback");

      expect(result).toBe("fallback");
      expect(localStorage.getItem("corrupt_key")).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("safeSetStorage", () => {
    it("should not crash when window is undefined (SSR scenario)", () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error - mock deletion of window on global scope
      delete globalThis.window;

      try {
        expect(() => safeSetStorage("test_key", "val")).not.toThrow();
      } finally {
        globalThis.window = originalWindow;
      }
    });

    it("should successfully set serialized JSON string in localStorage", () => {
      safeSetStorage("test_write_key", { count: 42 });
      const raw = localStorage.getItem("test_write_key");
      expect(raw).toBe('{"count":42}');
    });

    it("should handle exceptions thrown by localStorage.setItem gracefully", () => {
      const setItemSpy = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError mock");
      });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => safeSetStorage("quota_key", "large_data")).not.toThrow();
      expect(setItemSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
