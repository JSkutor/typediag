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

export function getPendingPageSave(): PendingPageSave | null {
  return pendingPageSave;
}

export function setPendingPageSave(save: PendingPageSave | null): void {
  pendingPageSave = save;
}

export function clearPendingPageSave(): void {
  pendingPageSave = null;
}
