"use client";

import React from "react";
import posthog from "posthog-js";
import { useTypingStore, TypingMode } from "@/store/useTypingStore";
import { useFeedbackStore } from "@/store/useFeedbackStore";
import { buildPracticeWordGroups } from "./practiceTextLayout";
import { TopicLoadingOverlay } from "./TopicLoadingOverlay";
import { useTopicFatalErrorReset } from "./useTopicFatalErrorReset";
import { getTopicRemainingLabel, getTopicLang } from "@/lib/practice/topicLoading";
import { PracticeChar } from "./PracticeChar";
import { PageMetricsFlash } from "./PageMetricsFlash";
import { TYPING_TEXT_CONTAINER_ID, usePracticeTextLayout } from "./usePracticeTextLayout";
import { EN_PUBLIC_ENABLED } from "@/lib/i18n/lang";

const TYPING_MODES: TypingMode[] = ["normal", "topic", "hardcore"];

const LanguagePill: React.FC = React.memo(function LanguagePill() {
  const targetLanguage = useTypingStore((state) => state.targetLanguage);
  const setTargetLanguage = useTypingStore((state) => state.setTargetLanguage);

  return (
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
  );
});

const FeedbackSubmitActions: React.FC = React.memo(function FeedbackSubmitActions() {
  const typedText = useTypingStore((state) => state.typedText);
  const targetLanguage = useTypingStore((state) => state.targetLanguage);
  const setMode = useTypingStore((state) => state.setMode);
  const submitStatus = useFeedbackStore((state) => state.submitStatus);
  const submitError = useFeedbackStore((state) => state.submitError);
  const resetSubmitStatus = useFeedbackStore((state) => state.resetSubmitStatus);
  const submit = useFeedbackStore((state) => state.submit);

  const isEn = targetLanguage === "en";
  const isSubmitting = submitStatus === "submitting";
  const isSuccess = submitStatus === "success";
  const canSubmit = typedText.trim().length > 0 && !isSubmitting && !isSuccess;

  if (isSuccess) {
    return null;
  }

  return (
    <div
      className="segment-pill"
      role="group"
      aria-label={isEn ? "Feedback actions" : "피드백 동작"}
    >
      {submitError && (
        <span className="feedback-inline-status feedback-inline-status--error" role="alert">
          {submitError}
        </span>
      )}
      <button
        type="button"
        className="segment-pill__btn"
        onClick={() => {
          resetSubmitStatus();
          void setMode("normal");
        }}
        disabled={isSubmitting}
      >
        {isEn ? "cancel" : "취소"}
      </button>
      <button
        type="button"
        className="segment-pill__btn segment-pill__btn--active"
        onClick={() => void submit()}
        disabled={!canSubmit}
      >
        {isSubmitting ? (isEn ? "sending..." : "전송 중...") : isEn ? "send" : "보내기"}
      </button>
    </div>
  );
});

const PracticePanelToolbar: React.FC = React.memo(function PracticePanelToolbar() {
  const mode = useTypingStore((state) => state.mode);
  const setMode = useTypingStore((state) => state.setMode);
  const resetSubmitStatus = useFeedbackStore((state) => state.resetSubmitStatus);

  const handleModeChange = (nextMode: TypingMode) => {
    if (mode === "feedback") {
      resetSubmitStatus();
    }
    posthog.capture("typing_mode_changed", { from_mode: mode, to_mode: nextMode });
    void setMode(nextMode);
  };

  return (
    <div className="mode-selector-container">
      <div className="segment-pill" role="group" aria-label="Typing mode">
        {TYPING_MODES.map((m) => (
          <button
            key={m}
            type="button"
            className={`segment-pill__btn${mode === m ? " segment-pill__btn--active" : ""}`}
            onClick={() => handleModeChange(m)}
            style={{ position: "relative" }}
          >
            {m}
            {(m === "topic" || m === "hardcore") && mode === m && (
              <span
                style={{
                  position: "absolute",
                  top: "-22px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#ff6b6b",
                  whiteSpace: "nowrap",
                }}
              >
                Beta Free
              </span>
            )}
          </button>
        ))}
      </div>

      {EN_PUBLIC_ENABLED ? <LanguagePill /> : null}

      {mode === "feedback" ? <FeedbackSubmitActions /> : null}
      <PageMetricsFlash />
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

  const lastInputIndex = React.useMemo(() => {
    return diffResult.findLastIndex((d) => d.inputIndex !== undefined);
  }, [diffResult]);

  const wordGroups = React.useMemo(() => buildPracticeWordGroups(diffResult), [diffResult]);

  const { lineStartSpaceIndices, cursorJumpIndex } = usePracticeTextLayout(
    diffResult,
    lastInputIndex,
  );

  const duplicateTargetIndices = React.useMemo(() => {
    const set = new Set<number>();
    const seenTargets = new Set<number>();
    for (let i = 0; i < diffResult.length; i++) {
      const tIdx = diffResult[i].targetIndex;
      if (tIdx !== undefined) {
        if (seenTargets.has(tIdx)) {
          set.add(i);
        } else {
          seenTargets.add(tIdx);
        }
      }
    }
    return set;
  }, [diffResult]);

  return (
    <>
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

            const isDuplicateTarget = duplicateTargetIndices.has(index);

            return (
              <PracticeChar
                key={index}
                index={index}
                alignment={diffResult[index]}
                isWrapHiddenSpace={isWrapHiddenSpace}
                showCursorLeft={showCursorLeft}
                showCursorRight={showCursorRight}
                isDuplicateTarget={isDuplicateTarget}
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
          <TopicLoadingOverlay isActive isEn={isEn} variant="generate" error={topicGenerateError} />
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

export const PracticePanel: React.FC<{ hideToolbar?: boolean }> = ({ hideToolbar }) => {
  const mode = useTypingStore((state) => state.mode);
  const isTopicLoading = useTypingStore((state) => state.isTopicLoading);
  const isTopicGenerating = useTypingStore((state) => state.isTopicGenerating);
  const topicGenerateError = useTypingStore((state) => state.topicGenerateError);
  const resetTopicToGuideScreen = useTypingStore((state) => state.resetTopicToGuideScreen);

  const showTopicFatalError =
    mode === "topic" && topicGenerateError != null && !isTopicLoading && !isTopicGenerating;

  useTopicFatalErrorReset(showTopicFatalError, resetTopicToGuideScreen);

  return (
    <div className="typing-area">
      <div className="practice-content-width">
        {!hideToolbar && <PracticePanelToolbar />}
        <TopicRemainingBadge />
        <PracticeTextContainer />
      </div>
    </div>
  );
};
