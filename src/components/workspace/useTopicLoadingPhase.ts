"use client";

import { useEffect, useState } from "react";
import { TOPIC_LOADING_DELAYED_AFTER_MS, type TopicLoadingPhase } from "@/lib/practice/topicLoading";

export function useTopicLoadingPhase(isActive: boolean): TopicLoadingPhase {
  const [phase, setPhase] = useState<TopicLoadingPhase>("idle");

  useEffect(() => {
    if (!isActive) {
      setPhase("idle");
      return;
    }

    setPhase("loading");
    const delayedTimer = window.setTimeout(() => {
      setPhase("delayed");
    }, TOPIC_LOADING_DELAYED_AFTER_MS);

    return () => {
      window.clearTimeout(delayedTimer);
    };
  }, [isActive]);

  return phase;
}
