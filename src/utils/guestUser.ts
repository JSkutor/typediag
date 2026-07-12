/**
 * Utility to manage the anonymous Guest ID on the client side.
 * Stores a persistent UUID-based ID in localStorage.
 */

export const GUEST_ID_STORAGE_KEY = "typediag_guest_id";
const GUEST_TOKEN_STORAGE_KEY = "typediag_guest_token";

export function getStoredGuestId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(GUEST_ID_STORAGE_KEY);
}

export function getStoredGuestToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(GUEST_TOKEN_STORAGE_KEY);
}

export function storeGuestToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(GUEST_TOKEN_STORAGE_KEY, token);
}

export function clearStoredGuestId(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(GUEST_ID_STORAGE_KEY);
  localStorage.removeItem(GUEST_TOKEN_STORAGE_KEY);
}

export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  let guestId = getStoredGuestId();
  if (!guestId) {
    guestId = `guest_${crypto.randomUUID()}`;
    localStorage.setItem(GUEST_ID_STORAGE_KEY, guestId);
  }

  return guestId;
}

/** Headers for guest merge/sync when a guest id already exists (does not create a new id). */
export function getStoredGuestAuthHeaders(): Record<string, string> {
  const guestId = getStoredGuestId();
  if (!guestId) {
    return {};
  }

  const headers: Record<string, string> = {
    "X-Guest-User-Id": guestId,
  };

  const token = getStoredGuestToken();
  if (token) {
    headers["X-Guest-Token"] = token;
  }

  return headers;
}

/** Headers for guest-authenticated API calls. */
export function getGuestAuthHeaders(): Record<string, string> {
  const guestId = getOrCreateGuestId();
  const headers: Record<string, string> = {
    "X-Guest-User-Id": guestId,
  };

  const token = getStoredGuestToken();
  if (token) {
    headers["X-Guest-Token"] = token;
  }

  return headers;
}

/** Persist guestToken returned by the server after bootstrap. */
export function applyGuestTokenFromResponse(data: unknown): void {
  if (
    data &&
    typeof data === "object" &&
    "guestToken" in data &&
    typeof (data as { guestToken?: unknown }).guestToken === "string"
  ) {
    storeGuestToken((data as { guestToken: string }).guestToken);
  }
}
