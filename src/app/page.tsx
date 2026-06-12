"use client";

import React, { useEffect, useCallback } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { runPipeline, buildLayout, triangulate } from "@/lib/skdm";
import { useFlightChoreography } from "@/hooks/useFlightChoreography";
import { useWorkspaceKeybindings } from "@/hooks/useWorkspaceKeybindings";

import { FlightAnimator } from "@/components/workspace/FlightAnimator";
import { WorkspaceControls } from "@/components/workspace/WorkspaceControls";
import { PracticeLayer } from "@/components/workspace/PracticeLayer";
import { DiagnosticsLayer } from "@/components/workspace/DiagnosticsLayer";

export default function Workspace() {
  const uiState = useWorkspaceStore((state) => state.uiState);
  const setUiState = useWorkspaceStore((state) => state.setUiState);
  const setDiagnosticMode = useWorkspaceStore((state) => state.setDiagnosticMode);
  const setDynamicScale = useWorkspaceStore((state) => state.setDynamicScale);
  const setAnalysisData = useWorkspaceStore((state) => state.setAnalysisData);

  // Responsive scaling
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
  }, [setDynamicScale]);

  const { flights, targetKeys, keyDelays, keycapRects, precalculateFlights } = useFlightChoreography();

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
    
    setAnalysisData(results, triangles);
    precalculateFlights();
    setUiState("flying");
  }, [precalculateFlights, setAnalysisData, setUiState]);

  useWorkspaceKeybindings({
    onTransition: startDiagnosticsTransition,
  });

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

      <WorkspaceControls onStartDiagnostics={startDiagnosticsTransition} />

      <PracticeLayer />
      
      <DiagnosticsLayer 
        flights={flights}
        targetKeys={targetKeys}
        keyDelays={keyDelays}
        keycapRects={keycapRects}
      />
    </div>
  );
}
