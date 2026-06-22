import { StoreSlice, SessionSlice } from "./types";
import { sessionServiceClient as sessionService } from "@/services/sessionServiceClient";

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

  startNewRun: () => {
    set({ currentRunId: null });
  },

  startPage: async (now) => {
    const runId = await sessionService.startPage(now);
    set({ currentRunId: runId });
    return runId;
  },
});
