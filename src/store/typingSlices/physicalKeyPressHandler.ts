import { getQwertyChar, assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import { evaluateKeystroke } from "@/utils/typingEvaluator";
import { getKeyToken } from "./utils";
import { runMvsa, getCharQwertyIndices } from "@/utils/mvsa";
import { JasoSequenceAligner } from "@/utils/mvsaCore";
import type { StoreSlice, TypingStore } from "./types";
import type { createNormalModeActions } from "./createNormalModeSlice";
import type { createTopicTopicActions } from "./createTopicSlice";
import { handleFeedbackModeKeyPress } from "./feedbackModeKeyPress";

type InputSet = Parameters<StoreSlice<TypingStore>>[0];
type InputGet = Parameters<StoreSlice<TypingStore>>[1];
type NormalActions = ReturnType<typeof createNormalModeActions>;
type TopicActions = ReturnType<typeof createTopicTopicActions>;

export function createPhysicalKeyPressHandler(
  set: InputSet,
  get: InputGet,
  topicActions: TopicActions,
  normalActions: NormalActions,
): TypingStore["handlePhysicalKeyPress"] {
  return (code, shiftKey, timestamp) => {
    const state = get();

    if (topicActions.handleTopicInputKeyPress(code, shiftKey)) {
      return;
    }

    if (handleFeedbackModeKeyPress(set, get, code, shiftKey)) {
      return;
    }

    if (code === "ArrowRight") {
      void get().nextTarget();
      return;
    }

    if (code === "ArrowLeft") {
      if (state.mode === "normal") {
        void normalActions.normalPrevTarget();
      } else if (state.mode === "topic") {
        void (async () => {
          if (!(await topicActions.topicPrevTarget())) {
            await get().nextTarget();
          }
        })();
      } else {
        void get().nextTarget();
      }
      return;
    }

    if (state.status === "done") {
      if (code === "Backspace") {
        set({ status: "running", finishedAt: null });
      } else {
        if (code === "Space" || code === "Enter") {
          void get().nextTarget();
        }
        return;
      }
    }

    if (state.pressedKeys[code] === undefined) {
      set((current) => ({
        pressedKeys: {
          ...current.pressedKeys,
          [code]: timestamp,
        },
      }));
    }

    const keyToken = getKeyToken(code);
    const isKorean =
      state.targetLanguage === "ko" ||
      (state.targetLanguage === "en" && /[가-힣]/.test(state.targetText));

    if (code === "ShiftLeft" || code === "ShiftRight" || code === "Enter") {
      const evalResult = evaluateKeystroke(
        code,
        shiftKey,
        state.qwertyBuffer,
        state.targetText,
        isKorean,
      );
      get().recordKey(keyToken, timestamp, evalResult);
      return;
    }

    if (code === "Backspace") {
      if (state.qwertyBuffer.length > 0) {
        const evalResult = evaluateKeystroke(
          code,
          shiftKey,
          state.qwertyBuffer,
          state.targetText,
          isKorean,
        );

        let nextBuffer = "";
        if (isKorean) {
          const alignments = state.alignments;
          const lastInputIndex = alignments.findLastIndex((d) => d.inputIndex !== undefined);

          let shouldDeleteCharByChar = false;
          if (lastInputIndex !== -1) {
            const lastOp = alignments[lastInputIndex].op;
            const isGoingBackwards = state.typedText.length < state.maxTypedTextLength;
            const isCompleteVisualChar = lastOp !== "PARTIAL" && lastOp !== "PENDING";

            shouldDeleteCharByChar = isGoingBackwards && isCompleteVisualChar;
          }

          if (shouldDeleteCharByChar) {
            const qEnds = getCharQwertyIndices(state.qwertyBuffer);
            if (qEnds.length > 1) {
              const prevEnd = qEnds[qEnds.length - 2];
              nextBuffer = state.qwertyBuffer.slice(0, prevEnd + 1);
            } else {
              nextBuffer = "";
            }
          } else {
            nextBuffer = state.qwertyBuffer.slice(0, -1);
          }
        } else {
          nextBuffer = state.qwertyBuffer.slice(0, -1);
        }

        const nextTyped = isKorean ? assembleHangulWithPunctuation(nextBuffer) : nextBuffer;
        const nextAlignments = runMvsa(state.targetText, nextBuffer, isKorean, state.mvsaCache);

        set({
          targetText: state.targetText,
          qwertyBuffer: nextBuffer,
          typedText: nextTyped,
          alignments: nextAlignments,
        });
        get().recordKey("backspace", timestamp, evalResult);
      }
      return;
    }

    const char = getQwertyChar(code, shiftKey);
    if (char !== null) {
      const baseEval = evaluateKeystroke(
        code,
        shiftKey,
        state.qwertyBuffer,
        state.targetText,
        isKorean,
      );
      const nextBuffer = state.qwertyBuffer + char;
      const nextTyped = isKorean ? assembleHangulWithPunctuation(nextBuffer) : nextBuffer;

      const alignments = runMvsa(state.targetText, nextBuffer, isKorean, state.mvsaCache);
      const lastInputIndex = alignments.findLastIndex((d) => d.inputIndex !== undefined);
      const pendingTargets = alignments.slice(lastInputIndex + 1).some((d) => d.op === "PENDING");
      let shouldFinish = !pendingTargets;

      let isCorrect = false;
      let expectedChar: string | null = null;

      if (isKorean) {
        const aligner = new JasoSequenceAligner(state.targetText, nextBuffer, state.mvsaCache);
        const jasoResults = aligner.align();
        const lastJasoInputIndex = jasoResults.findLastIndex((d) => d.inputIndex !== undefined);
        const lastJasoOp = jasoResults[lastJasoInputIndex];
        isCorrect = lastJasoOp ? lastJasoOp.op === "EQUAL" || lastJasoOp.op === "PARTIAL" : false;
        expectedChar = !isCorrect
          ? lastJasoOp?.targetVCharIndex !== undefined
            ? state.targetText[lastJasoOp.targetVCharIndex]
            : baseEval.expectedChar ?? null
          : null;
      } else {
        const lastInputIndex = alignments.findLastIndex((d) => d.inputIndex !== undefined);
        const lastOp = alignments[lastInputIndex];
        isCorrect = lastOp ? lastOp.op === "EQUAL" || lastOp.op === "PARTIAL" : false;
        expectedChar = !isCorrect ? (lastOp?.targetChar ?? baseEval.expectedChar ?? null) : null;
      }

      const evalResult = {
        keyChar: baseEval.keyChar,
        isCorrect,
        expectedChar,
      };

      set({
        qwertyBuffer: nextBuffer,
        typedText: nextTyped,
        maxTypedTextLength: nextTyped.length,
        alignments,
      });
      get().recordKey(keyToken, timestamp, evalResult);

      if (shouldFinish && isKorean) {
        if (lastOp && lastOp.op === "PARTIAL") {
          shouldFinish = false;
        }
      }

      if (shouldFinish && state.mode === "hardcore") {
        const hasErrors = alignments.some((d) => d.op !== "EQUAL");
        if (hasErrors) {
          shouldFinish = false;
        }
      }

      if (shouldFinish) {
        get().finish(timestamp);
      }
    }
  };
}
