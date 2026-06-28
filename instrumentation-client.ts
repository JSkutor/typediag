import posthog from "posthog-js";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
if (token) {
  posthog.init(token, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
} else {
  if (process.env.NODE_ENV === "development") {
    console.warn("PostHog project token is missing. Client-side tracking is disabled.");
  }
}

/**
 * instrumentation-client.ts
 *
 * Executed at the very beginning of the client bundle, before React hydration
 * and before the Next.js dev overlay registers its unhandledRejection listener.
 *
 * Suppresses the benign ClerkJS "Network error at .../touch" that occurs when
 * the browser aborts an in-flight session-touch request during Next.js client-side
 * navigation. Without this, the rejection bubbles to the dev overlay and is
 * proxied to the terminal as `[browser] ⨯ unhandledRejection`.
 */
const handler = (event: PromiseRejectionEvent) => {
  const reason = event.reason;
  const msg: string =
    reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "";

  const isClerkTouchAbort =
    msg.includes("ClerkJS: Network error") &&
    msg.includes("/touch") &&
    msg.includes("Failed to fetch");

  if (isClerkTouchAbort) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
};

window.addEventListener("unhandledrejection", handler, { capture: true });
