import { getQwertyChar } from "@/utils/keyboardMap";
import {
  applyFreeformBackspace,
  applyFreeformChar,
  buildFeedbackAlignments,
} from "@/lib/feedback/freeformTyping";
import { useFeedbackStore } from "@/store/useFeedbackStore";
import type { StoreSlice, TypingStore } from "./types";

type InputSet = Parameters<StoreSlice<TypingStore>>[0];
type InputGet = Parameters<StoreSlice<TypingStore>>[1];

export function handleFeedbackModeKeyPress(
  set: InputSet,
  get: InputGet,
  code: string,
  shiftKey: boolean,
): boolean {
  const state = get();
  if (state.mode !== "feedback") {
    return false;
  }

  const { submitStatus } = useFeedbackStore.getState();
  if (submitStatus === "submitting" || submitStatus === "success") {
    return true;
  }

  if (code === "ShiftLeft" || code === "ShiftRight") {
    return true;
  }

  const language = state.targetLanguage === "en" ? "en" : "ko";
  const freeformState = {
    qwertyBuffer: state.qwertyBuffer,
    typedText: state.typedText,
    language,
  } as const;

  if (code === "Enter") {
    const next = applyFreeformChar(freeformState, "\n");
    set({
      qwertyBuffer: next.qwertyBuffer,
      typedText: next.typedText,
      alignments: buildFeedbackAlignments(next.typedText),
    });
    return true;
  }

  if (code === "Space") {
    const next = applyFreeformChar(freeformState, " ");
    set({
      qwertyBuffer: next.qwertyBuffer,
      typedText: next.typedText,
      alignments: buildFeedbackAlignments(next.typedText),
    });
    return true;
  }

  if (code === "Backspace") {
    const next = applyFreeformBackspace(freeformState);
    if (next) {
      set({
        qwertyBuffer: next.qwertyBuffer,
        typedText: next.typedText,
        alignments: buildFeedbackAlignments(next.typedText),
      });
    }
    return true;
  }

  const char = getQwertyChar(code, shiftKey);
  if (char !== null) {
    const next = applyFreeformChar(freeformState, char);
    set({
      qwertyBuffer: next.qwertyBuffer,
      typedText: next.typedText,
      alignments: buildFeedbackAlignments(next.typedText),
    });
  }

  return true;
}
