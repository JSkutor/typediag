import { create } from "zustand";

import type { KeyEvent } from "@/lib/skdm";

export type SessionStatus = "idle" | "running" | "done";

interface TypingState {
  /** Target text shown to the user. */
  targetText: string;
  /** IME-composed text from the input (for display + accuracy only). */
  typed: string;
  /** Raw physical key transitions feeding the SKDM model. */
  events: KeyEvent[];
  status: SessionStatus;
  startedAt: number | null;
  finishedAt: number | null;

  // --- internal capture cursor ---
  lastKey: string | null;
  lastKeyAt: number | null;

  setTarget: (text: string) => void;
  /** Record one physical key press (already normalized) at time `at` (ms). */
  recordKey: (token: string, at: number) => void;
  /** Sync the IME-composed input value (display + accuracy). */
  setTyped: (value: string) => void;
  finish: () => void;
  reset: () => void;
}

export const useTypingStore = create<TypingState>((set, get) => ({
  targetText: "",
  typed: "",
  events: [],
  status: "idle",
  startedAt: null,
  finishedAt: null,
  lastKey: null,
  lastKeyAt: null,

  setTarget: (text) =>
    set({
      targetText: text,
      typed: "",
      events: [],
      status: "idle",
      startedAt: null,
      finishedAt: null,
      lastKey: null,
      lastKeyAt: null,
    }),

  recordKey: (token, at) => {
    const { lastKey, lastKeyAt, status } = get();

    set((state) => {
      const next: Partial<TypingState> = {
        lastKey: token,
        lastKeyAt: at,
      };
      if (status === "idle") {
        next.status = "running";
        next.startedAt = at;
      }
      // Record the transition from the previous physical key to this one.
      if (lastKey !== null && lastKeyAt !== null) {
        const event: KeyEvent = {
          fromKey: lastKey,
          selfKey: token,
          latencyMs: at - lastKeyAt,
        };
        next.events = [...state.events, event];
      }
      return next;
    });
  },

  setTyped: (value) => set({ typed: value }),

  finish: () =>
    set((state) =>
      state.status === "done"
        ? state
        : { status: "done", finishedAt: performance.now() },
    ),

  reset: () =>
    set((state) => ({
      typed: "",
      events: [],
      status: "idle",
      startedAt: null,
      finishedAt: null,
      lastKey: null,
      lastKeyAt: null,
      targetText: state.targetText,
    })),
}));
