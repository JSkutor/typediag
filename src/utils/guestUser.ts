/**
 * Utility to manage the anonymous Guest ID on the client side.
 * Stores a persistent UUID-based ID in localStorage.
 */

export const GUEST_ID_STORAGE_KEY = "typediag_guest_id";

export function getStoredGuestId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(GUEST_ID_STORAGE_KEY);
}

export function clearStoredGuestId(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(GUEST_ID_STORAGE_KEY);
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
