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

  const { flights, targetKeys, keyDelays, precalculateFlights } = useFlightChoreography();

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

    setTimeout(() => {
      setUiState("diagnostics");
      setDiagnosticMode("surface");
    }, TILT_AT);
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
      
      <FlightAnimator flights={flights} isFlying={uiState === "flying"} />

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
        <div className={`kbd-wrap ${uiState}`} style={{ transform: "scale(0.95)" }}>
          {diagnosticMode === "surface" && uiState === "diagnostics" && triangles ? (
            <LatencySurface3D keyStats={keyStats} triangles={triangles} width={900} height={500} />
          ) : (
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
          )}
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
