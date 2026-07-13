/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useState } from "react";
import posthog from "posthog-js";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export const OnboardingGuides: React.FC = () => {
  const uiState = useWorkspaceStore((state) => state.uiState);
  const diagnosticMode = useWorkspaceStore((state) => state.diagnosticMode);

  const [showTabGuide, setShowTabGuide] = useState(false);
  const [showLatencyClickGuide, setShowLatencyClickGuide] = useState(false);
  const [showPanelGuide, setShowPanelGuide] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load visibility settings on mount (avoid SSR hydration mismatch)
  useEffect(() => {
    setMounted(true);
    const hideTab = localStorage.getItem("typediag_hide_tab_guide") === "true";
    const hideLatency = localStorage.getItem("typediag_hide_latency_click_guide") === "true";
    const hidePanel = localStorage.getItem("typediag_hide_space_guide") === "true";

    setShowTabGuide(!hideTab);
    setShowLatencyClickGuide(!hideLatency);
    setShowPanelGuide(!hidePanel);
  }, []);

  // Auto-hide and store when actions are performed
  useEffect(() => {
    if (!mounted) return;
    if (uiState === "diagnostics") {
      // User entered diagnostics mode - Tab Guide completed
      setShowTabGuide((prev) => {
        if (prev) {
          localStorage.setItem("typediag_hide_tab_guide", "true");
          return false;
        }
        return prev;
      });
    }
  }, [uiState, mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (uiState === "diagnostics" && diagnosticMode === "cylindrical") {
      // User clicked a key or entered cylindrical mode - Latency Click Guide completed
      setShowLatencyClickGuide((prev) => {
        if (prev) {
          localStorage.setItem("typediag_hide_latency_click_guide", "true");
          return false;
        }
        return prev;
      });
    }
  }, [uiState, diagnosticMode, mounted]);

  // Detect if user pressed Space in cylindrical mode (opening/closing the panel)
  useEffect(() => {
    if (!mounted) return;
    if (uiState !== "diagnostics" || diagnosticMode !== "cylindrical") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setShowPanelGuide((prev) => {
          if (prev) {
            localStorage.setItem("typediag_hide_space_guide", "true");
            return false;
          }
          return prev;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [uiState, diagnosticMode, mounted]);

  const dismissTabGuide = () => {
    localStorage.setItem("typediag_hide_tab_guide", "true");
    setShowTabGuide(false);
    posthog.capture("onboarding_guide_dismissed", { guide: "tab" });
  };

  const dismissLatencyGuide = () => {
    localStorage.setItem("typediag_hide_latency_click_guide", "true");
    setShowLatencyClickGuide(false);
    posthog.capture("onboarding_guide_dismissed", { guide: "latency_click" });
  };

  const dismissPanelGuide = () => {
    localStorage.setItem("typediag_hide_space_guide", "true");
    setShowPanelGuide(false);
    posthog.capture("onboarding_guide_dismissed", { guide: "panel" });
  };

  if (!mounted) return null;

  // Render the appropriate guide based on state
  if (uiState === "practice" && showTabGuide) {
    return (
      <div className="onboarding-guide-container">
        <div className="onboarding-guide-banner">
          <div className="onboarding-guide-content">
            <span className="onboarding-guide-icon">💡</span>
            <span className="onboarding-guide-text">
              <kbd className="onboarding-guide-kbd">Tab</kbd> 키를 누르면 3D 지연 지형 모드로 전환할
              수 있습니다.
            </span>
          </div>
          <button onClick={dismissTabGuide} className="onboarding-guide-close" aria-label="닫기">
            &times;
          </button>
        </div>
      </div>
    );
  }

  if (uiState === "diagnostics" && diagnosticMode === "surface" && showLatencyClickGuide) {
    return (
      <div className="onboarding-guide-container">
        <div className="onboarding-guide-banner onboarding-guide-banner--purple">
          <div className="onboarding-guide-content">
            <span className="onboarding-guide-icon">💡</span>
            <span className="onboarding-guide-text">
              분석하고 싶은 키를 누르면, 그 키의 3D 원통좌표계 지연 모형을 볼 수 있습니다.
            </span>
          </div>
          <button
            onClick={dismissLatencyGuide}
            className="onboarding-guide-close"
            aria-label="닫기"
          >
            &times;
          </button>
        </div>
      </div>
    );
  }

  if (uiState === "diagnostics" && diagnosticMode === "cylindrical" && showPanelGuide) {
    return (
      <div className="onboarding-guide-container">
        <div className="onboarding-guide-banner">
          <div className="onboarding-guide-content">
            <span className="onboarding-guide-icon">💡</span>
            <span className="onboarding-guide-text">
              <kbd className="onboarding-guide-kbd">Space</kbd> 키를 누르거나 좌측의{" "}
              <kbd className="onboarding-guide-kbd">›</kbd> 버튼을 클릭해 상세 진단 패널을
              열어보세요.
            </span>
          </div>
          <button onClick={dismissPanelGuide} className="onboarding-guide-close" aria-label="닫기">
            &times;
          </button>
        </div>
      </div>
    );
  }

  return null;
};
