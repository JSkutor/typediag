import posthog from "posthog-js";
import { calculateMetrics } from "@/lib/practice/metrics";
import { StoreSlice, SessionSlice } from "./types";
import { sessionServiceClient as sessionService } from "@/services/sessionServiceClient";
import { saveCurrentPageIfDone } from "./saveIfDone";
import {
  clearPendingPageSave,
  getPendingPageSave,
  setPendingPageSave,
  getActiveSavePromise,
  setActiveSavePromise,
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

  const result = await sessionService.finishPage(
    runId,
    save.targetText,
    save.typedText,
    save.events,
    save.startedAt,
    save.finishedAt,
    save.targetId,
    save.targetLanguage,
  );

  if (result.runId !== runId) {
    set({ currentRunId: result.runId });
  }

  posthog.capture("typing_page_completed", {
    cpm: result.cpm,
    wpm: result.wpm,
    accuracy: result.accuracy,
    target_language: save.targetLanguage,
  });
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
  pageMetricsFlash: null,

  finish: (timestamp) => {
    const { status } = get();
    if (status === "done") return;

    const finishedAt = timestamp ?? Date.now();
    set({ status: "done", finishedAt });
  },

  flushPendingPageSave: async () => {
    const activePromise = getActiveSavePromise();
    if (activePromise) {
      try {
        await activePromise;
      } catch (error) {
        // already handled where created
      }
    }

    const pending = getPendingPageSave();
    if (!pending) {
      return;
    }

    const savePromise = (async () => {
      try {
        await persistPageSave(get, set, pending);
        clearPendingPageSave();
      } catch (error) {
        console.error("[session] Pending page save failed:", error);
      }
    })();
    savePromise.finally(() => {
      if (getActiveSavePromise() === savePromise) {
        setActiveSavePromise(null);
      }
    });
    setActiveSavePromise(savePromise);
    await savePromise;
  },

  dismissPageMetricsFlash: () => {
    set({ pageMetricsFlash: null });
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

    const metrics = calculateMetrics(captured.events, {
      targetText: captured.targetText,
      language: captured.targetLanguage,
    });

    set({
      status: "idle",
      pageMetricsFlash: {
        cpm: metrics.cpm,
        wpm: metrics.wpm,
        accuracy: metrics.accuracy,
      },
    });
    setPendingPageSave(captured);

    const savePromise = (async () => {
      try {
        await persistPageSave(get, set, captured);
        clearPendingPageSave();
      } catch (error) {
        console.error("[session] Page save failed:", error);
        restoreDoneStateFromPending(set, captured);
      }
    })();
    savePromise.finally(() => {
      if (getActiveSavePromise() === savePromise) {
        setActiveSavePromise(null);
      }
    });
    setActiveSavePromise(savePromise);
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
