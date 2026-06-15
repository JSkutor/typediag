"use client";

import React, { useEffect, useCallback } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { runPipeline, buildLayout, triangulate, type KeyEvent } from "@/lib/skdm";
import { useWorkspaceKeybindings } from "@/hooks/useWorkspaceKeybindings";
import { db } from "@/utils/db";
import { mean } from "@/lib/skdm/stats";

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

  // Initialize practice text and sync session
  useEffect(() => {
    (async () => {
      await db.syncSessionOnMount();
    })();
    if (targets.length > 0) {
      setTarget(targets[0].content);
    }
  }, [setTarget]);


  // Pipeline calculation moved to Tab key handler to avoid lagging the 3D tilt transition
  const startDiagnosticsTransition = useCallback(async () => {
    const currentRunId = useTypingStore.getState().currentRunId;
    let eventsToAnalyze: KeyEvent[] = [];

    if (currentRunId) {
      try {
        const pages = await db.getPagesForRun(currentRunId);
        
        if (pages.length > 0) {
          // Merge all key events from pages in the current run
          eventsToAnalyze = pages.flatMap((page) =>
            page.key_events.map((ev) => ({
              fromKey: ev.from_key,
              toKey: ev.to_key,
              latencyMs: ev.latency,
              keyChar: ev.key_char,
              holdDurationMs: ev.hold_duration_ms,
              isCorrect: ev.is_correct,
              expectedChar: ev.expected_char,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to compile run stats:", err);
      }
    }

    // Fallback to currently active typing events if the run has no pages
    if (eventsToAnalyze.length === 0) {
      eventsToAnalyze = useTypingStore.getState().events;
    }

    const layout = buildLayout();
    const results = runPipeline(eventsToAnalyze, layout);
    const { triangles } = triangulate(results);
    
    setAnalysisData(results, triangles, eventsToAnalyze);
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
