import { create } from "zustand";

import type { KeyEvent } from "@/lib/skdm";
import { generateDummyTypingState } from "@/utils/mockData";
import { getQwertyChar, assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import targets from "@/data/targets.json";

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
  nextTarget: () => void;
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

  nextTarget: () => {
    const currentIndex = targets.findIndex((t) => t.content === get().targetText);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % targets.length;
    get().setTarget(targets[nextIndex].content);
  },

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
    
    if (code === "ArrowRight") {
      get().nextTarget();
      return;
    }

    if (state.status === "done") {
      if (code === "Space" || code === "Enter") {
        get().nextTarget();
      }
      return;
    }

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
    set(generateDummyTypingState(get().targetText));
  },
}));
