import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  GUEST_ID_STORAGE_KEY,
  applyGuestTokenFromResponse,
  clearStoredGuestId,
  getGuestAuthHeaders,
  getOrCreateGuestId,
  getStoredGuestAuthHeaders,
  getStoredGuestId,
  getStoredGuestToken,
  storeGuestToken,
} from "./guestUser";

describe("guestUser", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("guest id storage", () => {
    it("creates and persists guest_<uuid> on first access", () => {
      const guestId = getOrCreateGuestId();

      expect(guestId).toMatch(/^guest_[0-9a-f-]{36}$/i);
      expect(localStorage.getItem(GUEST_ID_STORAGE_KEY)).toBe(guestId);
    });

    it("returns existing guest id without creating a new one", () => {
      localStorage.setItem(GUEST_ID_STORAGE_KEY, "guest_00000000-0000-0000-0000-000000000001");

      expect(getOrCreateGuestId()).toBe("guest_00000000-0000-0000-0000-000000000001");
      expect(getStoredGuestId()).toBe("guest_00000000-0000-0000-0000-000000000001");
    });

    it("clears guest id and token together", () => {
      localStorage.setItem(GUEST_ID_STORAGE_KEY, "guest_00000000-0000-0000-0000-000000000002");
      storeGuestToken("token-value");

      clearStoredGuestId();

      expect(getStoredGuestId()).toBeNull();
      expect(getStoredGuestToken()).toBeNull();
    });
  });

  describe("guest auth headers", () => {
    it("getGuestAuthHeaders creates id and includes token when stored", () => {
      storeGuestToken("stored-token");

      const headers = getGuestAuthHeaders();

      expect(headers["X-Guest-User-Id"]).toMatch(/^guest_/);
      expect(headers["X-Guest-Token"]).toBe("stored-token");
    });

    it("getStoredGuestAuthHeaders returns empty object when no guest id exists", () => {
      expect(getStoredGuestAuthHeaders()).toEqual({});
    });

    it("getStoredGuestAuthHeaders does not create a new guest id", () => {
      localStorage.setItem(GUEST_ID_STORAGE_KEY, "guest_00000000-0000-0000-0000-000000000003");
      storeGuestToken("merge-token");

      expect(getStoredGuestAuthHeaders()).toEqual({
        "X-Guest-User-Id": "guest_00000000-0000-0000-0000-000000000003",
        "X-Guest-Token": "merge-token",
      });
      expect(localStorage.getItem(GUEST_ID_STORAGE_KEY)).toBe(
        "guest_00000000-0000-0000-0000-000000000003",
      );
    });
  });

  describe("applyGuestTokenFromResponse", () => {
    it("persists guestToken from API response", () => {
      applyGuestTokenFromResponse({ success: true, guestToken: "bootstrap-token" });

      expect(getStoredGuestToken()).toBe("bootstrap-token");
    });

    it("ignores responses without a string guestToken", () => {
      applyGuestTokenFromResponse({ success: true });
      applyGuestTokenFromResponse(null);
      applyGuestTokenFromResponse({ guestToken: 123 });

      expect(getStoredGuestToken()).toBeNull();
    });
  });

  describe("SSR safety", () => {
    it("returns safe defaults when window is undefined", () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error - simulate SSR
      delete globalThis.window;

      try {
        expect(getStoredGuestId()).toBeNull();
        expect(getStoredGuestToken()).toBeNull();
        expect(getOrCreateGuestId()).toBe("");
        expect(() => storeGuestToken("token")).not.toThrow();
        expect(() => clearStoredGuestId()).not.toThrow();
      } finally {
        globalThis.window = originalWindow;
      }
    });
  });
});
