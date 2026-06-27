"use client";

import React, { useEffect } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import {
  formatPageMetricsFlashCpm,
  PAGE_METRICS_FLASH_DURATION_MS,
} from "@/lib/practice/pageMetricsFlash";

export const PageMetricsFlash: React.FC = React.memo(function PageMetricsFlash() {
  const pageMetricsFlash = useTypingStore((state) => state.pageMetricsFlash);
  const targetLanguage = useTypingStore((state) => state.targetLanguage);
  const dismissPageMetricsFlash = useTypingStore((state) => state.dismissPageMetricsFlash);

  useEffect(() => {
    if (!pageMetricsFlash) {
      return;
    }

    const timer = window.setTimeout(() => {
      dismissPageMetricsFlash();
    }, PAGE_METRICS_FLASH_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pageMetricsFlash, dismissPageMetricsFlash]);

  if (!pageMetricsFlash) {
    return null;
  }

  const isPerfect = pageMetricsFlash.accuracy === 100;
  const cpmLabel = formatPageMetricsFlashCpm(pageMetricsFlash.cpm);
  const isEn = targetLanguage === "en";

  return (
    <div
      className={`page-metrics-flash${isPerfect ? " page-metrics-flash--perfect" : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={isEn ? "Page typing speed" : "페이지 타자 속도"}
    >
      <span className="page-metrics-flash__label">{cpmLabel}</span>
    </div>
  );
});
