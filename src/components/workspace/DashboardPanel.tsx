"use client";

import React from "react";
import type { DiagnosticsMode } from "@/store/useWorkspaceStore";

const PANEL_COPY: Record<
  Extract<DiagnosticsMode, "backspace" | "finger">,
  { title: string; description: string }
> = {
  backspace: {
    title: "Backspace Path",
    description: "Highlights keys that frequently trigger an immediate backspace error correction.",
  },
  finger: {
    title: "Finger Load",
    description:
      "Workload distribution and error rates mapped by standard touch typing finger assignments.",
  },
};

interface DashboardPanelProps {
  diagnosticMode: Extract<DiagnosticsMode, "backspace" | "finger">;
}

export const DashboardPanel: React.FC<DashboardPanelProps> = ({ diagnosticMode }) => {
  const copy = PANEL_COPY[diagnosticMode];

  return (
    <div className="dashboard-panel glass-panel">
      <h2 className="dashboard-title">{copy.title}</h2>
      <p className="dashboard-desc">{copy.description}</p>

      <div className="dashboard-shortcuts">
        <p className="dashboard-shortcuts__live sr-only" aria-live="polite">
          진단 모드입니다. 탭(Tab) 키를 누르면 연습 모드로 돌아갑니다.
        </p>
        <div className="dashboard-shortcut-row" aria-hidden="true">
          <kbd className="dashboard-kbd">Tab</kbd>
          <span>연습으로 복귀</span>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-row">
          <span className="stat-label">Status</span>
          <span className="stat-value">Active</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Live Tracking</span>
          <span className="stat-value primary">Enabled</span>
        </div>
      </div>
    </div>
  );
};
