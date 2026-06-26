import type { TypingStore } from "./types";

type StoreGet = () => TypingStore;

/** Persists a completed page before any navigation that would discard in-memory state. */
export async function saveCurrentPageIfDone(get: StoreGet): Promise<void> {
  if (get().status === "done") {
    await get().saveCurrentPage();
  }
}
