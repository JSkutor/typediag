"use client";

import React from "react";
import { useTypingStore, TypingMode } from "@/store/useTypingStore";
import { buildPracticeWordGroups } from "./practiceTextLayout";
import { TopicLoadingOverlay } from "./TopicLoadingOverlay";
import { useTopicFatalErrorReset } from "./useTopicFatalErrorReset";
import { getTopicRemainingLabel, getTopicLang } from "@/lib/practice/topicLoading";
import { PracticeChar } from "./PracticeChar";
import { TYPING_TEXT_CONTAINER_ID, usePracticeTextLayout } from "./usePracticeTextLayout";

const TYPING_MODES: TypingMode[] = ["normal", "topic", "hardcore", "plain"];

const PracticePanelToolbar: React.FC = React.memo(function PracticePanelToolbar() {
  const mode = useTypingStore((state) => state.mode);
  const setMode = useTypingStore((state) => state.setMode);
  const targetLanguage = useTypingStore((state) => state.targetLanguage);
  const setTargetLanguage = useTypingStore((state) => state.setTargetLanguage);

  return (
    <div className="mode-selector-container">
      <div className="segment-pill" role="group" aria-label="Typing mode">
        {TYPING_MODES.map((m) => (
          <button
            key={m}
            type="button"
            className={`segment-pill__btn${mode === m ? " segment-pill__btn--active" : ""}`}
            onClick={() => setMode(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="segment-pill" role="group" aria-label="Language">
        {(["ko", "en"] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            className={`segment-pill__btn segment-pill__btn--lang${targetLanguage === lang ? " segment-pill__btn--active" : ""}`}
            onClick={() => setTargetLanguage(lang)}
          >
            {lang}
          </button>
        ))}
      </div>
    </div>
  );
});

const TopicRemainingBadge: React.FC = React.memo(function TopicRemainingBadge() {
  const mode = useTypingStore((state) => state.mode);
  const isTopicInputActive = useTypingStore((state) => state.isTopicInputActive);
  const topicTargets = useTypingStore((state) => state.topicTargets);
  const topicTargetIndex = useTypingStore((state) => state.topicTargetIndex);
  const targetLanguage = useTypingStore((state) => state.targetLanguage);

  if (mode !== "topic" || isTopicInputActive || topicTargets.length === 0) {
    return null;
  }

  const topicLang = getTopicLang(targetLanguage);
  return (
    <div className="topic-remaining-badge">
      {getTopicRemainingLabel(topicLang, topicTargets.length - topicTargetIndex)}
    </div>
  );
});

const PracticeTypingText: React.FC = React.memo(function PracticeTypingText() {
  const diffResult = useTypingStore((state) => state.alignments);
  const qwertyBuffer = useTypingStore((state) => state.qwertyBuffer);
  const mode = useTypingStore((state) => state.mode);
  const targetLanguage = useTypingStore((state) => state.targetLanguage);

  const isEn = targetLanguage === "en";

  const lastInputIndex = React.useMemo(() => {
    return diffResult.findLastIndex((d) => d.inputIndex !== undefined);
  }, [diffResult]);

  const wordGroups = React.useMemo(() => buildPracticeWordGroups(diffResult), [diffResult]);

  const { lineStartSpaceIndices, cursorJumpIndex } = usePracticeTextLayout(
    diffResult,
    lastInputIndex,
  );

  return (
    <>
      {mode === "plain" && qwertyBuffer.length === 0 && (
        <span className="plain-mode-hint">
          {isEn ? "Type freely here..." : "여기에 자유롭게 입력하세요..."}
        </span>
      )}
      {diffResult.length === 0 && <span className="typing-cursor left" />}
      {wordGroups.map((group, groupIdx) => (
        <span key={`word-${groupIdx}`} className="word-wrapper">
          {group.items.map(({ index }) => {
            const isWrapHiddenSpace = lineStartSpaceIndices.has(index);
            const showCursorRight =
              qwertyBuffer.length > 0 &&
              index === lastInputIndex &&
              cursorJumpIndex === null &&
              !isWrapHiddenSpace;
            const showCursorLeft =
              (qwertyBuffer.length === 0 && index === 0) ||
              (cursorJumpIndex !== null && index === cursorJumpIndex);

            return (
              <PracticeChar
                key={index}
                index={index}
                alignment={diffResult[index]}
                isWrapHiddenSpace={isWrapHiddenSpace}
                showCursorLeft={showCursorLeft}
                showCursorRight={showCursorRight}
              />
            );
          })}
        </span>
      ))}
    </>
  );
});

const PracticeTextContainer: React.FC = React.memo(function PracticeTextContainer() {
  const mode = useTypingStore((state) => state.mode);
  const targetLanguage = useTypingStore((state) => state.targetLanguage);
  const isTopicLoading = useTypingStore((state) => state.isTopicLoading);
  const isTopicGenerating = useTypingStore((state) => state.isTopicGenerating);
  const isTopicWaitingForGenerate = useTypingStore((state) => state.isTopicWaitingForGenerate);
  const topicGenerateError = useTypingStore((state) => state.topicGenerateError);

  const isEn = targetLanguage === "en";
  const showTopicInitialLoading = mode === "topic" && isTopicLoading;
  const showTopicPracticeOverlay =
    mode === "topic" &&
    !isTopicLoading &&
    (isTopicWaitingForGenerate || topicGenerateError != null);
  const topicLoadingVariant = isTopicGenerating ? "generate" : "search";

  return (
    <div
      id={TYPING_TEXT_CONTAINER_ID}
      className={`typing-text-container${showTopicPracticeOverlay ? " typing-text-container--waiting" : ""}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {showTopicPracticeOverlay ? (
        <div className="typing-loading typing-loading--overlay">
          <TopicLoadingOverlay
            isActive
            isEn={isEn}
            variant="generate"
            error={topicGenerateError}
          />
        </div>
      ) : null}
      {mode === "hardcore" && isEn ? (
        <div className="typing-placeholder-box">
          <div className="typing-placeholder-title">⚡ Hardcore Mode (English)</div>
          <div className="typing-placeholder-desc">
            English Hardcore mode is coming soon! Please use Korean for now.
          </div>
        </div>
      ) : showTopicInitialLoading ? (
        <TopicLoadingOverlay isActive isEn={isEn} variant={topicLoadingVariant} />
      ) : (
        <PracticeTypingText />
      )}
    </div>
  );
});

export const PracticePanel: React.FC = () => {
  const mode = useTypingStore((state) => state.mode);
  const isTopicLoading = useTypingStore((state) => state.isTopicLoading);
  const isTopicGenerating = useTypingStore((state) => state.isTopicGenerating);
  const topicGenerateError = useTypingStore((state) => state.topicGenerateError);
  const resetTopicToGuideScreen = useTypingStore((state) => state.resetTopicToGuideScreen);

  const showTopicFatalError =
    mode === "topic" &&
    topicGenerateError != null &&
    !isTopicLoading &&
    !isTopicGenerating;

  useTopicFatalErrorReset(showTopicFatalError, resetTopicToGuideScreen);

  return (
    <div className="typing-area">
      <PracticePanelToolbar />
      <TopicRemainingBadge />
      <PracticeTextContainer />
    </div>
  );
};
