import { StoreSlice, KeystrokeSlice } from "./types";
import { getKeyToken } from "./utils";
import type { KeyEvent } from "@/lib/skdm";

export const createKeystrokeSlice: StoreSlice<KeystrokeSlice> = (set, get) => ({
  events: [],
  lastKey: null,
  lastKeyAt: null,
  pressedKeys: {},

  recordKey: (token, at, details) => {
    const { lastKey, lastKeyAt, status } = get();

    let runPromise = null;
    if (status === "idle") {
      const getPerfNow = () => {
        if (typeof performance !== "undefined" && typeof performance.now === "function") {
          return performance.now();
        }
        return Date.now();
      };
      const isRelative = at < 1e11;
      const realStartTime = isRelative
        ? new Date(Date.now() - getPerfNow() + at)
        : new Date(at);
      runPromise = get().startPage(realStartTime);
    }

    set((state) => {
      const next: Partial<any> = {
        lastKey: token,
        lastKeyAt: at,
      };
      
      if (state.status === "idle") {
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

      if ((token === "shift_l" || token === "shift_r") && nextEvents.length > 0 && nextEvents[nextEvents.length - 1].toKey === token) {
        nextEvents.pop(); 

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
});
