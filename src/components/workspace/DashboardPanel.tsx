"use client";

import React from "react";
import { DiagnosticsMode } from "@/store/useWorkspaceStore";

interface DashboardPanelProps {
  mode: "practice" | "diagnostics";
  diagnosticMode: DiagnosticsMode;
  focusedKey: string | null;
}

export const DashboardPanel: React.FC<DashboardPanelProps> = ({
  mode,
  diagnosticMode,
  focusedKey,
}) => {
  if (mode === "practice") return null;

  return (
    <div className="dashboard-panel glass-panel">
      <h2 className="dashboard-title">
        {diagnosticMode === "surface" && "3D Latency Surface"}
        {diagnosticMode === "cylindrical" && `Cylindrical: [${focusedKey}]`}
        {diagnosticMode === "backspace" && "Backspace Path"}
        {diagnosticMode === "shift" && "Shift Sync"}
        {diagnosticMode === "space" && "Spacebar Rhythm"}
        {diagnosticMode === "finger" && "Finger Load"}
      </h2>
      <div className="dashboard-desc">
        {diagnosticMode === "surface" &&
          "Overall keystroke latency mapped to keycap elevation. Peaks represent slow transitions or hesitation."}
        {diagnosticMode === "cylindrical" &&
          "Polar coordinate projection of successor keys. Radius is physical distance, height is latency."}
        {diagnosticMode === "backspace" &&
          "Highlights keys that frequently trigger an immediate backspace error correction."}
        {diagnosticMode === "shift" &&
          "Evaluates timing synchronization and ergonomic balance between Shift and character keys."}
        {diagnosticMode === "space" &&
          "Analyzes thumb imbalance and rhythm stutters before and after spacebar presses."}
        {diagnosticMode === "finger" &&
          "Workload distribution and error rates mapped by standard touch typing finger assignments."}
      </div>

      <div className="mt-4 text-xs text-neutral-400 font-mono">
        <p className="mb-2 sr-only" aria-live="polite">
          진단 모드입니다. 탭(Tab) 키를 누르면 연습 모드로 돌아갑니다.
        </p>
        <div className="flex gap-2 items-center opacity-80" aria-hidden="true">
          <kbd className="px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-800">Tab</kbd>{" "}
          <span>연습으로 복귀</span>
        </div>
        {diagnosticMode === "surface" && (
          <div className="flex gap-2 items-center mt-2 opacity-80" aria-hidden="true">
            <kbd className="px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-800">
              Click
            </kbd>{" "}
            <span>키 상세 확인</span>
          </div>
        )}
        {diagnosticMode === "cylindrical" && (
          <div className="flex gap-2 items-center mt-2 opacity-80" aria-hidden="true">
            <kbd className="px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-800">
              Esc
            </kbd>{" "}
            <span>전체 뷰로 복귀</span>
          </div>
        )}
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
