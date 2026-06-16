import React from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { LatencySurface3D } from "./LatencySurface3D";
import { CylindricalVector3D } from "./CylindricalVector3D";
import { DashboardPanel } from "./DashboardPanel";

export const DiagnosticsLayer: React.FC = () => {
  const uiState = useWorkspaceStore((state) => state.uiState);
  const diagnosticMode = useWorkspaceStore((state) => state.diagnosticMode);
  const focusedKey = useWorkspaceStore((state) => state.focusedKey);
  const keyStats = useWorkspaceStore((state) => state.keyStats);
  const triangles = useWorkspaceStore((state) => state.triangles);
  const setDiagnosticMode = useWorkspaceStore((state) => state.setDiagnosticMode);
  const setFocusedKey = useWorkspaceStore((state) => state.setFocusedKey);

  const isVisible = uiState !== "practice" && uiState !== "measuring";
  const isDiag = uiState === "diagnostics";

  return (
    <div className={`screen-diagnostics ${!isVisible ? "invisible" : ""}`}>
      {/* 3D WebGL Latency Surface (full viewport) */}
      {diagnosticMode === "surface" && triangles && (
        <div
          className="cyl-viewport"
          style={{
            zIndex: 1,
            transition: "opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            opacity: isDiag ? 1 : 0,
            pointerEvents: isDiag ? "auto" : "none",
          }}
        >
          <LatencySurface3D
            keyStats={keyStats}
            triangles={triangles}
            isActivated={isDiag && diagnosticMode === "surface"}
          />
        </div>
      )}

      {/* Cylindrical Vector 3D (full viewport) */}
      {diagnosticMode === "cylindrical" && (
        <CylindricalVector3D
          isActivated={isDiag && diagnosticMode === "cylindrical"}
          initialCenterKey={focusedKey ?? undefined}
          onClose={() => {
            setDiagnosticMode("surface");
            setFocusedKey(null);
          }}
        />
      )}

      {/* Dashboard Panel (non-cylindrical — cylindrical has its own panel) */}
      {diagnosticMode !== "cylindrical" && (
        <DashboardPanel
          mode={isDiag ? "diagnostics" : "practice"}
          diagnosticMode={diagnosticMode}
          focusedKey={focusedKey}
        />
      )}
    </div>
  );
};
