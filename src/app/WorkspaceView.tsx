"use client";

import React, { useEffect } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { useWorkspaceKeybindings } from "@/hooks/useWorkspaceKeybindings";
import { useResponsiveScale } from "@/hooks/useResponsiveScale";
import { useDiagnosticsTransition } from "@/hooks/useDiagnosticsTransition";
import { sessionServiceClient } from "@/services/sessionServiceClient";

import { WorkspaceLogo } from "@/components/workspace/WorkspaceLogo";
import { AuthControls } from "@/components/auth/AuthControls";
import { WorkspaceControls } from "@/components/workspace/WorkspaceControls";
import { PracticeLayer } from "@/components/workspace/PracticeLayer";
import { DiagnosticsLayer } from "@/components/workspace/DiagnosticsLayer";
import { OnboardingGuides } from "@/components/workspace/OnboardingGuides";
import { FeedbackButton } from "@/components/workspace/feedback/FeedbackButton";
import { LegalInfoMenu } from "@/components/layout/LegalInfoMenu";

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
      <WorkspaceLogo />
      <AuthControls variant="compact" />
      <WorkspaceControls />

      <PracticeLayer />

      <DiagnosticsLayer />

      <OnboardingGuides />

      <FeedbackButton />
      <div className="top-right-actions">
        <a 
          href="https://github.com/JSkutor/typediag" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="github-icon-btn"
          aria-label="GitHub Repository"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
          </svg>
        </a>
        <LegalInfoMenu lang={lang} />
      </div>
    </div>
  );
}
