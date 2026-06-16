import { StoreSlice, InputSlice } from "./types";
import targets from "@/data/targets.json";
import { getQwertyChar, assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import { evaluateKeystroke } from "@/utils/typingEvaluator";
import { disassemble } from "es-hangul";
import { getKeyToken } from "./utils";
import { computeDiff, optimizeDiff } from "@/utils/wordDiff";

export const createInputSlice: StoreSlice<InputSlice> = (set, get) => ({
  targetText: "",
  targetLanguage: "en",
  targetId: "",
  typedText: "",
  qwertyBuffer: "",

  setTarget: (target) => {
    let text = "";
    let language = "en";
    let id = "";

    if (typeof target === "string") {
      text = target;
      const found = targets.find((t) => t.content === target);
      if (found) {
        language = found.language;
        id = found.id;
      } else {
        const isKorean = /[가-힣]/.test(target);
        language = isKorean ? "ko" : "en";
        id = `target_custom_${Math.random().toString(36).substring(2, 9)}`;
      }
    } else {
      text = target.content;
      language = target.language;
      id = target.id;
    }

    set({
      targetText: text,
      targetLanguage: language,
      targetId: id,
      typedText: "",
      qwertyBuffer: "",
      events: [],
      status: "idle",
      startedAt: null,
      finishedAt: null,
      lastKey: null,
      lastKeyAt: null,
      runInitPromise: null,
      pressedKeys: {},
    });
  },

  nextTarget: () => {
    const currentIndex = targets.findIndex((t) => t.content === get().targetText);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % targets.length;
    get().setTarget(targets[nextIndex]);
  },

  setTypedText: (value) => set({ typedText: value, qwertyBuffer: value }),

  handlePhysicalKeyPress: (code, shiftKey, timestamp) => {
    const state = get();

    if (code === "ArrowRight") {
      get().nextTarget();
      return;
    }

    if (code === "ArrowLeft") {
      const currentIndex = targets.findIndex((t) => t.content === get().targetText);
      const prevIndex =
        currentIndex === -1 ? 0 : (currentIndex - 1 + targets.length) % targets.length;
      get().setTarget(targets[prevIndex]);
      return;
    }

    if (state.status === "done") {
      if (code === "Space" || code === "Enter") {
        get().nextTarget();
      }
      return;
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
          const lastIdx = state.typedText.length - 1;
          const isLastCharCorrect =
            lastIdx >= 0 && state.typedText[lastIdx] === state.targetText[lastIdx];

          if (isLastCharCorrect) {
            const targetLength = state.typedText.length - 1;
            let bestBuffer = "";
            for (let len = 0; len <= state.qwertyBuffer.length; len++) {
              const sub = state.qwertyBuffer.slice(0, len);
              const assembled = assembleHangulWithPunctuation(sub);
              if (assembled.length <= targetLength) {
                bestBuffer = sub;
              } else {
                break;
              }
            }
            nextBuffer = bestBuffer;
          } else {
            nextBuffer = state.qwertyBuffer.slice(0, -1);
          }
        } else {
          nextBuffer = state.qwertyBuffer.slice(0, -1);
        }

        const nextTyped = isKorean ? assembleHangulWithPunctuation(nextBuffer) : nextBuffer;

        set({ qwertyBuffer: nextBuffer, typedText: nextTyped });
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

      const diff = optimizeDiff(computeDiff(state.targetText, nextTyped), state.targetText);
      const lastInputIndex = diff.findLastIndex((d) => d.inputIndex !== undefined);
      const pendingDeletes = diff.slice(lastInputIndex + 1).some((d) => d.op === "DELETE");
      let shouldFinish = !pendingDeletes;

      const lastOp = diff[lastInputIndex];
      const evalResult = {
        keyChar: baseEval.keyChar,
        isCorrect: lastOp ? lastOp.op === "EQUAL" || lastOp.op === "PARTIAL" : false,
        expectedChar: lastOp && lastOp.op === "REPLACE" ? lastOp.targetChar || null : null,
      };

      set({ qwertyBuffer: nextBuffer, typedText: nextTyped });
      get().recordKey(keyToken, timestamp, evalResult);

      if (shouldFinish && isKorean) {
        if (lastOp && lastOp.op === "PARTIAL") {
          shouldFinish = false;
        }
      }

      if (shouldFinish) {
        get().finish(timestamp);
      }
    }
  },
});
