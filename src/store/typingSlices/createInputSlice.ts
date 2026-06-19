import { StoreSlice, InputSlice } from "./types";
import targets from "@/data/targets.json";
import { getQwertyChar, assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import { evaluateKeystroke } from "@/utils/typingEvaluator";
import { getKeyToken } from "./utils";
import { runMvsa, getCharQwertyIndices } from "@/utils/mvsa";

// Hardcore 모드를 위한 취약 키 무작위 조합 생성 뼈대
const generateHardcoreText = (): string => {
  const samples = [
    "나채저주히 자옆 나픈 자로뱌 냐캐",
    "냑채저주히 쟈옆 나픈 자로뱌 냐캐",
    "지연 속도 측정용 난해 텍스트 구조",
    "키보드 지연 병목 현상 분석용 문자열",
  ];
  const idx = Math.floor(Math.random() * samples.length);
  return samples[idx];
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
  targetText: "",
  targetLanguage: "en",
  targetId: "",
  typedText: "",
  maxTypedTextLength: 0,
  qwertyBuffer: "",
  mvsaCache: new Map(),
  alignments: [],
  mode: "default",

  setMode: (mode) => {
    set({ mode });
    if (mode === "default") {
      get().setTarget(targets[0]);
    } else if (mode === "subject") {
      const text = getSubjectText();
      get().setTarget({
        id: "target_subject_mock",
        content: text,
        language: /[가-힣]/.test(text) ? "ko" : "en",
        tags: ["subject", "mock"],
      });
    } else if (mode === "hardcore") {
      const text = generateHardcoreText();
      get().setTarget({
        id: "target_hardcore_mock",
        content: text,
        language: "ko",
        tags: ["hardcore", "mock"],
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
    });
  },

  nextTarget: () => {
    const { mode } = get();
    if (mode === "default") {
      const currentIndex = targets.findIndex((t) => t.content === get().targetText);
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % targets.length;
      get().setTarget(targets[nextIndex]);
    } else if (mode === "subject") {
      const text = getSubjectText();
      get().setTarget({
        id: `target_subject_${Date.now()}`,
        content: text,
        language: /[가-힣]/.test(text) ? "ko" : "en",
        tags: ["subject"],
      });
    } else if (mode === "hardcore") {
      const text = generateHardcoreText();
      get().setTarget({
        id: `target_hardcore_${Date.now()}`,
        content: text,
        language: "ko",
        tags: ["hardcore"],
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
      if (state.mode === "default") {
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

      if (state.mode === "plain") {
        shouldFinish = false;
      }

      if (shouldFinish) {
        get().finish(timestamp);
      }
    }
  },
});
