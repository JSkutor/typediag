/**
 * Utility to manage the anonymous Guest ID on the client side.
 * Stores a persistent UUID-based ID in localStorage.
 */
export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  let guestId = localStorage.getItem("typediag_guest_id");
  if (!guestId) {
    guestId = `guest_${crypto.randomUUID()}`;
    localStorage.setItem("typediag_guest_id", guestId);
  }

  return guestId;
}
