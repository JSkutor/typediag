import { StateCreator } from "zustand";
import type { KeyEvent } from "@/lib/skdm";
import type { TopicErrorKey } from "@/lib/practice/topicLoading";
import type { PageMetricsFlash } from "@/lib/practice/pageMetricsFlash";
import type { AlignResult } from "@/utils/mvsa";
import type { JasoMvsaCache } from "@/utils/mvsaCore";

export type SessionStatus = "idle" | "running" | "done";
export type TypingMode = "normal" | "topic" | "hardcore" | "feedback";

export interface InputSlice {
  // Topic Mode 전용 상태
  isTopicInputActive: boolean;
  isTopicLoading: boolean;
  isTopicGenerating: boolean; // LLM 문장 생성 중 여부
  isTopicWaitingForGenerate: boolean; // 다음 문장 대기 중 (생성 완료 전)
  topicGenerateError: TopicErrorKey | null;
  currentTopic: string; // 현재 입력된 주제 (생성 API 호출용)
  fetchTopicTarget: (topic: string) => Promise<void>;
  resetTopicToGuideScreen: () => void;
  topicTargets: { id: string; content: string; language: string }[];
  topicTargetIndex: number;

  normalPreviousTarget: { id: string; content: string; language: string } | null;
  fetchInitialNormalTarget: (language?: string) => Promise<void>;

  targetText: string;
  targetLanguage: string;
  targetId: string;
  typedText: string;
  maxTypedTextLength: number;
  qwertyBuffer: string;

  mvsaCache: JasoMvsaCache;
  alignments: AlignResult[];
  mode: TypingMode;
  setMode: (mode: TypingMode) => void | Promise<void>;
  setTargetLanguage: (lang: string) => void | Promise<void>;
  setTarget: (
    target: string | { id: string; content: string; language: string; embedding?: number[] },
  ) => void | Promise<void>;
  nextTarget: () => void | Promise<void>;
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
  pageMetricsFlash: PageMetricsFlash | null;
  finish: (timestamp?: number) => void;
  flushPendingPageSave: () => Promise<void>;
  saveCurrentPage: () => Promise<void>;
  dismissPageMetricsFlash: () => void;
  reset: () => void | Promise<void>;
  startNewRun: () => void | Promise<void>;
  startPage: (now: Date) => Promise<string>;
}

export type TypingStore = InputSlice & KeystrokeSlice & SessionSlice;
export type StoreSlice<T> = StateCreator<TypingStore, [], [], T>;
