import { create } from "zustand";

import type { KeyEvent } from "@/lib/skdm";
import reference from "@/lib/skdm/__fixtures__/python-reference.json";

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
  loadDummyData: () => void;
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

  loadDummyData: () => {
    const baseEvents = (reference.events as { fromKey: string; selfKey: string; latencyMs: number }[]).map((ev) => ({
      fromKey: ev.fromKey,
      toKey: ev.selfKey,
      latencyMs: ev.latencyMs,
    }));
    
    // Generate extra dummy data to create a rich 3D surface
    const extraEvents: KeyEvent[] = [];
    const keys = "abcdefghijklmnopqrstuvwxyz.,".split("");
    for (let i = 0; i < 2000; i++) {
      const fromKey = keys[Math.floor(Math.random() * keys.length)];
      const toKey = keys[Math.floor(Math.random() * keys.length)];
      // Favor common keys slightly
      const isCommon = "e a s t n o r i".includes(toKey);
      // Generate some latency based on distance (simulated)
      const latencyMs = Math.random() * 200 + (isCommon ? 50 : 150);
      extraEvents.push({ fromKey, toKey, latencyMs });
    }
    
    const dummyEvents = [...baseEvents, ...extraEvents];
    
    const targetText = get().targetText || "The quick brown fox jumps over the lazy dog. Try typing some text to gather SKDM data, then press Tab to analyze the 3D latency surface.";
    
    set({
      typedText: targetText,
      events: dummyEvents,
      status: "done",
      startedAt: performance.now() - 10000,
      finishedAt: performance.now(),
      lastKey: dummyEvents[dummyEvents.length - 1].toKey,
      lastKeyAt: performance.now(),
    });
  },
}));
