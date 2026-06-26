import { StoreSlice, SessionSlice } from "./types";
import { sessionServiceClient as sessionService } from "@/services/sessionServiceClient";
import { saveCurrentPageIfDone } from "./saveIfDone";
import {
  clearPendingPageSave,
  getPendingPageSave,
  setPendingPageSave,
  type PendingPageSave,
} from "./pendingPageSave";

type SessionSet = Parameters<StoreSlice<SessionSlice>>[0];
type SessionGet = Parameters<StoreSlice<SessionSlice>>[1];

async function persistPageSave(
  get: SessionGet,
  set: SessionSet,
  save: PendingPageSave,
): Promise<void> {
  const { runInitPromise } = get();
  if (runInitPromise) {
    await runInitPromise;
  }

  const runId = get().currentRunId;
  if (!runId) {
    throw new Error("runId is not available");
  }

  const newRunId = await sessionService.finishPage(
    runId,
    save.targetText,
    save.typedText,
    save.events,
    save.startedAt,
    save.finishedAt,
    save.targetId,
    save.targetLanguage,
  );

  if (newRunId !== runId) {
    set({ currentRunId: newRunId });
  }
}

function restoreDoneStateFromPending(set: SessionSet, save: PendingPageSave): void {
  set({
    status: "done",
    targetText: save.targetText,
    targetId: save.targetId,
    targetLanguage: save.targetLanguage,
    events: save.events,
    startedAt: save.startedAt,
    finishedAt: save.finishedAt,
    typedText: save.typedText,
  });
}

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

  flushPendingPageSave: async () => {
    const pending = getPendingPageSave();
    if (!pending) {
      return;
    }

    try {
      await persistPageSave(get, set, pending);
      clearPendingPageSave();
    } catch (error) {
      console.error("[session] Pending page save failed:", error);
    }
  },

  saveCurrentPage: async () => {
    await get().flushPendingPageSave();

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
    if (status !== "done" || !startedAt || !finishedAt) {
      return;
    }

    const captured: PendingPageSave = {
      targetText,
      targetId,
      targetLanguage,
      events: [...events],
      startedAt,
      finishedAt,
      typedText,
    };

    set({ status: "idle" });
    setPendingPageSave(captured);

    try {
      await persistPageSave(get, set, captured);
      clearPendingPageSave();
    } catch (error) {
      console.error("[session] Page save failed:", error);
      restoreDoneStateFromPending(set, captured);
    }
  },

  reset: async () => {
    await saveCurrentPageIfDone(get);
    clearPendingPageSave();
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
    }));
  },

  startNewRun: async () => {
    await saveCurrentPageIfDone(get);
    set({ currentRunId: null });
  },

  startPage: async (now) => {
    const runId = await sessionService.startPage(now);
    set({ currentRunId: runId });

    const pending = getPendingPageSave();
    if (pending) {
      void get().flushPendingPageSave();
    }

    return runId;
  },
});
