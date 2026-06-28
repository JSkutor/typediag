import { useCallback, useState } from "react";
import posthog from "posthog-js";
import { useTypingStore } from "@/store/useTypingStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { runPipeline, buildLayout, triangulate, type KeyEvent } from "@/lib/skdm";
import { applyGuestTokenFromResponse, getGuestAuthHeaders } from "@/utils/guestUser";

export function useDiagnosticsTransition() {
  const setUiState = useWorkspaceStore((state) => state.setUiState);
  const setDiagnosticMode = useWorkspaceStore((state) => state.setDiagnosticMode);
  const setAnalysisData = useWorkspaceStore((state) => state.setAnalysisData);
  const [isMockLoading, setIsMockLoading] = useState(false);

  const startDiagnosticsTransition = useCallback(async () => {
    const typingStore = useTypingStore.getState();

    // If the current page is completed (done) but not yet saved, save it now
    if (typingStore.status === "done") {
      await typingStore.saveCurrentPage();
    }

    let eventsToAnalyze: KeyEvent[] = [];

    try {
      const res = await fetch("/api/session?action=analysis", {
        headers: getGuestAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error("Failed to fetch session analysis events");
      }
      const data = await res.json();
      applyGuestTokenFromResponse(data);
      eventsToAnalyze = data.events || [];
    } catch (err) {
      console.error("Failed to compile run stats:", err);
    }

    // Fallback to currently active typing events if the run has no pages
    if (eventsToAnalyze.length === 0) {
      eventsToAnalyze = useTypingStore.getState().events;
    }

    const layout = buildLayout();
    const results = runPipeline(eventsToAnalyze, layout);
    const { triangles } = triangulate(results);

    setAnalysisData(results, triangles, eventsToAnalyze);
    posthog.capture("diagnostics_entered", { trigger: "tab", event_count: eventsToAnalyze.length });
    setUiState("diagnostics");
    setDiagnosticMode("surface");
  }, [setAnalysisData, setUiState, setDiagnosticMode]);

  const loadMockAnalysisData = useCallback(async (): Promise<boolean> => {
    setIsMockLoading(true);
    try {
      const res = await fetch("/api/session?action=mock");
      if (!res.ok) {
        throw new Error("Failed to fetch mock session events");
      }
      const data = await res.json();
      const eventsToAnalyze: KeyEvent[] = data.events || [];

      if (eventsToAnalyze.length === 0) {
        console.warn("No mock events received.");
        return false;
      }

      const layout = buildLayout();
      const results = runPipeline(eventsToAnalyze, layout);
      const { triangles } = triangulate(results);

      setAnalysisData(results, triangles, eventsToAnalyze);
      return true;
    } catch (err) {
      console.error("Failed to compile mock stats:", err);
      return false;
    } finally {
      setIsMockLoading(false);
    }
  }, [setAnalysisData]);

  const startMockDiagnostics = useCallback(async () => {
    const loaded = await loadMockAnalysisData();
    if (loaded) {
      setUiState("diagnostics");
      setDiagnosticMode("surface");
    }
  }, [loadMockAnalysisData, setUiState, setDiagnosticMode]);

  return {
    startDiagnosticsTransition,
    startMockDiagnostics,
    loadMockAnalysisData,
    isMockLoading,
  };
}
