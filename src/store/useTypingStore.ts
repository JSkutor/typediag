import { create } from "zustand";

import type { KeyEvent } from "@/lib/skdm";
import reference from "@/lib/skdm/__fixtures__/python-reference.json";
import { getQwertyChar, assembleHangulWithPunctuation } from "@/utils/keyboardMap";

export type SessionStatus = "idle" | "running" | "done";

interface TypingState {
  /** Target text shown to the user. */
  targetText: string;
  /** IME-composed text from the input (for display + accuracy only). */
  typedText: string;
  /** Raw qwerty keys pressed (used to assemble Hangul). */
  qwertyBuffer: string;
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
  /** Process a physical key press from UI (bypassing OS IME) */
  handlePhysicalKeyPress: (code: string, shiftKey: boolean, timestamp: number) => void;
  finish: () => void;
  reset: () => void;
  loadDummyData: () => void;
}

export const useTypingStore = create<TypingState>((set, get) => ({
  targetText: "",
  typedText: "",
  qwertyBuffer: "",
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
      qwertyBuffer: "",
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

  setTypedText: (value) => set({ typedText: value, qwertyBuffer: value }),

  handlePhysicalKeyPress: (code, shiftKey, timestamp) => {
    const state = get();
    if (state.status === "done") return;

    let keyToken = code.toLowerCase().replace("key", "");
    if (code === "Space") keyToken = "space";
    if (code === "Backspace") keyToken = "backspace";

    const isKorean = /[가-힣]/.test(state.targetText);

    if (code === "Backspace") {
      if (state.qwertyBuffer.length > 0) {
        const nextBuffer = state.qwertyBuffer.slice(0, -1);
        const nextTyped = isKorean ? assembleHangulWithPunctuation(nextBuffer) : nextBuffer;
        
        set({ qwertyBuffer: nextBuffer, typedText: nextTyped });
        get().recordKey("backspace", timestamp);
      }
      return;
    }

    const char = getQwertyChar(code, shiftKey);
    if (char !== null) {
      const nextBuffer = state.qwertyBuffer + char;
      const nextTyped = isKorean ? assembleHangulWithPunctuation(nextBuffer) : nextBuffer;
      
      set({ qwertyBuffer: nextBuffer, typedText: nextTyped });
      get().recordKey(keyToken, timestamp);
      
      if (nextTyped.length >= state.targetText.length) {
        get().finish();
      }
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
      qwertyBuffer: "",
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
    
    const extraEvents: KeyEvent[] = [];
    const keys = "abcdefghijklmnopqrstuvwxyz.,".split("");
    for (let i = 0; i < 2000; i++) {
      const fromKey = keys[Math.floor(Math.random() * keys.length)];
      const toKey = keys[Math.floor(Math.random() * keys.length)];
      const isCommon = "e a s t n o r i".includes(toKey);
      const latencyMs = Math.random() * 200 + (isCommon ? 50 : 150);
      extraEvents.push({ fromKey, toKey, latencyMs });
    }
    
    const dummyEvents = [...baseEvents, ...extraEvents];
    const targetText = get().targetText || "The quick brown fox jumps over the lazy dog. Try typing some text to gather SKDM data, then press Tab to analyze the 3D latency surface.";
    
    set({
      typedText: targetText,
      qwertyBuffer: targetText,
      events: dummyEvents,
      status: "done",
      startedAt: performance.now() - 10000,
      finishedAt: performance.now(),
      lastKey: dummyEvents[dummyEvents.length - 1].toKey,
      lastKeyAt: performance.now(),
    });
  },
}));
