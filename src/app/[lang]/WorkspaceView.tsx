"use client";

import React, { useEffect } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { useWorkspaceKeybindings } from "@/hooks/useWorkspaceKeybindings";
import { useResponsiveScale } from "@/hooks/useResponsiveScale";
import { useDiagnosticsTransition } from "@/hooks/useDiagnosticsTransition";
import { sessionServiceClient } from "@/services/sessionServiceClient";

import { WorkspaceControls } from "@/components/workspace/WorkspaceControls";
import { PracticeLayer } from "@/components/workspace/PracticeLayer";
import { DiagnosticsLayer } from "@/components/workspace/DiagnosticsLayer";

import targets from "@/data/targets_client.json";

export default function WorkspaceView({ lang, tab }: { lang: string; tab: string }) {
  useResponsiveScale();
  const { startDiagnosticsTransition } = useDiagnosticsTransition();

  const setTarget = useTypingStore((state) => state.setTarget);

  // Initialize practice text and sync session
  useEffect(() => {
    sessionServiceClient.syncSessionOnMount().catch((error) => {
      console.error("Failed to sync session on mount:", error);
    });
    if (targets.length > 0) {
      setTarget(targets[0]);
    }
  }, [setTarget]);

  useWorkspaceKeybindings({
    onTransition: startDiagnosticsTransition,
  });

  return (
    <div
      className="workspace-container"
      style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}
    >
      <WorkspaceControls onStartDiagnostics={startDiagnosticsTransition} />

      <PracticeLayer />

      <DiagnosticsLayer />
    </div>
  );
}
