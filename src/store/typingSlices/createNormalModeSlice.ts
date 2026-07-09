import type { StoreSlice, InputSlice, TypingStore } from "./types";
import { runMvsa } from "@/utils/mvsa";
import { fetchRandomNormalTarget, type NormalTarget } from "@/lib/practice/normalTargetClient";
import { saveCurrentPageIfDone } from "./saveIfDone";

export const normalInitialState: Pick<InputSlice, "normalPreviousTarget" | "normalPrefetchedTarget"> = {
  normalPreviousTarget: null,
  normalPrefetchedTarget: null,
};

type NormalSliceSet = Parameters<StoreSlice<InputSlice>>[0];
type NormalSliceGet = Parameters<StoreSlice<InputSlice>>[1];

function buildPracticeTargetReset(
  target: NormalTarget,
  previous: NormalTarget | null,
): Partial<TypingStore> {
  return {
    targetText: target.content,
    targetLanguage: target.language,
    targetId: target.id,
    normalPreviousTarget: previous,
    typedText: "",
    maxTypedTextLength: 0,
    qwertyBuffer: "",

    alignments: runMvsa(target.content, "", target.language === "ko", new Map()),
    events: [],
    status: "idle",
    startedAt: null,
    finishedAt: null,
    lastKey: null,
    lastKeyAt: null,
    runInitPromise: null,
    pressedKeys: {},
    isTopicInputActive: false,
  };
}

export function createNormalModeActions(set: NormalSliceSet, get: NormalSliceGet) {
  const applyRandomTarget = async (
    language: string,
    options: { excludeId?: string; previous?: NormalTarget | null } = {},
  ) => {
    try {
      let target: NormalTarget;
      const prefetched = get().normalPrefetchedTarget;

      // Use prefetched target if available, language matches, and it's not the excluded ID
      if (prefetched && prefetched.language === language && prefetched.id !== options.excludeId) {
        target = prefetched;
        set({ normalPrefetchedTarget: null });
      } else {
        target = await fetchRandomNormalTarget(language, options.excludeId);
      }

      set(buildPracticeTargetReset(target, options.previous ?? null));

      // Prefetch next target in the background
      fetchRandomNormalTarget(language, target.id)
        .then((nextTarget) => {
          set({ normalPrefetchedTarget: nextTarget });
        })
        .catch((err) => {
          console.warn("[createNormalModeSlice] Failed to prefetch practice sentence:", err);
        });
    } catch (error) {
      console.warn("[createNormalModeSlice] Failed to load practice sentence:", error);
    }
  };

  return {
    fetchInitialNormalTarget: async (language?: string) => {
      await saveCurrentPageIfDone(get);
      const lang = language ?? get().targetLanguage;
      return applyRandomTarget(lang, { previous: null });
    },

    enterNormalMode: async () => {
      await saveCurrentPageIfDone(get);
      return applyRandomTarget(get().targetLanguage, { previous: null });
    },

    onNormalLanguageChange: async (language: string) => {
      await saveCurrentPageIfDone(get);
      set({ targetLanguage: language });
      return applyRandomTarget(language, { previous: null });
    },

    normalNextTarget: async () => {
      await saveCurrentPageIfDone(get);
      const { targetId, targetText, targetLanguage } = get();
      if (!targetId) {
        await applyRandomTarget(targetLanguage, { previous: null });
        return;
      }

      const current: NormalTarget = {
        id: targetId,
        content: targetText,
        language: targetLanguage,
      };

      await applyRandomTarget(targetLanguage, {
        excludeId: targetId,
        previous: current,
      });
    },

    normalPrevTarget: async () => {
      await saveCurrentPageIfDone(get);
      const previous = get().normalPreviousTarget;
      if (!previous) {
        return false;
      }

      set({
        ...buildPracticeTargetReset(previous, null),
      });
      return true;
    },
  };
}
