import { create } from "zustand";

import type { KeyEvent } from "@/lib/skdm";
import { generateDummyTypingState, populateDummyDatabase } from "@/utils/mockData";
import { getQwertyChar, assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import { evaluateKeystroke } from "@/utils/typingEvaluator";
import { db } from "@/utils/db";
import { calculateMetrics, calculateLatencyAfterGap } from "@/lib/practice/metrics";
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
  currentRunId: string | null;
  runInitPromise: Promise<string> | null;

  // --- internal capture cursor ---
  lastKey: string | null;
  lastKeyAt: number | null;

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
          holdDurationMs: 50,
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
          holdDurationMs: 50,
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
      });
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
    if (code === "ShiftLeft") keyToken = "shift_l";
    if (code === "ShiftRight") keyToken = "shift_r";
    if (code === "Enter") keyToken = "enter";

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

  finish: (timestamp) => {
    const { status, targetText, events, startedAt, typedText, currentRunId } = get();
    if (status === "done") return;

    const finishedAt = timestamp ?? Date.now();
    set({ status: "done", finishedAt });

    // Save typing result (Page) to the local database asynchronously
    (async () => {
      const { runInitPromise } = get();
      if (runInitPromise) {
        await runInitPromise;
      }
      
      let runId = get().currentRunId;
      if (!runId) return;

      const isKorean = /[가-힣]/.test(targetText);
      const targetTextObj = targets.find((t) => t.content === targetText);
      const targetTextId = targetTextObj ? targetTextObj.id : "unknown";
      const language = targetTextObj ? targetTextObj.language : (isKorean ? "ko" : "en");

      const rawElapsedTime = startedAt ? (finishedAt - startedAt) : 0;
      let pageStartedAtStr = new Date(startedAt || Date.now()).toISOString();
      const pageFinishedAtStr = new Date(finishedAt).toISOString();

      if (rawElapsedTime >= 10 * 60 * 1000) {
        // 10분 이상 지연된 경우 -> 세션(Run) 분리
        const existingPages = await db.getPagesForRun(runId);
        const lastPage = existingPages[existingPages.length - 1];
        const prevRun = await db.getRun(runId);
        const finalizeTimeStr = lastPage ? lastPage.finished_at : (prevRun ? prevRun.started_at : new Date().toISOString());
        await db.finalizeRun(runId, finalizeTimeStr);

        // 5분(300,000ms) 이상의 긴 공백 이후의 실타건 latency 합 계산
        const activeTimeAfterGap = calculateLatencyAfterGap(events, 5 * 60 * 1000);
        const correctedStartTimestamp = finishedAt - activeTimeAfterGap;
        pageStartedAtStr = new Date(correctedStartTimestamp).toISOString();

        const nextRunId = `run_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
        await db.createRun({
          id: nextRunId,
          user_id: "user_001",
          status: "in_progress",
          started_at: pageStartedAtStr,
        });

        runId = nextRunId;
        set({ currentRunId: runId });
      }

      // metrics 모듈을 사용하여 보정된 WPM/CPM, 정확도 계산
      const metrics = calculateMetrics(events, 3000);

      const existingPages = await db.getPagesForRun(runId);
      const order_index = existingPages.length;

      const key_events = events.map((e) => ({
        from_key: e.fromKey,
        to_key: e.toKey,
        key_char: e.keyChar || "",
        latency: e.latencyMs,
        hold_duration_ms: e.holdDurationMs ?? 50,
        is_correct: e.isCorrect ?? true,
        expected_char: e.expectedChar ?? null,
      }));

      await db.createPage({
        id: `page_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
        run_id: runId,
        target_text_id: targetTextId,
        order_index,
        language,
        typed_text: typedText,
        wpm: metrics.wpm,
        cpm: metrics.cpm,
        accuracy: metrics.accuracy,
        started_at: pageStartedAtStr,
        finished_at: pageFinishedAtStr,
        elapsed_time_ms: metrics.elapsed_time_ms,
        key_events,
      });
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
    const latestRun = await db.getLatestRun();
    let runId = "";
    
    if (latestRun && latestRun.status === "pending") {
      await db.updateRun(latestRun.id, {
        status: "in_progress",
        started_at: now.toISOString(),
      });
      runId = latestRun.id;
    } else if (latestRun && latestRun.status === "in_progress") {
      const pages = await db.getPagesForRun(latestRun.id);
      const lastActiveStr = pages.length > 0 ? pages[pages.length - 1].finished_at : latestRun.started_at;
      const lastActiveAt = new Date(lastActiveStr).getTime();
      
      if (now.getTime() - lastActiveAt > 5 * 60 * 1000) {
        // 5분 이상 지나면 이전 세션을 마감하고 새 세션을 엽니다.
        await db.finalizeRun(latestRun.id, lastActiveStr);
        const newRun = await db.createRun({
          id: `run_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
          user_id: "user_001",
          status: "pending",
          started_at: now.toISOString(),
        });
        await db.updateRun(newRun.id, {
          status: "in_progress",
          started_at: now.toISOString(),
        });
        runId = newRun.id;
      } else {
        runId = latestRun.id;
      }
    } else {
      const newRun = await db.createRun({
        id: `run_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
        user_id: "user_001",
        status: "pending",
        started_at: now.toISOString(),
      });
      await db.updateRun(newRun.id, {
        status: "in_progress",
        started_at: now.toISOString(),
      });
      runId = newRun.id;
    }
    
    set({ currentRunId: runId });
    return runId;
  },
}));

