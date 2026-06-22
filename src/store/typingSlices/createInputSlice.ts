import { StoreSlice, InputSlice } from "./types";
import targets from "@/data/targets_client.json";
import { generateHardcorePracticeText } from "@/lib/practice/hardcoreModel";
import { getQwertyChar, assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import { evaluateKeystroke } from "@/utils/typingEvaluator";
import { getKeyToken } from "./utils";
import { runMvsa, getCharQwertyIndices } from "@/utils/mvsa";
import { validateSubject } from "@/utils/validation";

// Hardcore 모드를 위한 취약 키 무작위 조합 생성
const generateHardcoreText = (): string => {
  // Base length 70 with random offset +/- 10 -> range [60, 80]
  const randomLength = 70 + Math.floor(Math.random() * 21) - 10;
  return generateHardcorePracticeText(randomLength);
};

export const createInputSlice: StoreSlice<InputSlice> = (set, get) => ({
  isSubjectInputActive: false,
  isSubjectLoading: false,
  isSubjectGenerating: false,
  currentSubject: "",
  subjectTargets: [],
  subjectTargetIndex: -1,
  fetchSubjectTarget: async (subject: string) => {
    // 1. 클라이언트 측 1차 유효성 검사 실행
    const validation = validateSubject(subject);
    if (!validation.isValid) {
      const errorMsg = validation.reason || "의미가 없습니다.";
      set({
        targetText: errorMsg,
        typedText: "",
        qwertyBuffer: "",
        maxTypedTextLength: 0,
        alignments: runMvsa(errorMsg, "", true),
        isSubjectInputActive: true,
        subjectTargets: [],
        subjectTargetIndex: -1,
      });
      return;
    }

    set({ isSubjectLoading: true });
    try {
      let res = await fetch("/api/practice/subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject }),
      });

      if (res.status === 404) {
        res = await fetch("/api/practice/subject/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject }),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "올바른 한글 입력이 아닙니다.");
      }
      const { data } = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("검색 결과가 없습니다.");
      }
      set({
        subjectTargets: data,
        subjectTargetIndex: 0,
        currentSubject: subject.trim(),
      });
      get().setTarget({
        id: data[0].id,
        content: data[0].content,
        language: data[0].language,
      });
      set({ isSubjectInputActive: false });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "올바른 한글 입력이 아닙니다.";
      set({
        targetText: errorMessage,
        typedText: "",
        qwertyBuffer: "",
        maxTypedTextLength: 0,
        alignments: runMvsa(errorMessage, "", true),
        isSubjectInputActive: true,
        subjectTargets: [],
        subjectTargetIndex: -1,
      });
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
      const guideText = "원하는 주제를 입력하세요...";
      set({
        targetText: guideText,
        targetLanguage: "ko",
        targetId: "",
        typedText: "",
        maxTypedTextLength: 0,
        qwertyBuffer: "",
        mvsaCache: new Map(),
        alignments: runMvsa(guideText, "", true),
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
        isSubjectGenerating: false,
        currentSubject: "",
        subjectTargets: [],
        subjectTargetIndex: -1,
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
      const { subjectTargets, subjectTargetIndex, currentSubject } = get();
      if (subjectTargets.length > 0) {
        const nextIndex = (subjectTargetIndex + 1) % subjectTargets.length;
        set({ subjectTargetIndex: nextIndex });
        get().setTarget(subjectTargets[nextIndex]);

        // 남은 문장이 3개 이하일 때, LLM으로 다음 문장 20개 미리 생성
        if (subjectTargets.length - nextIndex <= 3 && currentSubject && !get().isSubjectGenerating) {
          set({ isSubjectGenerating: true });
          fetch("/api/practice/subject/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subject: currentSubject }),
          })
            .then(async (res) => {
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData.error || "부적절한 주제이거나 문장 생성에 실패했습니다.";
                // 에러 문구도 하나의 "연습 문장"으로 추가하여 흐름 유지
                set((s) => ({
                  subjectTargets: [
                    ...s.subjectTargets,
                    {
                      id: `target_error_${Date.now()}`,
                      content: errMsg,
                      language: "ko",
                    },
                  ],
                  isSubjectGenerating: false,
                }));
                return;
              }
              const { data } = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                set((s) => ({
                  subjectTargets: [...s.subjectTargets, ...data],
                  isSubjectGenerating: false,
                }));
              } else {
                set({ isSubjectGenerating: false });
              }
            })
            .catch(() => {
              set({ isSubjectGenerating: false });
            });
        }
      } else {
        const guideText = "원하는 주제를 입력하세요...";
        set({
          targetText: guideText,
          targetLanguage: "ko",
          targetId: "",
          typedText: "",
          maxTypedTextLength: 0,
          qwertyBuffer: "",
          mvsaCache: new Map(),
          alignments: runMvsa(guideText, "", true),
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
          isSubjectGenerating: false,
          currentSubject: "",
          subjectTargets: [],
          subjectTargetIndex: -1,
        });
      }
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

    if (state.mode === "subject" && state.isSubjectInputActive) {
      if (state.isSubjectLoading) return;

      const isKorean = state.targetLanguage === "ko";

      if (code === "Enter") {
        const query = state.typedText.trim();
        if (query && query !== "원하는 주제를 입력하세요...") {
          get().fetchSubjectTarget(query);
        }
        return;
      }

      if (code === "Backspace") {
        if (state.qwertyBuffer.length > 0) {
          const nextBuffer = state.qwertyBuffer.slice(0, -1);
          const nextTyped = isKorean ? assembleHangulWithPunctuation(nextBuffer) : nextBuffer;
          const nextTargetText =
            nextBuffer.length === 0 ? "원하는 주제를 입력하세요..." : nextTyped;
          const nextAlignments =
            nextBuffer.length === 0
              ? runMvsa(nextTargetText, "", isKorean, state.mvsaCache)
              : runMvsa(nextTargetText, nextBuffer, isKorean, state.mvsaCache);

          set({
            targetText: nextTargetText,
            qwertyBuffer: nextBuffer,
            typedText: nextTyped,
            alignments: nextAlignments,
          });
        }
        return;
      }

      const char = getQwertyChar(code, shiftKey);
      if (char !== null) {
        const nextBuffer = state.qwertyBuffer + char;
        const nextTyped = isKorean ? assembleHangulWithPunctuation(nextBuffer) : nextBuffer;
        const nextTargetText = nextTyped;
        const nextAlignments = runMvsa(nextTargetText, nextBuffer, isKorean, state.mvsaCache);

        set({
          targetText: nextTargetText,
          qwertyBuffer: nextBuffer,
          typedText: nextTyped,
          maxTypedTextLength: nextTyped.length,
          alignments: nextAlignments,
        });
      }
      return;
    }

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
      } else if (state.mode === "subject") {
        const { subjectTargets, subjectTargetIndex } = get();
        if (subjectTargets.length > 0) {
          const prevIndex =
            (subjectTargetIndex - 1 + subjectTargets.length) % subjectTargets.length;
          set({ subjectTargetIndex: prevIndex });
          get().setTarget(subjectTargets[prevIndex]);
        } else {
          get().nextTarget();
        }
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
});
