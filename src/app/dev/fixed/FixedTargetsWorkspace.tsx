"use client";

import React, { useEffect } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { useWorkspaceKeybindings } from "@/hooks/useWorkspaceKeybindings";
import { useResponsiveScale } from "@/hooks/useResponsiveScale";
import { useDiagnosticsTransition } from "@/hooks/useDiagnosticsTransition";
import { sessionServiceClient } from "@/services/sessionServiceClient";
import { PracticeLayer } from "@/components/workspace/PracticeLayer";
import { DiagnosticsLayer } from "@/components/workspace/DiagnosticsLayer";
import { AuthControls } from "@/components/auth/AuthControls";
import { WorkspaceControls } from "@/components/workspace/WorkspaceControls";
import { LegalInfoMenu } from "@/components/layout/LegalInfoMenu";
import type { TargetText } from "@/db/schema";

interface FixedTargetsWorkspaceProps {
  targets: TargetText[];
}

export default function FixedTargetsWorkspace({ targets }: FixedTargetsWorkspaceProps) {
  useResponsiveScale();
  const { startDiagnosticsTransition } = useDiagnosticsTransition();

  const setTargetLanguage = useTypingStore((state) => state.setTargetLanguage);
  const setTarget = useTypingStore((state) => state.setTarget);

  useEffect(() => {
    // 1. Sync session on mount just like the normal practice page
    sessionServiceClient.syncSessionOnMount().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Database is unavailable")) {
        console.warn("[TypeDiag] Session sync skipped — database is not running.");
        return;
      }
      console.error("Failed to sync session on mount:", error);
    });

    // 2. Initialize the typing store with our fixed 10 targets, using topic mode.
    if (targets.length > 0) {
      const lang = targets[0].language;
      setTargetLanguage(lang);
      
      useTypingStore.setState({
        mode: "topic",
        topicTargets: targets.map(t => ({ id: t.id, content: t.content, language: t.language })),
        topicTargetIndex: 0,
        currentTopic: "", // empty string disables fetching more topics
        isTopicInputActive: false,
      });

      setTarget({
        id: targets[0].id,
        content: targets[0].content,
        language: targets[0].language,
      });
    }
  }, [targets, setTargetLanguage, setTarget]);

  useWorkspaceKeybindings({
    onTransition: startDiagnosticsTransition,
  });

  return (
    <div className="workspace-container">
      <AuthControls variant="compact" />
      <WorkspaceControls />

      <PracticeLayer hideToolbar={true} />

      <DiagnosticsLayer />
      <LegalInfoMenu lang="ko" />
    </div>
  );
}
