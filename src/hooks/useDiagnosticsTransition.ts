import { useCallback } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { runPipeline, buildLayout, triangulate, type KeyEvent } from "@/lib/skdm";
import { db } from "@/utils/db";

export function useDiagnosticsTransition() {
  const setUiState = useWorkspaceStore((state) => state.setUiState);
  const setDiagnosticMode = useWorkspaceStore((state) => state.setDiagnosticMode);
  const setAnalysisData = useWorkspaceStore((state) => state.setAnalysisData);

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

  return { startDiagnosticsTransition };
}
