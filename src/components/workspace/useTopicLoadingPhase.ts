"use client";

import { useEffect, useState } from "react";
import {
  TOPIC_LOADING_DELAYED_AFTER_MS,
  type TopicLoadingPhase,
} from "@/lib/practice/topicLoading";

export function useTopicLoadingPhase(isActive: boolean): TopicLoadingPhase {
  const [activePhase, setActivePhase] = useState<"loading" | "delayed">("loading");

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let cancelled = false;
    const loadingId = requestAnimationFrame(() => {
      if (!cancelled) {
        setActivePhase("loading");
      }
    });
    const delayedTimer = window.setTimeout(() => {
      if (!cancelled) {
        setActivePhase("delayed");
      }
    }, TOPIC_LOADING_DELAYED_AFTER_MS);

    return () => {
      cancelled = true;
      cancelAnimationFrame(loadingId);
      window.clearTimeout(delayedTimer);
    };
  }, [isActive]);

  if (!isActive) {
    return "idle";
  }

  return activePhase;
}
