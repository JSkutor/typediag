import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTypingStore } from "../useTypingStore";
import { clearPendingPageSave, getPendingPageSave, getActiveSavePromise } from "./pendingPageSave";

describe("saveCurrentPage retry", () => {
  beforeEach(() => {
    clearPendingPageSave();
    useTypingStore.setState({
      targetText: "he",
      targetLanguage: "en",
      targetId: "target_test",
      typedText: "he",
      events: [],
      status: "done",
      startedAt: 1000,
      finishedAt: 2000,
      currentRunId: "00000000-0000-0000-0000-000000000001",
    });
  });

  it("keeps pending payload and restores done status when save fails", async () => {
    const finishSpy = vi.spyOn(
      (await import("@/services/sessionServiceClient")).sessionServiceClient,
      "finishPage",
    );
    finishSpy.mockRejectedValueOnce(new Error("network down"));

    await useTypingStore.getState().saveCurrentPage();
    const savePromise = getActiveSavePromise();
    if (savePromise) await savePromise;

    expect(getPendingPageSave()).not.toBeNull();
    expect(useTypingStore.getState().status).toBe("done");
    expect(useTypingStore.getState().typedText).toBe("he");

    finishSpy.mockResolvedValueOnce({
      runId: "00000000-0000-0000-0000-000000000001",
      cpm: 420,
      wpm: 84,
      accuracy: 100,
    });
    await useTypingStore.getState().flushPendingPageSave();

    expect(getPendingPageSave()).toBeNull();
    expect(useTypingStore.getState().pageMetricsFlash).toEqual({
      cpm: 0,
      wpm: 0,
      accuracy: 100,
    });
    finishSpy.mockRestore();
  });

  it("sets pageMetricsFlash when save succeeds", async () => {
    const finishSpy = vi.spyOn(
      (await import("@/services/sessionServiceClient")).sessionServiceClient,
      "finishPage",
    );
    finishSpy.mockResolvedValueOnce({
      runId: "00000000-0000-0000-0000-000000000001",
      cpm: 312,
      wpm: 62,
      accuracy: 100,
    });

    await useTypingStore.getState().saveCurrentPage();
    const savePromise = getActiveSavePromise();
    if (savePromise) await savePromise;

    expect(useTypingStore.getState().pageMetricsFlash).toEqual({
      cpm: 0,
      wpm: 0,
      accuracy: 100,
    });
    finishSpy.mockRestore();
  });
});
