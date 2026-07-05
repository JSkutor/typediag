import { StoreSlice, InputSlice } from "./types";
import { generateHardcorePracticeText } from "@/lib/practice/hardcoreModel";
import { assembleHangulWithPunctuation } from "@/utils/keyboardMap";
import { runMvsa } from "@/utils/mvsa";
import { topicInitialState, createTopicTopicActions } from "./createTopicSlice";
import { normalInitialState, createNormalModeActions } from "./createNormalModeSlice";
import { saveCurrentPageIfDone } from "./saveIfDone";
import { createPhysicalKeyPressHandler } from "./physicalKeyPressHandler";
import {
  buildFeedbackAlignments,
  buildFeedbackEmptyAlignments,
} from "@/lib/feedback/freeformTyping";

const generateHardcoreText = (): string => {
  const randomLength = 70 + Math.floor(Math.random() * 21) - 10;
  return generateHardcorePracticeText(randomLength);
};

export const createInputSlice: StoreSlice<InputSlice> = (set, get) => {
  const topicActions = createTopicTopicActions(set, get);
  const normalActions = createNormalModeActions(set, get);
  const handlePhysicalKeyPress = createPhysicalKeyPressHandler(
    set,
    get,
    topicActions,
    normalActions,
  );

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
      } else if (mode === "feedback") {
        set({
          targetText: "",
          targetId: "feedback",
          typedText: "",
          maxTypedTextLength: 0,
          qwertyBuffer: "",

          alignments: buildFeedbackEmptyAlignments(),
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
      }
    },

    setTargetLanguage: async (language) => {
      await saveCurrentPageIfDone(get);
      if (get().mode === "normal") {
        return normalActions.onNormalLanguageChange(language);
      }

      if (get().mode === "feedback") {
        const isKorean = language === "ko";
        set((state) => {
          const nextTyped = isKorean
            ? assembleHangulWithPunctuation(state.qwertyBuffer)
            : state.qwertyBuffer;
          return {
            targetLanguage: language,
            typedText: nextTyped,
            alignments: buildFeedbackAlignments(nextTyped),
          };
        });
        return;
      }

      const isKorean = language === "ko";
      set((state) => {
        const nextTyped = isKorean
          ? assembleHangulWithPunctuation(state.qwertyBuffer)
          : state.qwertyBuffer;
        return {
          targetLanguage: language,
          targetText: state.targetText,
          targetId: state.targetId,
          typedText: nextTyped,
          alignments: runMvsa(state.targetText, state.qwertyBuffer, isKorean),
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
      } else if (mode === "feedback") {
        set({
          typedText: "",
          maxTypedTextLength: 0,
          qwertyBuffer: "",
          alignments: buildFeedbackEmptyAlignments(),
        });
      }
    },

    setTypedText: (value) =>
      set((state) => {
        const isKorean =
          state.targetLanguage === "ko" ||
          (state.targetLanguage === "en" && /[가-힣]/.test(state.targetText));

        return {
          typedText: value,
          qwertyBuffer: value,
          maxTypedTextLength: value.length,
          alignments: runMvsa(state.targetText, value, isKorean),
        };
      }),

    handlePhysicalKeyPress,
  };
};
