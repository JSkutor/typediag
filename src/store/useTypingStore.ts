import { create } from "zustand";

import type { KeyEvent } from "@/lib/skdm";
import { generateDummyTypingState, populateDummyDatabase } from "@/utils/mockData";
import { getQwertyChar, assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import { evaluateKeystroke } from "@/utils/typingEvaluator";
import { db } from "@/utils/db";
import { calculateMetrics, calculateLatencyAfterGap } from "@/lib/practice/metrics";
import targets from "@/data/targets.json";
import { sessionService } from "@/services/sessionService";

export type SessionStatus = "idle" | "running" | "done";

export function getKeyToken(code: string): string {
  let token = code.toLowerCase().replace("key", "");
  if (code === "Space") token = "space";
  if (code === "Backspace") token = "backspace";
  if (code === "ShiftLeft") token = "shift_l";
  if (code === "ShiftRight") token = "shift_r";
  if (code === "Enter") token = "enter";
  return token;
}

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
  currentRunId: string | null;
  runInitPromise: Promise<string> | null;

  // --- internal capture cursor ---
  lastKey: string | null;
  lastKeyAt: number | null;

  // --- key hold duration tracking ---
  pressedKeys: Record<string, number>;

  setTarget: (text: string) => void;
  nextTarget: () => void;
  /** Record one physical key press (already normalized) at time `at` (ms). */
  recordKey: (
    token: string,
    at: number,
    details?: { keyChar: string; isCorrect: boolean; expectedChar: string | null }
  ) => void;
  setTypedText: (value: string) => void;
  /** Process a physical key press from UI (bypassing OS IME) */
  handlePhysicalKeyPress: (code: string, shiftKey: boolean, timestamp: number) => void;
  /** Process a physical key release from UI */
  handlePhysicalKeyRelease: (code: string, timestamp: number) => void;
  finish: (timestamp?: number) => void;
  reset: () => void;
  loadDummyData: () => Promise<void>;
  startNewRun: () => void;
  initializeRun: (now: Date) => Promise<string>;
}

