import { StoreSlice, SessionSlice } from "./types";
import { sessionService } from "@/services/sessionService";
import type { PageRow, KeyEventSchema } from "@/utils/db";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { runPipeline, triangulate, buildLayout } from "@/lib/skdm";

export const createSessionSlice: StoreSlice<SessionSlice> = (set, get) => ({
  status: "idle",
  startedAt: null,
  finishedAt: null,
  currentRunId: null,
  runInitPromise: null,

  finish: (timestamp) => {
    const { status, targetText, targetId, targetLanguage, events, startedAt, typedText } = get();
    if (status === "done") return;

    const finishedAt = timestamp ?? Date.now();
    set({ status: "done", finishedAt });

    (async () => {
      const { runInitPromise } = get();
      if (runInitPromise) {
        await runInitPromise;
      }

      const runId = get().currentRunId;
      if (!runId || !startedAt) return;

      const newRunId = await sessionService.finishPage(
        runId,
        targetText,
        typedText,
        events,
        startedAt,
        finishedAt,
        targetId,
        targetLanguage,
      );

      if (newRunId !== runId) {
        set({ currentRunId: newRunId });
      }
    })();
  },

  reset: () =>
    set((state) => ({
      typedText: "",
      qwertyBuffer: "",
      events: [],
      status: "idle",
      startedAt: null,
      finishedAt: null,
      lastKey: null,
      lastKeyAt: null,
      targetText: state.targetText,
      targetLanguage: state.targetLanguage,
      targetId: state.targetId,
      currentRunId: null,
      pressedKeys: {},
    })),

  loadLocalDbData: async () => {
    try {
      const res = await fetch("/api/db");
      if (!res.ok) {
        throw new Error("Failed to fetch local database data");
      }
      const data = await res.json();
      const pages = data.pages || [];

      if (pages.length === 0) {
        alert(
          "local_db.json에 저장된 페이지 데이터가 없습니다. 먼저 타자 연습을 진행하여 데이터를 생성하세요.",
        );
        return;
      }

      // Merge all key events from all pages in local_db.json
      const allEvents = pages.flatMap((page: PageRow) =>
        page.key_events.map((ev: KeyEventSchema) => ({
          fromKey: ev.from_key,
          toKey: ev.to_key,
          keyChar: ev.key_char,
          latencyMs: ev.latency,
          holdDurationMs: ev.hold_duration_ms,
          isCorrect: ev.is_correct,
          expectedChar: ev.expected_char,
        })),
      );

      set({
        status: "done",
        currentRunId: null, // set to null so diagnostics will fall back to using the store's events array
        events: allEvents,
        typedText: "local_db.json 전체 데이터",
        targetText: "local_db.json 전체 데이터",
        startedAt: Date.now() - 1000,
        finishedAt: Date.now(),
        lastKey: allEvents.length > 0 ? allEvents[allEvents.length - 1].toKey : null,
        lastKeyAt: Date.now(),
      });

      // Recalculate pipeline results immediately for allEvents
      const layout = buildLayout();
      const results = runPipeline(allEvents, layout);
      const { triangles } = triangulate(results);

      // Apply keyStats and transitions directly to workspace store
      useWorkspaceStore.getState().setAnalysisData(results, triangles, allEvents);
      useWorkspaceStore.getState().setUiState("diagnostics");
      useWorkspaceStore.getState().setDiagnosticMode("surface");

      alert(
        `local_db.json의 전체 데이터(총 ${pages.length}개 페이지, ${allEvents.length}개 키 입력)를 성공적으로 적용하고 진단 화면으로 전환했습니다.`,
      );
    } catch (err) {
      console.error("Failed to load local DB data:", err);
      alert("local_db.json 데이터를 불러오는 데 실패했습니다.");
    }
  },

  startNewRun: () => {
    set({ currentRunId: null });
  },

  startPage: async (now) => {
    const runId = await sessionService.startPage(now);
    set({ currentRunId: runId });
    return runId;
  },
});
