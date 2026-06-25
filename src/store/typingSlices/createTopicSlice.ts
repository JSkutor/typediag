import type { StoreSlice, InputSlice } from "./types";
import { getQwertyChar, assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import { runMvsa } from "@/utils/mvsa";
import { validateTopic } from "@/utils/validation";
import { getGuestAuthHeaders, applyGuestTokenFromResponse } from "@/utils/guestUser";

export const TOPIC_GUIDE_TEXT = "원하는 주제를 입력하세요...";

export const topicInitialState: Pick<
  InputSlice,
  | "isTopicInputActive"
  | "isTopicLoading"
  | "isTopicGenerating"
  | "currentTopic"
  | "topicTargets"
  | "topicTargetIndex"
> = {
  isTopicInputActive: false,
  isTopicLoading: false,
  isTopicGenerating: false,
  currentTopic: "",
  topicTargets: [],
  topicTargetIndex: -1,
};

type TopicSliceSet = Parameters<StoreSlice<InputSlice>>[0];
type TopicSliceGet = Parameters<StoreSlice<InputSlice>>[1];

export function createTopicTopicActions(set: TopicSliceSet, get: TopicSliceGet) {
  const requestMoreTopicTargets = (topic: string) => {
    if (!topic || get().isTopicGenerating || get().topicTargets.length >= 100) {
      return;
    }

    set({ isTopicGenerating: true });
    void (async () => {
      try {
        const res = await fetch("/api/practice/topic/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getGuestAuthHeaders(),
          },
          body: JSON.stringify({ topic }),
        });
        if (!res?.ok) {
          const errData = await res?.json().catch(() => ({}));
          console.warn(
            "[createTopicSlice] Topic generate failed:",
            errData?.error || "Unknown error",
          );
          return;
        }
        const responseJson = await res.json();
        applyGuestTokenFromResponse(responseJson);
        const data = responseJson.data;
        if (Array.isArray(data) && data.length > 0) {
          set((s) => ({
            topicTargets: [...s.topicTargets, ...data].slice(0, 100),
          }));
        }
      } catch (error) {
        console.warn("[createTopicSlice] Topic generate failed:", error);
      } finally {
        set({ isTopicGenerating: false });
      }
    })();
  };

  const fetchTopicTarget: InputSlice["fetchTopicTarget"] = async (topic: string) => {
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
        headers: {
          "Content-Type": "application/json",
          ...getGuestAuthHeaders(),
        },
        body: JSON.stringify({ topic }),
      });

      if (res.status === 404) {
        res = await fetch("/api/practice/topic/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getGuestAuthHeaders(),
          },
          body: JSON.stringify({ topic }),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        applyGuestTokenFromResponse(errorData);
        throw new Error(errorData?.error || "올바른 한글 입력이 아닙니다.");
      }
      const responseJson = await res.json();
      applyGuestTokenFromResponse(responseJson);
      const data = responseJson.data;
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
  };

  const applyTopicSetMode = () => {
    set({
      targetText: TOPIC_GUIDE_TEXT,
      targetLanguage: "ko",
      targetId: "",
      typedText: "",
      maxTypedTextLength: 0,
      qwertyBuffer: "",
      mvsaCache: new Map(),
      alignments: runMvsa(TOPIC_GUIDE_TEXT, "", true),
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
  };

  const topicNextTarget = () => {
    const { topicTargets, topicTargetIndex, currentTopic } = get();
    if (topicTargets.length > 0) {
      const remainingCount = topicTargets.length - 1 - topicTargetIndex;

      if (remainingCount <= 3 && currentTopic) {
        requestMoreTopicTargets(currentTopic);
      }

      if (remainingCount === 0 && get().isTopicGenerating) {
        return;
      }

      const nextIndex = (topicTargetIndex + 1) % topicTargets.length;
      set({ topicTargetIndex: nextIndex });
      get().setTarget(topicTargets[nextIndex]);
      return;
    }

    set({
      targetText: TOPIC_GUIDE_TEXT,
      targetLanguage: "ko",
      targetId: "",
      typedText: "",
      maxTypedTextLength: 0,
      qwertyBuffer: "",
      mvsaCache: new Map(),
      alignments: runMvsa(TOPIC_GUIDE_TEXT, "", true),
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
  };

  const topicPrevTarget = () => {
    const { topicTargets, topicTargetIndex } = get();
    if (topicTargets.length === 0) {
      return false;
    }

    let prevIndex = (topicTargetIndex - 1) % topicTargets.length;
    if (prevIndex < 0) prevIndex += topicTargets.length;
    set({ topicTargetIndex: prevIndex });
    get().setTarget(topicTargets[prevIndex]);
    return true;
  };

  const handleTopicInputKeyPress = (code: string, shiftKey: boolean): boolean => {
    const state = get();
    if (state.mode !== "topic" || !state.isTopicInputActive) {
      return false;
    }

    if (state.isTopicLoading) {
      return true;
    }

    const isKorean = state.targetLanguage === "ko";

    if (code === "Enter") {
      const query = state.typedText.trim();
      if (query && query !== TOPIC_GUIDE_TEXT) {
        void get().fetchTopicTarget(query);
      }
      return true;
    }

    if (code === "Backspace") {
      if (state.qwertyBuffer.length > 0) {
        const nextBuffer = state.qwertyBuffer.slice(0, -1);
        const nextTyped = isKorean ? assembleHangulWithPunctuation(nextBuffer) : nextBuffer;
        const nextTargetText = nextBuffer.length === 0 ? TOPIC_GUIDE_TEXT : nextTyped;
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
      return true;
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
    return true;
  };

  return {
    fetchTopicTarget,
    applyTopicSetMode,
    topicNextTarget,
    topicPrevTarget,
    handleTopicInputKeyPress,
  };
}
