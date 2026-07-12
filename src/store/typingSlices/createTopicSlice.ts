import type { StoreSlice, InputSlice } from "./types";
import { getQwertyChar, assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import { runMvsa } from "@/utils/mvsa";
import { validateTopic } from "@/utils/validation";
import { getGuestAuthHeaders, applyGuestTokenFromResponse } from "@/utils/guestUser";
import { saveCurrentPageIfDone } from "./saveIfDone";
import {
  fetchTopicGenerateWithRetry,
  TopicGenerateClientError,
} from "@/lib/practice/topicGenerateClient";
import {
  getTopicGuideText,
  getTopicLang,
  isTopicGuideText,
  resolveValidationError,
  type TopicErrorKey,
} from "@/lib/practice/topicLoading";

;

export const topicInitialState: Pick<
  InputSlice,
  | "isTopicInputActive"
  | "isTopicLoading"
  | "isTopicGenerating"
  | "isTopicWaitingForGenerate"
  | "topicGenerateError"
  | "currentTopic"
  | "topicTargets"
  | "topicTargetIndex"
> = {
  isTopicInputActive: false,
  isTopicLoading: false,
  isTopicGenerating: false,
  isTopicWaitingForGenerate: false,
  topicGenerateError: null,
  currentTopic: "",
  topicTargets: [],
  topicTargetIndex: -1,
};

type TopicSliceSet = Parameters<StoreSlice<InputSlice>>[0];
type TopicSliceGet = Parameters<StoreSlice<InputSlice>>[1];

function topicGuideScreenState(lang: ReturnType<typeof getTopicLang>) {
  const guide = getTopicGuideText(lang);
  const isKorean = lang === "ko";
  return {
    targetText: guide,
    typedText: "",
    qwertyBuffer: "",
    maxTypedTextLength: 0,
    alignments: runMvsa(guide, "", isKorean, new Map()),
    isTopicInputActive: true,
    isTopicLoading: false,
    isTopicGenerating: false,
    isTopicWaitingForGenerate: false,
    topicGenerateError: null,
    currentTopic: "",
    topicTargets: [],
    topicTargetIndex: -1,
    targetId: "",
    events: [],
    status: "idle" as const,
    startedAt: null,
    finishedAt: null,
    lastKey: null,
    lastKeyAt: null,
    runInitPromise: null,
    pressedKeys: {},
  };
}

export function createTopicTopicActions(set: TopicSliceSet, get: TopicSliceGet) {
  const resetTopicToGuideScreen: InputSlice["resetTopicToGuideScreen"] = () => {
    const lang = getTopicLang(get().targetLanguage);
    set(topicGuideScreenState(lang));
  };

  const requestMoreTopicTargets = (topic: string) => {
    if (!topic || get().isTopicGenerating || get().topicTargets.length >= 100) {
      return;
    }

    set({ isTopicGenerating: true, topicGenerateError: null });
    void (async () => {
      try {
        const data = await fetchTopicGenerateWithRetry(topic);
        set((s) => ({
          topicTargets: [...s.topicTargets, ...data].slice(0, 100),
          topicGenerateError: null,
          isTopicWaitingForGenerate: false,
        }));
      } catch (error) {
        const errorKey: TopicErrorKey =
          error instanceof TopicGenerateClientError ? error.errorKey : "generateFailed";
        console.warn("[createTopicSlice] Topic generate failed:", errorKey);
        set((s) => (s.isTopicWaitingForGenerate ? { topicGenerateError: errorKey } : {}));
      } finally {
        set({ isTopicGenerating: false });
      }
    })();
  };

  const fetchTopicTarget: InputSlice["fetchTopicTarget"] = async (topic: string) => {
    const lang = getTopicLang(get().targetLanguage);
    const validation = validateTopic(topic);
    if (!validation.isValid) {
      const errorMsg = resolveValidationError(validation.reason, lang);
      set({
        targetText: errorMsg,
        typedText: "",
        qwertyBuffer: "",
        maxTypedTextLength: 0,
        alignments: runMvsa(errorMsg, "", lang === "ko", new Map()),
        isTopicInputActive: true,
        topicTargets: [],
        topicTargetIndex: -1,
      });
      return;
    }

    set({ isTopicLoading: true, topicGenerateError: null, isTopicWaitingForGenerate: false });
    try {
      let data: { id: string; content: string; language: string }[] | null = null;

      const searchRes = await fetch("/api/practice/topic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getGuestAuthHeaders(),
        },
        body: JSON.stringify({ topic }),
      });

      if (searchRes.status === 404) {
        set({ isTopicGenerating: true });
        try {
          data = await fetchTopicGenerateWithRetry(topic);
        } finally {
          set({ isTopicGenerating: false });
        }
      } else {
        if (!searchRes.ok) {
          const errorData = await searchRes.json().catch(() => ({}));
          applyGuestTokenFromResponse(errorData);
          throw new Error("searchFailed");
        }
        const responseJson = await searchRes.json();
        applyGuestTokenFromResponse(responseJson);
        if (!Array.isArray(responseJson.data) || responseJson.data.length === 0) {
          throw new Error("searchNoResults");
        }
        data = responseJson.data;
      }

      if (!data || data.length === 0) {
        throw new Error("searchNoResults");
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
      const errorKey: TopicErrorKey =
        error instanceof TopicGenerateClientError
          ? error.errorKey
          : error instanceof Error && error.message === "searchNoResults"
            ? "searchNoResults"
            : "searchFailed";
      console.warn("[fetchTopicTarget]", errorKey);
      set({
        ...topicGuideScreenState(lang),
        topicGenerateError: errorKey,
      });
    } finally {
      set({ isTopicLoading: false });
    }
  };

  const applyTopicSetMode = async () => {
    await saveCurrentPageIfDone(get);
    set({
      ...topicGuideScreenState("ko"),
      targetLanguage: "ko",
    });
  };

  const topicNextTarget = async () => {
    await saveCurrentPageIfDone(get);
    const { topicTargets, topicTargetIndex, currentTopic } = get();
    if (topicTargets.length > 0) {
      const remainingCount = topicTargets.length - 1 - topicTargetIndex;

      if (remainingCount <= 3 && currentTopic) {
        requestMoreTopicTargets(currentTopic);
      }

      if (remainingCount === 0 && get().isTopicGenerating) {
        set({ isTopicWaitingForGenerate: true, topicGenerateError: null });
        return;
      }

      const nextIndex = (topicTargetIndex + 1) % topicTargets.length;
      set({ topicTargetIndex: nextIndex });
      await get().setTarget(topicTargets[nextIndex]);
      return;
    }

    set({
      ...topicGuideScreenState("ko"),
      targetLanguage: "ko",
    });
  };

  const topicPrevTarget = async () => {
    await saveCurrentPageIfDone(get);
    const { topicTargets, topicTargetIndex } = get();
    if (topicTargets.length === 0) {
      return false;
    }

    let prevIndex = (topicTargetIndex - 1) % topicTargets.length;
    if (prevIndex < 0) prevIndex += topicTargets.length;
    set({ topicTargetIndex: prevIndex });
    await get().setTarget(topicTargets[prevIndex]);
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

    const lang = getTopicLang(state.targetLanguage);
    const isKorean = lang === "ko";
    const guide = getTopicGuideText(lang);

    if (code === "Enter") {
      if (state.topicGenerateError) {
        return true;
      }
      const query = state.typedText.trim();
      if (query && !isTopicGuideText(query)) {
        void get().fetchTopicTarget(query);
      }
      return true;
    }

    if (code === "Backspace") {
      if (state.qwertyBuffer.length > 0) {
        const nextBuffer = state.qwertyBuffer.slice(0, -1);
        const nextTyped = isKorean ? assembleHangulWithPunctuation(nextBuffer) : nextBuffer;
        const nextTargetText = nextBuffer.length === 0 ? guide : nextTyped;
        const nextAlignments =
          nextBuffer.length === 0
            ? runMvsa(nextTargetText, "", isKorean, get().mvsaCache)
            : runMvsa(nextTargetText, nextBuffer, isKorean, get().mvsaCache);

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
      const nextAlignments = runMvsa(nextTargetText, nextBuffer, isKorean);

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
    resetTopicToGuideScreen,
    applyTopicSetMode,
    topicNextTarget,
    topicPrevTarget,
    handleTopicInputKeyPress,
  };
}
