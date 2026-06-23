/**
 * instrumentation-client.ts
 *
 * This file is executed at the very beginning of the client-side bundle,
 * before React hydration and before the Next.js dev overlay registers its
 * own unhandledRejection listener.
 *
 * Purpose: Suppress the benign ClerkJS "Network error at .../touch" that
 * occurs when the browser aborts an in-flight session-touch request during
 * Next.js client-side navigation. Without this, the rejection bubbles up to
 * Next.js's dev overlay and gets proxied to the terminal as an
 * `[browser] ⨯ unhandledRejection`.
 */
export function register() {
  if (typeof window === "undefined") return;

  const handler = (event: PromiseRejectionEvent) => {
    const msg: string = event.reason?.message ?? "";
    const isClerkTouchAbort =
      msg.includes("ClerkJS: Network error") &&
      msg.includes("/touch") &&
      msg.includes("Failed to fetch");

    if (isClerkTouchAbort) {
      // Suppress console noise and prevent Next.js dev overlay from capturing
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  // capture: true ensures we run before any bubble-phase listeners
  // (including Next.js dev overlay which registers in bubble phase)
  window.addEventListener("unhandledrejection", handler, { capture: true });
}
