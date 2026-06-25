import React from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { LatencySurface3D } from "./LatencySurface3D";
import { CylindricalVector3D } from "./CylindricalVector3D";
import { DashboardPanel } from "./DashboardPanel";
import { ErrorBoundary3D } from "./ErrorBoundary3D";

export const DiagnosticsLayer: React.FC = () => {
  const uiState = useWorkspaceStore((state) => state.uiState);
  const diagnosticMode = useWorkspaceStore((state) => state.diagnosticMode);
  const focusedKey = useWorkspaceStore((state) => state.focusedKey);
  const keyStats = useWorkspaceStore((state) => state.keyStats);
  const triangles = useWorkspaceStore((state) => state.triangles);
  const setDiagnosticMode = useWorkspaceStore((state) => state.setDiagnosticMode);
  const setFocusedKey = useWorkspaceStore((state) => state.setFocusedKey);
  const setUiState = useWorkspaceStore((state) => state.setUiState);

  const isVisible = uiState !== "practice" && uiState !== "measuring";
  const isDiag = uiState === "diagnostics";

  const handle3DError = (error: Error) => {
    console.error("Caught error in 3D visualization. Reverting to practice mode.", error);
    setUiState("practice");
  };

  return (
    <div className={`screen-diagnostics ${!isVisible ? "invisible" : ""}`}>
      <ErrorBoundary3D key={diagnosticMode} onCatch={handle3DError}>
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
            initialFocusKey={focusedKey ?? undefined}
            onClose={() => {
              setDiagnosticMode("surface");
              setFocusedKey(null);
            }}
          />
        )}

        {/* Dashboard Panel (non-cylindrical, non-surface — cylindrical has its own panel) */}
        {diagnosticMode !== "cylindrical" && diagnosticMode !== "surface" && (
          <DashboardPanel
            mode={isDiag ? "diagnostics" : "practice"}
            diagnosticMode={diagnosticMode}
            focusedKey={focusedKey}
          />
        )}
      </ErrorBoundary3D>
    </div>
  );
};
