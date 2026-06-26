import { StoreSlice, InputSlice } from "./types";
import { generateHardcorePracticeText } from "@/lib/practice/hardcoreModel";
import { getQwertyChar, assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import { evaluateKeystroke } from "@/utils/typingEvaluator";
import { getKeyToken } from "./utils";
import { runMvsa, getCharQwertyIndices } from "@/utils/mvsa";
import { topicInitialState, createTopicTopicActions } from "./createTopicSlice";
import { normalInitialState, createNormalModeActions } from "./createNormalModeSlice";
import { saveCurrentPageIfDone } from "./saveIfDone";

const generateHardcoreText = (): string => {
  const randomLength = 70 + Math.floor(Math.random() * 21) - 10;
  return generateHardcorePracticeText(randomLength);
};

export const createInputSlice: StoreSlice<InputSlice> = (set, get) => {
  const topicActions = createTopicTopicActions(set, get);
  const normalActions = createNormalModeActions(set, get);

  return {
    ...topicInitialState,
    ...normalInitialState,
    fetchTopicTarget: topicActions.fetchTopicTarget,
    resetTopicToGuideScreen: topicActions.resetTopicToGuideScreen,
    fetchInitialNormalTarget: normalActions.fetchInitialNormalTarget,
    targetText: "",
    targetLanguage: "ko",
    targetId: "",
    typedText: "",
    maxTypedTextLength: 0,
    qwertyBuffer: "",
    mvsaCache: new Map(),
    alignments: [],
    mode: "normal",

    setMode: async (mode) => {
      await saveCurrentPageIfDone(get);
      set({ mode });
      if (mode === "normal") {
        await normalActions.enterNormalMode();
      } else if (mode === "topic") {
        await topicActions.applyTopicSetMode();
      } else if (mode === "hardcore") {
        const text = generateHardcoreText();
        await get().setTarget({
          id: "target_hardcore_mock",
          content: text,
          language: "ko",
        });
      } else if (mode === "plain") {
        set({
          targetText: "",
          targetLanguage: "ko",
          targetId: "target_plain",
          typedText: "",
          maxTypedTextLength: 0,
          qwertyBuffer: "",
          mvsaCache: new Map(),
          alignments: [],
          events: [],
          status: "idle",
          startedAt: null,
          finishedAt: null,
          lastKey: null,
          lastKeyAt: null,
          runInitPromise: null,
          pressedKeys: {},
          normalPreviousTarget: null,
        });
      }
    },

    setTargetLanguage: async (language) => {
      await saveCurrentPageIfDone(get);
      if (get().mode === "normal") {
        return normalActions.onNormalLanguageChange(language);
      }

      const isKorean = language === "ko";
      set((state) => {
        const nextTyped = isKorean
          ? assembleHangulWithPunctuation(state.qwertyBuffer)
          : state.qwertyBuffer;
        let nextTargetText = state.targetText;
        const nextTargetId = state.targetId;

        if (state.mode === "plain") {
          nextTargetText = nextTyped;
        }

        return {
          targetLanguage: language,
          targetText: nextTargetText,
          targetId: nextTargetId,
          typedText: nextTyped,
          alignments: runMvsa(nextTargetText, state.qwertyBuffer, isKorean, state.mvsaCache),
        };
      });
    },

    setTarget: async (target) => {
      await saveCurrentPageIfDone(get);
      let text = "";
      let language = "en";
      let id = "";

      if (typeof target === "string") {
        text = target;
        const isKorean = /[가-힣]/.test(target);
        language = isKorean ? "ko" : "en";
        id = `target_custom_${Math.random().toString(36).substring(2, 9)}`;
      } else {
        text = target.content;
        language = target.language;
        id = target.id;
      }

      set({
        targetText: text,
        targetLanguage: language,
        targetId: id,
        normalPreviousTarget: null,
        typedText: "",
        maxTypedTextLength: 0,
        qwertyBuffer: "",
        mvsaCache: new Map(),
        alignments: runMvsa(text, "", language === "ko"),
        events: [],
        status: "idle",
        startedAt: null,
        finishedAt: null,
        lastKey: null,
        lastKeyAt: null,
        runInitPromise: null,
        pressedKeys: {},
        isTopicInputActive: false,
      });
    },

    nextTarget: async () => {
      await saveCurrentPageIfDone(get);
      const { mode } = get();
      if (mode === "normal") {
        return normalActions.normalNextTarget();
      } else if (mode === "topic") {
        return topicActions.topicNextTarget();
      } else if (mode === "hardcore") {
        const text = generateHardcoreText();
        await get().setTarget({
          id: `target_hardcore_${Date.now()}`,
          content: text,
          language: "ko",
        });
      } else if (mode === "plain") {
        await get().reset();
      }
    },

    setTypedText: (value) =>
      set((state) => {
        const isKorean =
          state.targetLanguage === "ko" ||
          (state.targetLanguage === "en" && /[가-힣]/.test(state.targetText));

        const targetText = state.mode === "plain" ? value : state.targetText;
        return {
          targetText,
          typedText: value,
          qwertyBuffer: value,
          maxTypedTextLength: value.length,
          alignments: runMvsa(targetText, value, isKorean, state.mvsaCache),
        };
      }),

    handlePhysicalKeyPress: (code, shiftKey, timestamp) => {
      const state = get();

      if (topicActions.handleTopicInputKeyPress(code, shiftKey)) {
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
        set((state) => ({
          pressedKeys: {
            ...state.pressedKeys,
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
          const nextTargetText = state.mode === "plain" ? nextTyped : state.targetText;
          const nextAlignments = runMvsa(nextTargetText, nextBuffer, isKorean, state.mvsaCache);

          set({
            targetText: nextTargetText,
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
        const nextTargetText = state.mode === "plain" ? nextTyped : state.targetText;

        const alignments = runMvsa(nextTargetText, nextBuffer, isKorean, state.mvsaCache);
        const lastInputIndex = alignments.findLastIndex((d) => d.inputIndex !== undefined);
        const pendingTargets = alignments.slice(lastInputIndex + 1).some((d) => d.op === "PENDING");
        let shouldFinish = !pendingTargets;

        const lastOp = alignments[lastInputIndex];
        const isCorrect = lastOp ? lastOp.op === "EQUAL" || lastOp.op === "PARTIAL" : false;
        const evalResult = {
          keyChar: baseEval.keyChar,
          isCorrect,
          expectedChar: !isCorrect
            ? (lastOp?.targetChar ?? baseEval.expectedChar ?? null)
            : null,
        };

        set({
          targetText: nextTargetText,
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
          const hasInsert = alignments.some((d) => d.op === "INSERT");
          if (hasInsert) {
            shouldFinish = false;
          }
        }

        if (state.mode === "plain") {
          shouldFinish = false;
        }

        if (shouldFinish) {
          get().finish(timestamp);
        }
      }
    },
  };
};
