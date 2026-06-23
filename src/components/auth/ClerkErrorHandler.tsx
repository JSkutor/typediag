"use client";

import { useEffect } from "react";

/**
 * ClerkJS occasionally throws an unhandled promise rejection ("Network error at .../touch")
 * when a fetch request is aborted by the browser during Next.js router navigation.
 * This component listens for that specific error and prevents the Next.js error overlay.
 */
export function ClerkErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || "";
      const isClerkNetworkError =
        msg.includes("ClerkJS: Network error") &&
        msg.includes("touch") &&
        msg.includes("Failed to fetch");

      if (isClerkNetworkError) {
        console.warn("Ignored ClerkJS network error during navigation:", msg);
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    // Add listener early with capture phase to intercept before Next.js error overlay
    window.addEventListener("unhandledrejection", handleUnhandledRejection, { capture: true });
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, { capture: true });
    };
  }, []);

  return null;
}
