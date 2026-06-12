import React from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { VirtualKeyboard } from "./VirtualKeyboard";
import { LatencySurface3D } from "./LatencySurface3D";
import { DashboardPanel } from "./DashboardPanel";
import { Flight } from "./flightChoreography";

interface DiagnosticsLayerProps {
  flights: Flight[];
  targetKeys: Set<string>;
  keyDelays: Record<string, number>;
  keycapRects: Record<string, DOMRect>;
}

export const DiagnosticsLayer: React.FC<DiagnosticsLayerProps> = ({
  flights,
  targetKeys,
  keyDelays,
  keycapRects,
}) => {
  const uiState = useWorkspaceStore((state) => state.uiState);
  const diagnosticMode = useWorkspaceStore((state) => state.diagnosticMode);
  const focusedKey = useWorkspaceStore((state) => state.focusedKey);
  const keyStats = useWorkspaceStore((state) => state.keyStats);
  const triangles = useWorkspaceStore((state) => state.triangles);
  const dynamicScale = useWorkspaceStore((state) => state.dynamicScale);

  const setDiagnosticMode = useWorkspaceStore((state) => state.setDiagnosticMode);
  const setFocusedKey = useWorkspaceStore((state) => state.setFocusedKey);

  const isVisible = uiState !== "practice" && uiState !== "measuring";

  return (
    <div className={`screen-diagnostics ${!isVisible ? "invisible" : ""}`}>
      <div className={`kbd-wrap ${uiState}`} style={{ transform: `scale(${dynamicScale})` }}>
        <div style={{ position: "relative", width: 1000, height: 650, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* 2D HTML/CSS Virtual Keyboard */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "opacity 0.22s ease-in-out",
              opacity: uiState === "diagnostics" && diagnosticMode === "surface" ? 0 : 1,
              pointerEvents: uiState === "diagnostics" && diagnosticMode === "surface" ? "none" : "auto",
              zIndex: 2,
            }}
          >
            <VirtualKeyboard 
              mode={uiState === "diagnostics" ? "diagnostics" : "practice"} 
              uiState={uiState}
              targetKeys={targetKeys}
              diagnosticMode={diagnosticMode} 
              keyStats={keyStats} 
              focusedKey={focusedKey}
              keyDelays={keyDelays}
            />
          </div>

          {/* 3D WebGL Latency Surface */}
          {triangles && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                transition: "opacity 0.22s ease-in-out",
                opacity: uiState === "diagnostics" && diagnosticMode === "surface" ? 1 : 0,
                pointerEvents: uiState === "diagnostics" && diagnosticMode === "surface" ? "auto" : "none",
                zIndex: 1,
              }}
            >
              <LatencySurface3D 
                keyStats={keyStats} 
                triangles={triangles} 
                width={1000} 
                height={650} 
                flights={flights} 
                keycapRects={keycapRects} 
                isActivated={uiState === "diagnostics" && diagnosticMode === "surface"}
                dynamicScale={dynamicScale}
              />
            </div>
          )}
        </div>
      </div>
      <DashboardPanel 
        mode={uiState === "diagnostics" ? "diagnostics" : "practice"} 
        diagnosticMode={diagnosticMode} 
        focusedKey={focusedKey} 
      />
    </div>
  );
};
