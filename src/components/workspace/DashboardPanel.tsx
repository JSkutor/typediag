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
