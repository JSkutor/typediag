import { StoreSlice, SessionSlice } from "./types";
import { sessionService } from "@/services/sessionService";
import { generateDummyTypingState, populateDummyDatabase } from "@/utils/mockData";
import targets from "@/data/targets.json";

export const createSessionSlice: StoreSlice<SessionSlice> = (set, get) => ({
  status: "idle",
  startedAt: null,
  finishedAt: null,
  currentRunId: null,
  runInitPromise: null,

  finish: (timestamp) => {
    const { status, targetText, targetId, targetLanguage, events, startedAt, typedText, currentRunId } = get();
    if (status === "done") return;

    const finishedAt = timestamp ?? Date.now();
    set({ status: "done", finishedAt });

    (async () => {
      const { runInitPromise } = get();
      if (runInitPromise) {
        await runInitPromise;
      }
      
      let runId = get().currentRunId;
      if (!runId || !startedAt) return;

      const newRunId = await sessionService.finishPage(
        runId,
        targetText,
        typedText,
        events,
        startedAt,
        finishedAt,
        targetId,
        targetLanguage
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

  loadDummyData: async () => {
    const targetText = get().targetText || (targets.length > 0 ? targets[0].content : "");
    const stateUpdate = generateDummyTypingState(targetText);
    
    const runId = `run_dummy_${Date.now()}`;
    set({
      ...stateUpdate,
      currentRunId: runId,
    });

    try {
      await populateDummyDatabase(runId, stateUpdate.events, targetText);
    } catch (err) {
      console.error("Failed to populate dummy database:", err);
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
