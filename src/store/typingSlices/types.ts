import { StateCreator } from "zustand";
import type { KeyEvent } from "@/lib/skdm";
import type { MvsaCache, AlignResult } from "@/utils/mvsa";

export type SessionStatus = "idle" | "running" | "done";
export type TypingMode = "normal" | "subject" | "hardcore" | "plain";

export interface InputSlice {
  // Subject Mode 전용 상태
  isSubjectInputActive: boolean;
  isSubjectLoading: boolean;
  fetchSubjectTarget: (subject: string) => Promise<void>;

  targetText: string;
  targetLanguage: string;
  targetId: string;
  typedText: string;
  maxTypedTextLength: number;
  qwertyBuffer: string;
  mvsaCache: MvsaCache;
  alignments: AlignResult[];
  mode: TypingMode;
  setMode: (mode: TypingMode) => void;
  setTargetLanguage: (lang: string) => void;
  setTarget: (
    target: string | { id: string; content: string; language: string; embedding?: number[] },
  ) => void;
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
    details?: { keyChar: string; isCorrect: boolean; expectedChar: string | null },
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
  saveCurrentPage: () => Promise<void>;
  reset: () => void;
  loadLocalDbData: () => Promise<void>;
  startNewRun: () => void;
  startPage: (now: Date) => Promise<string>;
}

export type TypingStore = InputSlice & KeystrokeSlice & SessionSlice;
export type StoreSlice<T> = StateCreator<TypingStore, [], [], T>;
