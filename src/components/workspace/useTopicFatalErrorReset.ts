"use client";

import { useEffect } from "react";
import { TOPIC_ERROR_RESET_AFTER_MS } from "@/lib/practice/topicLoading";

/** After a fatal topic error is shown, return to the guide screen. */
export function useTopicFatalErrorReset(isActive: boolean, onReset: () => void): void {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const timer = window.setTimeout(onReset, TOPIC_ERROR_RESET_AFTER_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isActive, onReset]);
}
