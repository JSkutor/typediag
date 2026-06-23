import { StoreSlice, InputSlice } from "./types";
import targets from "@/data/targets_client.json";
import { generateHardcorePracticeText } from "@/lib/practice/hardcoreModel";
import { getQwertyChar, assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import { evaluateKeystroke } from "@/utils/typingEvaluator";
import { getKeyToken } from "./utils";
import { runMvsa, getCharQwertyIndices } from "@/utils/mvsa";
import { validateTopic } from "@/utils/validation";

// Hardcore 모드를 위한 취약 키 무작위 조합 생성
const generateHardcoreText = (): string => {
  // Base length 70 with random offset +/- 10 -> range [60, 80]
  const randomLength = 70 + Math.floor(Math.random() * 21) - 10;
  return generateHardcorePracticeText(randomLength);
};

export const createInputSlice: StoreSlice<InputSlice> = (set, get) => {
  const requestMoreTopicTargets = (topic: string) => {
    if (!topic || get().isTopicGenerating || get().topicTargets.length >= 100) {
      return;
    }

    set({ isTopicGenerating: true });
    void (async () => {
      try {
        const res = await fetch("/api/practice/topic/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic }),
        });
        if (!res?.ok) {
          const errData = await res?.json().catch(() => ({}));
          console.warn("[createInputSlice] Topic generate failed:", errData?.error || "Unknown error");
          return;
        }
        const { data } = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          set((s) => ({
            topicTargets: [...s.topicTargets, ...data].slice(0, 100),
          }));
        }
      } catch (error) {
        console.warn("[createInputSlice] Topic generate failed:", error);
      } finally {
        set({ isTopicGenerating: false });
      }
    })();
  };

  return {
  isTopicInputActive: false,
  isTopicLoading: false,
  isTopicGenerating: false,
  currentTopic: "",
  topicTargets: [],
  topicTargetIndex: -1,
  fetchTopicTarget: async (topic: string) => {
    // 1. 클라이언트 측 1차 유효성 검사 실행
    const validation = validateTopic(topic);
    if (!validation.isValid) {
      const errorMsg = validation.reason || "의미가 없습니다.";
      set({
        targetText: errorMsg,
        typedText: "",
        qwertyBuffer: "",
        maxTypedTextLength: 0,
        alignments: runMvsa(errorMsg, "", true),
        isTopicInputActive: true,
        topicTargets: [],
        topicTargetIndex: -1,
      });
      return;
    }

    set({ isTopicLoading: true });
    try {
      let res = await fetch("/api/practice/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (res.status === 404) {
        res = await fetch("/api/practice/topic/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic }),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || "올바른 한글 입력이 아닙니다.");
      }
      const { data } = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("검색 결과가 없습니다.");
      }
      set({
        topicTargets: data,
        topicTargetIndex: 0,
        currentTopic: topic.trim(),
      });
      get().setTarget({
        id: data[0].id,
        content: data[0].content,
        language: data[0].language,
      });
      set({ isTopicInputActive: false });
      if (data.length < 3) {
        requestMoreTopicTargets(topic.trim());
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "올바른 한글 입력이 아닙니다.";
      console.warn("[fetchTopicTarget]", errorMessage);
      set({
        targetText: errorMessage,
        typedText: "",
        qwertyBuffer: "",
        maxTypedTextLength: 0,
        alignments: runMvsa(errorMessage, "", true),
        isTopicInputActive: true,
        topicTargets: [],
        topicTargetIndex: -1,
      });
    } finally {
      set({ isTopicLoading: false });
    }
  },

  targetText: "",
  targetLanguage: "ko",
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
      const lang = get().targetLanguage;
      const filtered = targets.filter((t) => t.language === lang);
      if (filtered.length > 0) {
        get().setTarget(filtered[0]);
      } else {
        get().setTarget(targets[0]);
      }
    } else if (mode === "topic") {
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
        isTopicInputActive: true,
        isTopicLoading: false,
        isTopicGenerating: false,
        currentTopic: "",
        topicTargets: [],
        topicTargetIndex: -1,
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
      let nextTargetText = state.targetText;
      let nextTargetId = state.targetId;

      if (state.mode === "normal") {
        const filtered = targets.filter((t) => t.language === language);
        if (filtered.length > 0) {
          nextTargetText = filtered[0].content;
          nextTargetId = filtered[0].id;
        }
      } else if (state.mode === "plain") {
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
      isTopicInputActive: false,
    });
  },

  nextTarget: () => {
    if (get().status === "done") {
      get().saveCurrentPage();
    }
    const { mode } = get();
    if (mode === "normal") {
      const filtered = targets.filter((t) => t.language === get().targetLanguage);
      if (filtered.length > 0) {
        const currentIndex = filtered.findIndex((t) => t.content === get().targetText);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % filtered.length;
        get().setTarget(filtered[nextIndex]);
      }
    } else if (mode === "topic") {
      const { topicTargets, topicTargetIndex, currentTopic } = get();
      if (topicTargets.length > 0) {
        // 프리페치 조건 판단: 현재 치고 완료한 'topicTargetIndex' 기준 남은 문장 수 계산
        const remainingCount = topicTargets.length - 1 - topicTargetIndex;

        // 남은 문장이 3개 이하일 때, LLM으로 다음 문장 20개 미리 생성 (최대 100개까지만)
        if (remainingCount <= 3 && currentTopic) {
          requestMoreTopicTargets(currentTopic);
        }

        if (remainingCount === 0 && get().isTopicGenerating) {
          return;
        }

        const nextIndex = (topicTargetIndex + 1) % topicTargets.length;
        set({ topicTargetIndex: nextIndex });
        get().setTarget(topicTargets[nextIndex]);
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
          isTopicInputActive: true,
          isTopicLoading: false,
          isTopicGenerating: false,
          currentTopic: "",
          topicTargets: [],
          topicTargetIndex: -1,
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

    if (state.mode === "topic" && state.isTopicInputActive) {
      if (state.isTopicLoading) return;

      const isKorean = state.targetLanguage === "ko";

      if (code === "Enter") {
        const query = state.typedText.trim();
        if (query && query !== "원하는 주제를 입력하세요...") {
          get().fetchTopicTarget(query);
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
        const filtered = targets.filter((t) => t.language === get().targetLanguage);
        if (filtered.length > 0) {
          const currentIndex = filtered.findIndex((t) => t.content === get().targetText);
          const prevIndex =
            currentIndex === -1 ? 0 : (currentIndex - 1 + filtered.length) % filtered.length;
          get().setTarget(filtered[prevIndex]);
        }
      } else if (state.mode === "topic") {
        const { topicTargets, topicTargetIndex } = get();
        if (topicTargets.length > 0) {
          let prevIndex = (topicTargetIndex - 1) % topicTargets.length;
          if (prevIndex < 0) prevIndex += topicTargets.length;
          set({ topicTargetIndex: prevIndex });
          get().setTarget(topicTargets[prevIndex]);
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
};
};
