import type { KeyEvent } from "@/lib/skdm";

export interface PendingPageSave {
  targetText: string;
  targetId: string;
  targetLanguage: string;
  events: KeyEvent[];
  startedAt: number;
  finishedAt: number;
  typedText: string;
}

let pendingPageSave: PendingPageSave | null = null;
let activeSavePromise: Promise<void> | null = null;

export function getPendingPageSave(): PendingPageSave | null {
  return pendingPageSave;
}

export function setPendingPageSave(save: PendingPageSave | null): void {
  pendingPageSave = save;
}

export function clearPendingPageSave(): void {
  pendingPageSave = null;
}

export function getActiveSavePromise(): Promise<void> | null {
  return activeSavePromise;
}

export function setActiveSavePromise(promise: Promise<void> | null): void {
  activeSavePromise = promise;
}
