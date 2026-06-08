import { create } from "zustand";

import type { KeyEvent } from "@/lib/skdm";

export type SessionStatus = "idle" | "running" | "done";

interface TypingState {
  /** Target text shown to the user. */
  targetText: string;
  /** IME-composed text from the input (for display + accuracy only). */
  typedText: string;
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
  setTypedText: (value: string) => void;
  /** Process a logical key press from UI (for building text and recording) */
  handleKeyPress: (key: string, timestamp: number) => void;
  finish: () => void;
  reset: () => void;
}

export const useTypingStore = create<TypingState>((set, get) => ({
  targetText: "",
  typedText: "",
  events: [],
  status: "idle",
  startedAt: null,
  finishedAt: null,
  lastKey: null,
  lastKeyAt: null,

  setTarget: (text) =>
    set({
      targetText: text,
      typedText: "",
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
          toKey: token,
          latencyMs: at - lastKeyAt,
        };
        next.events = [...state.events, event];
      }
      return next;
    });
  },

  setTypedText: (value) => set({ typedText: value }),

  handleKeyPress: (key, timestamp) => {
    let keyToken = key.toLowerCase();
    if (keyToken === " ") keyToken = "space";
    
    const isModifier = ["backspace", "enter", "shift", "space"].includes(keyToken);
    
    if (key.length === 1 || isModifier) {
      const state = get();
      const currentTyped = state.typedText;
      let nextTyped = currentTyped;
      
      if (keyToken === "backspace") {
        nextTyped = currentTyped.slice(0, -1);
      } else if (key.length === 1) {
        nextTyped = currentTyped + key;
      }
      
      if (nextTyped !== currentTyped) {
        set({ typedText: nextTyped });
        
        if (nextTyped.length >= state.targetText.length) {
          get().finish();
        }
      }
      
      get().recordKey(keyToken, timestamp);
    }
  },

  finish: () =>
    set((state) =>
      state.status === "done"
        ? state
        : { status: "done", finishedAt: performance.now() },
    ),

  reset: () =>
    set((state) => ({
      typedText: "",
      events: [],
      status: "idle",
      startedAt: null,
      finishedAt: null,
      lastKey: null,
      lastKeyAt: null,
      targetText: state.targetText,
    })),
}));
