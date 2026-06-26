"use client";

import React from "react";
import {
  getTopicLoadingCopy,
  isTopicErrorKey,
  resolveTopicFatalOverlay,
  type TopicErrorKey,
} from "@/lib/practice/topicLoading";
import { useTopicLoadingPhase } from "./useTopicLoadingPhase";

interface TopicLoadingOverlayProps {
  isActive: boolean;
  isEn: boolean;
  /** Initial topic search vs sentence generation */
  variant: "search" | "generate";
  error?: TopicErrorKey | null;
}

export const TopicLoadingOverlay: React.FC<TopicLoadingOverlayProps> = ({
  isActive,
  isEn,
  variant,
  error,
}) => {
  const phase = useTopicLoadingPhase(isActive);
  const lang = isEn ? "en" : "ko";
  const messages = getTopicLoadingCopy(lang);
  const fatalOverlay =
    error && isTopicErrorKey(error) ? resolveTopicFatalOverlay(error, lang) : null;

  if (!isActive) {
    return null;
  }

  const primary =
    fatalOverlay?.primary ??
    (phase === "delayed"
      ? messages.delayed
      : variant === "generate"
        ? messages.generating
        : messages.loading);

  const hint =
    fatalOverlay?.hint ?? (!fatalOverlay && phase === "delayed" ? messages.delayedHint : null);

  return (
    <div className="typing-loading" role="status" aria-live="polite">
      <div className="typing-loading__text">{primary}</div>
      {hint ? <div className="typing-loading__hint">{hint}</div> : null}
    </div>
  );
};
