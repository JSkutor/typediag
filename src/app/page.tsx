"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PracticePanel } from "@/components/workspace/PracticePanel";
import { DashboardPanel } from "@/components/workspace/DashboardPanel";
import { VirtualKeyboard, DiagnosticsMode } from "@/components/workspace/VirtualKeyboard";
import { FlightAnimator } from "@/components/workspace/FlightAnimator";
import { TILT_AT } from "@/components/workspace/flightChoreography";
import { useTypingStore } from "@/store/useTypingStore";
import { KeyResult, runPipeline, buildLayout, triangulate } from "@/lib/skdm";
import { LatencySurface3D } from "@/components/workspace/LatencySurface3D";
import { useFlightChoreography } from "@/hooks/useFlightChoreography";
import { useWorkspaceKeybindings } from "@/hooks/useWorkspaceKeybindings";

export type UiState = "practice" | "measuring" | "flying" | "diagnostics";

export default function Workspace() {
  const [uiState, setUiState] = useState<UiState>("practice");
  const [diagnosticMode, setDiagnosticMode] = useState<DiagnosticsMode>("surface");
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [keyStats, setKeyStats] = useState<Record<string, KeyResult>>({});
  const [triangles, setTriangles] = useState<Uint32Array | null>(null);
  const [dynamicScale, setDynamicScale] = useState(0.95);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      const baseW = 1060;
      const baseH = 720;
      const scaleX = window.innerWidth / baseW;
      const scaleY = window.innerHeight / baseH;
      // Fit entirely within viewport, cap max at 1.45 for big screens, min at 0.25 for small screens
      const scale = Math.max(0.25, Math.min(scaleX, scaleY, 1.45));
      setDynamicScale(scale);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { flights, targetKeys, keyDelays, keycapRects, precalculateFlights } = useFlightChoreography(uiState, dynamicScale);

  const setTarget = useTypingStore((state) => state.setTarget);

  // Initialize practice text
  useEffect(() => {
    setTarget("The quick brown fox jumps over the lazy dog. Try typing some text to gather SKDM data, then press Tab to analyze the 3D latency surface.");
  }, [setTarget]);

  // Pipeline calculation moved to Tab key handler to avoid lagging the 3D tilt transition
  const startDiagnosticsTransition = useCallback(() => {
    const currentEvents = useTypingStore.getState().events;
    const layout = buildLayout();
    const results = runPipeline(currentEvents, layout);
    const { triangles } = triangulate(results);
    setKeyStats(results);
    setTriangles(triangles);

    precalculateFlights();

    setUiState("flying");
  }, [precalculateFlights]);

  useWorkspaceKeybindings({
    uiState,
    setUiState,
    setDiagnosticMode,
    setFocusedKey,
    onTransition: startDiagnosticsTransition,
  });

  // Handle virtual key clicks in diagnostics mode
  const handleKeyClick = useCallback((key: string) => {
    if (uiState !== "diagnostics") return;
    
    if (key === "Backspace") {
      setDiagnosticMode("backspace");
    } else if (key === "Shift" || key === "ShiftRight") {
      setDiagnosticMode("shift");
    } else if (key === "Space") {
      setDiagnosticMode("space");
    } else {
      setDiagnosticMode("cylindrical");
      setFocusedKey(key);
    }
  }, [uiState]);

  return (
    <div className="workspace-container" style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      
      <FlightAnimator 
        flights={flights} 
        isFlying={uiState === "flying" || uiState === "diagnostics"} 
        onComplete={() => {
          setUiState("diagnostics");
          setDiagnosticMode("surface");
        }}
      />

      {/* Mode Toggle Button for mouse users */}
      <button 
        onClick={() => {
           if (uiState === "practice") {
             const e = new KeyboardEvent("keydown", { key: "Tab" });
             window.dispatchEvent(e);
           } else {
             setUiState("practice");
           }
        }}
        className="mode-toggle-btn"
      >
        {uiState === "practice" ? "Enter TypeDiag Lab (Tab)" : "Return to Practice (Tab)"}
      </button>

      {/* Screen: Practice Layer (Moves Down) */}
      <div className={`screen-practice ${uiState === "flying" || uiState === "diagnostics" ? "hidden-down" : ""}`}>
        <PracticePanel />
      </div>
      
      {/* Screen: Diagnostics Layer (Fades In) */}
      {/* Note: Kept strictly invisible during practice to hide all borders/shadows, but present in DOM for measuring! */}
      <div className={`screen-diagnostics ${uiState === "practice" || uiState === "measuring" ? "invisible" : ""}`}>
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
                onKeyClick={handleKeyClick}
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
    </div>
  );
}
