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
    const typingStore = useTypingStore.getState();

    // If the current page is completed (done) but not yet saved, save it now
    if (typingStore.status === "done") {
      await typingStore.saveCurrentPage();
    }

    const currentRunId = useTypingStore.getState().currentRunId;
    let eventsToAnalyze: KeyEvent[] = [];

    if (currentRunId) {
      try {
        const pages = await db.getPagesForRun(currentRunId);

        if (pages.length > 0) {
          // Fetch all key events for these pages
          const keyEventsByPage = await Promise.all(
            pages.map((p) => db.getKeyEventsForPage(p.id)),
          );

          // Merge all key events from pages in the current run
          eventsToAnalyze = keyEventsByPage.flatMap((pageEvents) =>
            pageEvents.map((ev) => ({
              fromKey: ev.fromKey,
              toKey: ev.toKey,
              latencyMs: ev.latency,
              keyChar: ev.keyChar || undefined,
              holdDurationMs: ev.holdDurationMs,
              isCorrect: ev.isCorrect,
              expectedChar: ev.expectedChar,
            })),
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
