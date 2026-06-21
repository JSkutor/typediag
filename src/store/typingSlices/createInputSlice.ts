import { StoreSlice, InputSlice } from "./types";
import targets from "@/data/targets_client.json";
import { generateHardcorePracticeText } from "@/lib/practice/hardcoreModel";
import { getQwertyChar, assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import { evaluateKeystroke } from "@/utils/typingEvaluator";
import { getKeyToken } from "./utils";
import { runMvsa, getCharQwertyIndices } from "@/utils/mvsa";

// Hardcore 모드를 위한 취약 키 무작위 조합 생성
const generateHardcoreText = (): string => {
  // Base length 70 with random offset +/- 10 -> range [60, 80]
  const randomLength = 70 + Math.floor(Math.random() * 21) - 10;
  return generateHardcorePracticeText(randomLength);
};

// Subject 모드를 위한 주제별 Mock 텍스트 목록 및 로더
const getSubjectText = (subject?: string): string => {
  const subjects: Record<string, string[]> = {
    programming: [
      "const typingStore = create<TypingStore>((set, get) => ({ ... }));",
      "import { Canvas } from '@react-three/fiber';",
      "function calculateKeystrokeDynamics(events: KeyEvent[]) { ... }",
    ],
    default: [
      "[주제 연습: 과학] 인공지능과 우주 항공 기술의 융합이 가속화되고 있습니다.",
      "[주제 연습: 경제] 글로벌 금리 동향과 환율 변동이 시장에 미치는 영향이 큽니다.",
      "[주제 연습: 문학] 별 헤는 밤, 하늘에 가득 찬 별들을 보며 시를 짓습니다.",
    ],
  };
  const list = subjects[subject || "default"] || subjects.default;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
};

export const createInputSlice: StoreSlice<InputSlice> = (set, get) => ({
  isSubjectInputActive: false,
  isSubjectLoading: false,
  fetchSubjectTarget: async (subject: string) => {
    set({ isSubjectLoading: true });
    try {
      const res = await fetch("/api/practice/subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject }),
      });
      if (!res.ok) throw new Error("Failed to fetch subject target");
      const { data } = await res.json();
      get().setTarget({
        id: data.id,
        content: data.content,
        language: data.language,
      });
      set({ isSubjectInputActive: false });
    } catch (error) {
      console.error(error);
      // fallback
      get().setTarget({
        id: "target_subject_error",
        content: "주제 벡터 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        language: "ko",
      });
      set({ isSubjectInputActive: false });
    } finally {
      set({ isSubjectLoading: false });
    }
  },

  targetText: "",
  targetLanguage: "en",
  targetId: "",
  typedText: "",
  maxTypedTextLength: 0,
  qwertyBuffer: "",
  mvsaCache: new Map(),
  alignments: [],
  mode: "normal",

  setMode: (mode) => {
    if (get().status === "done") {
      get().saveCurrentPage();
    }
    set({ mode });
    if (mode === "normal") {
      get().setTarget(targets[0]);
    } else if (mode === "subject") {
      set({
        targetText: "",
        targetLanguage: "ko",
        targetId: "",
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
        isSubjectInputActive: true,
        isSubjectLoading: false,
      });
    } else if (mode === "hardcore") {
      const text = generateHardcoreText();
      get().setTarget({
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
      });
    }
  },

  setTargetLanguage: (language) => {
    const isKorean = language === "ko";
    set((state) => {
      const nextTyped = isKorean
        ? assembleHangulWithPunctuation(state.qwertyBuffer)
        : state.qwertyBuffer;
      const nextTargetText = state.mode === "plain" ? nextTyped : state.targetText;
      return {
        targetLanguage: language,
        targetText: nextTargetText,
        typedText: nextTyped,
        alignments: runMvsa(nextTargetText, state.qwertyBuffer, isKorean, state.mvsaCache),
      };
    });
  },

  setTarget: (target) => {
    if (get().status === "done") {
      get().saveCurrentPage();
    }
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
      isSubjectInputActive: false,
    });
  },

  nextTarget: () => {
    if (get().status === "done") {
      get().saveCurrentPage();
    }
    const { mode } = get();
    if (mode === "normal") {
      const currentIndex = targets.findIndex((t) => t.content === get().targetText);
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % targets.length;
      get().setTarget(targets[nextIndex]);
    } else if (mode === "subject") {
      set({
        targetText: "",
        targetLanguage: "ko",
        targetId: "",
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
        isSubjectInputActive: true,
        isSubjectLoading: false,
      });
    } else if (mode === "hardcore") {
      const text = generateHardcoreText();
      get().setTarget({
        id: `target_hardcore_${Date.now()}`,
        content: text,
        language: "ko",
      });
    } else if (mode === "plain") {
      get().reset();
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

    if (code === "ArrowRight") {
      get().nextTarget();
      return;
    }

    if (code === "ArrowLeft") {
      if (state.mode === "normal") {
        const currentIndex = targets.findIndex((t) => t.content === get().targetText);
        const prevIndex =
          currentIndex === -1 ? 0 : (currentIndex - 1 + targets.length) % targets.length;
        get().setTarget(targets[prevIndex]);
      } else {
        get().nextTarget();
      }
      return;
    }

    if (state.status === "done") {
      if (code === "Backspace") {
        set({ status: "running", finishedAt: null });
      } else {
        if (code === "Space" || code === "Enter") {
          get().nextTarget();
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
      const evalResult = {
        keyChar: baseEval.keyChar,
        isCorrect: lastOp ? lastOp.op === "EQUAL" || lastOp.op === "PARTIAL" : false,
        expectedChar: lastOp && lastOp.op === "REPLACE" ? lastOp.targetChar || null : null,
      };

      set((s) => ({
        targetText: nextTargetText,
        qwertyBuffer: nextBuffer,
        typedText: nextTyped,
        maxTypedTextLength: nextTyped.length,
        alignments,
      }));
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
});
