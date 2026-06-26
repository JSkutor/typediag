"use client";

import React, { useEffect } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { useWorkspaceKeybindings } from "@/hooks/useWorkspaceKeybindings";
import { useResponsiveScale } from "@/hooks/useResponsiveScale";
import { useDiagnosticsTransition } from "@/hooks/useDiagnosticsTransition";
import { sessionServiceClient } from "@/services/sessionServiceClient";

import { AuthControls } from "@/components/auth/AuthControls";
import { WorkspaceControls } from "@/components/workspace/WorkspaceControls";
import { PracticeLayer } from "@/components/workspace/PracticeLayer";
import { DiagnosticsLayer } from "@/components/workspace/DiagnosticsLayer";

export default function WorkspaceView({ lang }: { lang: string; tab: string }) {
  useResponsiveScale();
  const { startDiagnosticsTransition } = useDiagnosticsTransition();

  const setTargetLanguage = useTypingStore((state) => state.setTargetLanguage);

  // Initialize practice text and sync session
  useEffect(() => {
    sessionServiceClient.syncSessionOnMount().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Database is unavailable")) {
        console.warn("[TypeDiag] Session sync skipped — database is not running.");
        return;
      }
      console.error("Failed to sync session on mount:", error);
    });

    setTargetLanguage(lang);
  }, [setTargetLanguage, lang]);

  useWorkspaceKeybindings({
    onTransition: startDiagnosticsTransition,
  });

  return (
    <div className="workspace-container">
      <AuthControls variant="compact" />
      <WorkspaceControls />

      <PracticeLayer />

      <DiagnosticsLayer />
    </div>
  );
}