export const useTypingStore = create<TypingState>((set, get) => ({
  targetText: "",
  typedText: "",
  qwertyBuffer: "",
  events: [],
  status: "idle",
  startedAt: null,
  finishedAt: null,
  currentRunId: null,
  runInitPromise: null,
  lastKey: null,
  lastKeyAt: null,
  pressedKeys: {},

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
      runInitPromise: null,
      pressedKeys: {},
    }),

  nextTarget: () => {
    const currentIndex = targets.findIndex((t) => t.content === get().targetText);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % targets.length;
    get().setTarget(targets[nextIndex].content);
  },

  recordKey: (token, at, details) => {
    const { lastKey, lastKeyAt, status } = get();

    let runPromise = null;
    if (status === "idle") {
      runPromise = get().initializeRun(new Date(at));
    }

    set((state) => {
      const next: Partial<TypingState> = {
        lastKey: token,
        lastKeyAt: at,
      };
      if (status === "idle") {
        next.status = "running";
        next.startedAt = at;
        next.runInitPromise = runPromise;
      }
      
      if (lastKey === null || lastKeyAt === null) {
        const event: KeyEvent = {
          fromKey: null,
          toKey: token,
          latencyMs: 0,
          keyChar: details?.keyChar || "",
          holdDurationMs: null,
          isCorrect: details?.isCorrect ?? true,
          expectedChar: details?.expectedChar ?? null,
        };
        next.events = [...state.events, event];
      } else {
        const event: KeyEvent = {
          fromKey: lastKey,
          toKey: token,
          latencyMs: at - lastKeyAt,
          keyChar: details?.keyChar || "",
          holdDurationMs: null,
          isCorrect: details?.isCorrect ?? true,
          expectedChar: details?.expectedChar ?? null,
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
      const currentIndex = targets.findIndex((t) => t.content === get().targetText);
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % targets.length;
      set({
        targetText: targets[nextIndex].content,
        typedText: "",
        qwertyBuffer: "",
        events: [],
        status: "idle",
        startedAt: null,
        finishedAt: null,
        lastKey: null,
        lastKeyAt: null,
        pressedKeys: {},
      });
      return;
    }

    if (code === "ArrowLeft") {
      const currentIndex = targets.findIndex((t) => t.content === get().targetText);
      const prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + targets.length) % targets.length;
      set({
        targetText: targets[prevIndex].content,
        typedText: "",
        qwertyBuffer: "",
        events: [],
        status: "idle",
        startedAt: null,
        finishedAt: null,
        lastKey: null,
        lastKeyAt: null,
        pressedKeys: {},
      });
      return;
    }

    if (state.status === "done") {
      if (code === "Space" || code === "Enter") {
        get().nextTarget();
      }
      return;
    }

    if (state.pressedKeys[code] === undefined) {
      set((state) => ({
        pressedKeys: {
          ...state.pressedKeys,
          [code]: timestamp,
        }
      }));
    }

    const keyToken = getKeyToken(code);
    const isKorean = /[가-힣]/.test(state.targetText);

    if (code === "ShiftLeft" || code === "ShiftRight") {
      const evalResult = evaluateKeystroke(code, shiftKey, state.qwertyBuffer, state.targetText, isKorean);
      get().recordKey(keyToken, timestamp, evalResult);
      return;
    }

    if (code === "Enter") {
      const evalResult = evaluateKeystroke(code, shiftKey, state.qwertyBuffer, state.targetText, isKorean);
      get().recordKey(keyToken, timestamp, evalResult);
      return;
    }

    if (code === "Backspace") {
      if (state.qwertyBuffer.length > 0) {
        // Evaluate backspace before changing qwertyBuffer
        const evalResult = evaluateKeystroke(code, shiftKey, state.qwertyBuffer, state.targetText, isKorean);
        
        const nextBuffer = state.qwertyBuffer.slice(0, -1);
        const nextTyped = isKorean ? assembleHangulWithPunctuation(nextBuffer) : nextBuffer;
        
        set({ qwertyBuffer: nextBuffer, typedText: nextTyped });
        get().recordKey("backspace", timestamp, evalResult);
      }
      return;
    }

    const char = getQwertyChar(code, shiftKey);
    if (char !== null) {
      // Evaluate character before updating qwertyBuffer
      const evalResult = evaluateKeystroke(code, shiftKey, state.qwertyBuffer, state.targetText, isKorean);

      const nextBuffer = state.qwertyBuffer + char;
      const nextTyped = isKorean ? assembleHangulWithPunctuation(nextBuffer) : nextBuffer;
      
      set({ qwertyBuffer: nextBuffer, typedText: nextTyped });
      get().recordKey(keyToken, timestamp, evalResult);
      
      if (nextTyped.length >= state.targetText.length) {
        get().finish(timestamp);
      }
    }
  },

  handlePhysicalKeyRelease: (code, timestamp) => {
    const { pressedKeys, events } = get();
    const pressTime = pressedKeys[code];
    if (pressTime === undefined) return;

    const duration = timestamp - pressTime;
    const token = getKeyToken(code);

    set((state) => {
      const nextEvents = [...state.events];
      const nextPressedKeys = { ...state.pressedKeys };
      delete nextPressedKeys[code];

      // If the released key is a Shift key and was tapped standalone (it's the last event in the list)
      if ((token === "shift_l" || token === "shift_r") && nextEvents.length > 0 && nextEvents[nextEvents.length - 1].toKey === token) {
        nextEvents.pop(); // remove the standalone shift event

        if (nextEvents.length === 0) {
          return {
            events: [],
            pressedKeys: nextPressedKeys,
            status: "idle",
            startedAt: null,
            lastKey: null,
            lastKeyAt: null,
          };
        } else {
          const newLastEvent = nextEvents[nextEvents.length - 1];
          let absoluteTimestamp = state.startedAt || 0;
          for (let i = 1; i < nextEvents.length; i++) {
            absoluteTimestamp += nextEvents[i].latencyMs;
          }
          return {
            events: nextEvents,
            pressedKeys: nextPressedKeys,
            lastKey: newLastEvent.toKey,
            lastKeyAt: absoluteTimestamp,
          };
        }
      }

      for (let i = nextEvents.length - 1; i >= 0; i--) {
        if (nextEvents[i].toKey === token) {
          nextEvents[i] = {
            ...nextEvents[i],
            holdDurationMs: Math.round(duration),
          };
          break;
        }
      }

      return {
        events: nextEvents,
        pressedKeys: nextPressedKeys,
      };
    });
  },

  finish: (timestamp) => {
    const { status, targetText, events, startedAt, typedText, currentRunId } = get();
    if (status === "done") return;

    const finishedAt = timestamp ?? Date.now();
    set({ status: "done", finishedAt });

    (async () => {
      const { runInitPromise } = get();
      if (runInitPromise) {
        await runInitPromise;
      }
      
      let runId = get().currentRunId;
      if (!runId || !startedAt) return;

      const newRunId = await sessionService.finishPage(
        runId,
        targetText,
        typedText,
        events,
        startedAt,
        finishedAt
      );

      if (newRunId !== runId) {
        set({ currentRunId: newRunId });
      }
    })();
  },

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
      currentRunId: null, // Resetting explicitly starts a new run
      pressedKeys: {},
    })),

  loadDummyData: async () => {
    const targetText = get().targetText || (targets.length > 0 ? targets[0].content : "");
    const stateUpdate = generateDummyTypingState(targetText);
    
    const runId = `run_dummy_${Date.now()}`;
    set({
      ...stateUpdate,
      currentRunId: runId,
    });

    try {
      await populateDummyDatabase(runId, stateUpdate.events, targetText);
    } catch (err) {
      console.error("Failed to populate dummy database:", err);
    }
  },

  startNewRun: () => {
    set({ currentRunId: null });
  },

  initializeRun: async (now) => {
    const runId = await sessionService.initializeRun(now);
    set({ currentRunId: runId });
    return runId;
  },
}));

