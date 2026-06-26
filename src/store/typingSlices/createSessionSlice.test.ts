import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTypingStore } from "../useTypingStore";
import { clearPendingPageSave, getPendingPageSave } from "./pendingPageSave";

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

    expect(getPendingPageSave()).not.toBeNull();
    expect(useTypingStore.getState().status).toBe("done");
    expect(useTypingStore.getState().typedText).toBe("he");

    finishSpy.mockResolvedValueOnce("00000000-0000-0000-0000-000000000001");
    await useTypingStore.getState().flushPendingPageSave();

    expect(getPendingPageSave()).toBeNull();
    finishSpy.mockRestore();
  });
});
