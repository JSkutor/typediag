import { useCallback, useState } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { runPipeline, buildLayout, triangulate, type KeyEvent } from "@/lib/skdm";
import { getOrCreateGuestId } from "@/utils/guestUser";

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

    const currentRunId = useTypingStore.getState().currentRunId;
    let eventsToAnalyze: KeyEvent[] = [];

    if (currentRunId) {
      try {
        const res = await fetch(`/api/session?action=analysis&runId=${currentRunId}`, {
          headers: {
            "X-Guest-User-Id": getOrCreateGuestId(),
          },
        });
        if (!res.ok) {
          throw new Error("Failed to fetch session analysis events");
        }
        const data = await res.json();
        eventsToAnalyze = data.events || [];
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

  const startMockDiagnostics = useCallback(async () => {
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
        setIsMockLoading(false);
        return;
      }

      const layout = buildLayout();
      const results = runPipeline(eventsToAnalyze, layout);
      const { triangles } = triangulate(results);

      setAnalysisData(results, triangles, eventsToAnalyze);
      setUiState("diagnostics");
      setDiagnosticMode("surface");
    } catch (err) {
      console.error("Failed to compile mock stats:", err);
    } finally {
      setIsMockLoading(false);
    }
  }, [setAnalysisData, setUiState, setDiagnosticMode]);

  return { startDiagnosticsTransition, startMockDiagnostics, isMockLoading };
}
