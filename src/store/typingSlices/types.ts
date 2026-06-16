import { StateCreator } from "zustand";
import type { KeyEvent } from "@/lib/skdm";

export type SessionStatus = "idle" | "running" | "done";

export interface InputSlice {
  targetText: string;
  targetLanguage: string;
  targetId: string;
  typedText: string;
  qwertyBuffer: string;
  setTarget: (target: string | { id: string; content: string; language: string }) => void;
  nextTarget: () => void;
  setTypedText: (value: string) => void;
  handlePhysicalKeyPress: (code: string, shiftKey: boolean, timestamp: number) => void;
}

export interface KeystrokeSlice {
  events: KeyEvent[];
  lastKey: string | null;
  lastKeyAt: number | null;
  pressedKeys: Record<string, number>;
  recordKey: (
    token: string,
    at: number,
    details?: { keyChar: string; isCorrect: boolean; expectedChar: string | null }
  ) => void;
  handlePhysicalKeyRelease: (code: string, timestamp: number) => void;
}

export interface SessionSlice {
  status: SessionStatus;
  startedAt: number | null;
  finishedAt: number | null;
  currentRunId: string | null;
  runInitPromise: Promise<string> | null;
  finish: (timestamp?: number) => void;
  reset: () => void;
  loadDummyData: () => Promise<void>;
  startNewRun: () => void;
  startPage: (now: Date) => Promise<string>;
}

export type TypingStore = InputSlice & KeystrokeSlice & SessionSlice;
export type StoreSlice<T> = StateCreator<TypingStore, [], [], T>;
