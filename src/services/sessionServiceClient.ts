import { KeyEvent } from "@/lib/skdm";
import { getOrCreateGuestId } from "@/utils/guestUser";

export const sessionServiceClient = {
  /**
   * Starts a page session based on the current time and previous run state.
   */
  async startPage(now: Date): Promise<string> {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Guest-User-Id": getOrCreateGuestId(),
      },
      body: JSON.stringify({
        action: "start",
        now: now.toISOString(),
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || "Failed to start page session");
    }

    const data = await res.json();
    return data.runId;
  },

  /**
   * Finishes a typing session for a specific target text (a Page) and records it.
   */
  async finishPage(
    runId: string,
    targetText: string,
    typedText: string,
    events: KeyEvent[],
    startedAt: number,
    finishedAt: number,
    targetId?: string,
    language?: string,
  ): Promise<string> {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Guest-User-Id": getOrCreateGuestId(),
      },
      body: JSON.stringify({
        action: "finish",
        runId,
        targetText,
        typedText,
        events,
        startedAt,
        finishedAt,
        targetId,
        language,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || "Failed to finish page session");
    }

    const data = await res.json();
    return data.runId;
  },

  /**
   * Sync active session on app mount:
   * If there is an unfinished run, finalize it if idle for more than 3 minutes.
   */
  async syncSessionOnMount(): Promise<void> {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Guest-User-Id": getOrCreateGuestId(),
      },
      body: JSON.stringify({
        action: "sync",
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || "Failed to sync session on mount");
    }
  },
};
export type SessionServiceClient = typeof sessionServiceClient;
