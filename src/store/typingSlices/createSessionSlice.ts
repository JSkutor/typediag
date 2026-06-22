import { StoreSlice, SessionSlice } from "./types";
import { sessionServiceClient as sessionService } from "@/services/sessionServiceClient";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { runPipeline, triangulate, buildLayout, type KeyEvent } from "@/lib/skdm";

export const createSessionSlice: StoreSlice<SessionSlice> = (set, get) => ({
  status: "idle",
  startedAt: null,
  finishedAt: null,
  currentRunId: null,
  runInitPromise: null,

  finish: (timestamp) => {
    const { status } = get();
    if (status === "done") return;

    const finishedAt = timestamp ?? Date.now();
    set({ status: "done", finishedAt });
  },

  saveCurrentPage: async () => {
    const {
      status,
      targetText,
      targetId,
      targetLanguage,
      events,
      startedAt,
      finishedAt,
      typedText,
    } = get();
    if (status !== "done" || !startedAt || !finishedAt) return;

    // Prevent duplicate saves by synchronously resetting status
    set({ status: "idle" });

    // Capture variables to prevent race condition when state is reset synchronously
    const capturedTargetText = targetText;
    const capturedTargetId = targetId;
    const capturedTargetLanguage = targetLanguage;
    const capturedEvents = [...events];
    const capturedStartedAt = startedAt;
    const capturedFinishedAt = finishedAt;
    const capturedTypedText = typedText;

    const { runInitPromise } = get();
    if (runInitPromise) {
      await runInitPromise;
    }

    const runId = get().currentRunId;
    if (!runId) return;

    const newRunId = await sessionService.finishPage(
      runId,
      capturedTargetText,
      capturedTypedText,
      capturedEvents,
      capturedStartedAt,
      capturedFinishedAt,
      capturedTargetId,
      capturedTargetLanguage,
    );

    if (newRunId !== runId) {
      set({ currentRunId: newRunId });
    }
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
          "DB에 저장된 페이지 데이터가 없습니다. 먼저 타자 연습을 진행하여 데이터를 생성하세요.",
        );
        return;
      }

      // Merge all key events from all pages via API (only possible if we expose an endpoint, but since this runs in browser we must fetch via our /api/db or another custom route. Wait, local_db.json had them locally, but now we must fetch. Actually, session slice is used for diagnostics transition. For now, since we dropped local_db.json and we are using Server DB, we need an API to fetch all key events, or we can just fetch all pages and their key events.)
      // Since this action is triggered from Dev tools panel, let's fetch events using the newly added logic or via our server.
      // We will leave allEvents empty here and rely on the updated useDiagnosticsTransition which fetches them correctly for the currentRunId. If currentRunId is null, useDiagnosticsTransition won't fetch. We need to handle this properly.
      
      const allEvents: KeyEvent[] = [];
      pages.forEach((p: unknown) => {
        const page = p as Record<string, unknown>;
        if (page.key_events && Array.isArray(page.key_events)) {
          page.key_events.forEach((ev: unknown) => {
            const event = ev as Record<string, unknown>;
            allEvents.push({
              fromKey: (event.from_key as string) || null,
              toKey: (event.to_key as string) || "",
              keyChar: (event.key_char as string) || "",
              latencyMs: (event.latency as number) || 0,
              holdDurationMs: event.hold_duration_ms != null ? (event.hold_duration_ms as number) : null,
              isCorrect: event.is_correct as boolean | null,
              expectedChar: event.expected_char as string | null,
            });
          });
        }
      });


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
