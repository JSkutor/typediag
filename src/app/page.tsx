"use client";

import React, { useEffect, useCallback } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { runPipeline, buildLayout, triangulate } from "@/lib/skdm";
import { useWorkspaceKeybindings } from "@/hooks/useWorkspaceKeybindings";

import { WorkspaceControls } from "@/components/workspace/WorkspaceControls";
import { PracticeLayer } from "@/components/workspace/PracticeLayer";
import { DiagnosticsLayer } from "@/components/workspace/DiagnosticsLayer";

import targets from "@/data/targets.json";

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

  const setTarget = useTypingStore((state) => state.setTarget);

  // Initialize practice text
  useEffect(() => {
    if (targets.length > 0) {
      setTarget(targets[0].content);
    }
  }, [setTarget]);

  // Pipeline calculation moved to Tab key handler to avoid lagging the 3D tilt transition
  const startDiagnosticsTransition = useCallback(() => {
    const currentEvents = useTypingStore.getState().events;
    const layout = buildLayout();
    const results = runPipeline(currentEvents, layout);
    const { triangles } = triangulate(results);
    
    setAnalysisData(results, triangles);
    setUiState("diagnostics");
    setDiagnosticMode("surface");
  }, [setAnalysisData, setUiState, setDiagnosticMode]);

  useWorkspaceKeybindings({
    onTransition: startDiagnosticsTransition,
  });

  return (
    <div className="workspace-container" style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      
      <WorkspaceControls onStartDiagnostics={startDiagnosticsTransition} />

      <PracticeLayer />
      
      <DiagnosticsLayer />
    </div>
  );
}
