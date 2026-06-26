"use client";

import React from "react";
import { useTypingStore, TypingMode } from "@/store/useTypingStore";
import {
  buildPracticeWordGroups,
  computeCursorJumpIndex,
  findLineStartSpaceIndices,
  formatPracticeChar,
  isAlignmentSpace,
} from "./practiceTextLayout";
import { TopicLoadingOverlay } from "./TopicLoadingOverlay";
import { useTopicFatalErrorReset } from "./useTopicFatalErrorReset";
import { getTopicRemainingLabel, getTopicLang } from "@/lib/practice/topicLoading";

const TYPING_MODES: TypingMode[] = ["normal", "topic", "hardcore", "plain"];

export const PracticePanel: React.FC = () => {
  const {
    qwertyBuffer,
    alignments: diffResult,
    mode,
    setMode,
    topicTargets,
    topicTargetIndex,
    isTopicInputActive,
    isTopicLoading,
    isTopicGenerating,
    isTopicWaitingForGenerate,
    topicGenerateError,
    targetLanguage,
    setTargetLanguage,
    resetTopicToGuideScreen,
  } = useTypingStore();

  const isEn = targetLanguage === "en";
  const topicLang = getTopicLang(targetLanguage);

  const showTopicInitialLoading = mode === "topic" && isTopicLoading;
  const showTopicPracticeOverlay =
    mode === "topic" &&
    !isTopicLoading &&
    (isTopicWaitingForGenerate || topicGenerateError != null);
  const showTopicFatalError =
    mode === "topic" &&
    topicGenerateError != null &&
    !isTopicLoading &&
    !isTopicGenerating;
  const topicLoadingVariant = isTopicGenerating ? "generate" : "search";

  useTopicFatalErrorReset(showTopicFatalError, resetTopicToGuideScreen);

  const lastInputIndex = React.useMemo(() => {
    return diffResult.findLastIndex((d) => d.inputIndex !== undefined);
  }, [diffResult]);

  const [cursorJumpIndex, setCursorJumpIndex] = React.useState<number | null>(null);
  const [lineStartSpaceIndices, setLineStartSpaceIndices] = React.useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const measureTextLayout = React.useCallback(() => {
    const len = diffResult.length;
    if (len === 0) {
      setLineStartSpaceIndices(new Set());
      setCursorJumpIndex(null);
      return;
    }

    const container = document.getElementById("typing-text-container");
    const containerLeft = container?.getBoundingClientRect().left ?? 0;
    const tops: number[] = [];
    const lefts: number[] = [];
    const isSpace: boolean[] = [];

    for (let i = 0; i < len; i++) {
      const el = document.getElementById(`text-char-${i}`);
      const rect = el?.getBoundingClientRect();
      tops[i] = rect?.top ?? 0;
      lefts[i] = (rect?.left ?? 0) - containerLeft;
      isSpace[i] = isAlignmentSpace(diffResult[i]);
    }

    setLineStartSpaceIndices(new Set(findLineStartSpaceIndices(tops, lefts, isSpace)));
    setCursorJumpIndex(
      lastInputIndex === -1
        ? null
        : computeCursorJumpIndex(lastInputIndex, tops, lefts, isSpace),
    );
  }, [diffResult, lastInputIndex]);

  React.useLayoutEffect(() => {
    measureTextLayout();
    const handle = requestAnimationFrame(() => {
      measureTextLayout();
    });
    return () => cancelAnimationFrame(handle);
  }, [measureTextLayout]);

  const resizeRafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const handleResize = () => {
      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current);
      }
      resizeRafRef.current = requestAnimationFrame(() => {
        measureTextLayout();
      });
    };

    window.addEventListener("resize", handleResize);

    const container = document.getElementById("typing-text-container");
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && container
        ? new ResizeObserver(() => {
            handleResize();
          })
        : null;
    if (container) {
      resizeObserver?.observe(container);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current);
      }
    };
  }, [measureTextLayout]);

  return (
    <div className="typing-area">
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

      {mode === "topic" && !isTopicInputActive && topicTargets.length > 0 && (
        <div className="topic-remaining-badge">
          {getTopicRemainingLabel(topicLang, topicTargets.length - topicTargetIndex)}
        </div>
      )}

      <div
        id="typing-text-container"
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
          <TopicLoadingOverlay
            isActive
            isEn={isEn}
            variant={topicLoadingVariant}
          />
        ) : (
          <>
            {mode === "plain" && qwertyBuffer.length === 0 && (
              <span className="plain-mode-hint">
                {isEn ? "Type freely here..." : "여기에 자유롭게 입력하세요..."}
              </span>
            )}
            {diffResult.length === 0 && <span className="typing-cursor left" />}
            {(() => {
              const groups = buildPracticeWordGroups(diffResult);

              return groups.map((group, groupIdx) => {
                const content = group.items.map(({ index: i }) => {
                  const d = diffResult[i];
                  const isOmitted = d.op === "OMIT";

                  let highlightClass = "";
                  if (d.op === "EQUAL" || d.op === "PARTIAL") highlightClass = "text-char-primary";
                  else if (d.op === "INSERT" || d.op === "REPLACE")
                    highlightClass = "text-char-error text-char-error-dim";

                  if (d.op === "INSERT" && d.char === " ") {
                    highlightClass += " text-char-space-error";
                  }

                  const isWrapHiddenSpace = lineStartSpaceIndices.has(i);
                  const showCursorRight =
                    qwertyBuffer.length > 0 &&
                    i === lastInputIndex &&
                    cursorJumpIndex === null &&
                    !isWrapHiddenSpace;
                  const showCursorLeft =
                    (qwertyBuffer.length === 0 && i === 0) ||
                    (cursorJumpIndex !== null && i === cursorJumpIndex);

                  return (
                    <span
                      key={i}
                      id={`text-char-${i}`}
                      className={`text-char-container${isWrapHiddenSpace ? " text-char-space-wrap-hidden" : ""}`}
                    >
                      {d.op !== "INSERT" && (
                        <span className={isOmitted ? "text-char-omitted" : "text-char-muted"}>
                          {formatPracticeChar(d.targetChar, isWrapHiddenSpace)}
                        </span>
                      )}

                      {(d.op === "EQUAL" ||
                        d.op === "PARTIAL" ||
                        d.op === "REPLACE" ||
                        d.op === "INSERT") && (
                        <span
                          className={`${d.op !== "INSERT" ? "text-char-overlay" : ""} ${highlightClass}`.trim()}
                        >
                          {formatPracticeChar(d.char, isWrapHiddenSpace)}
                        </span>
                      )}

                      {showCursorLeft && <span className="typing-cursor left" />}
                      {showCursorRight && <span className="typing-cursor right" />}
                    </span>
                  );
                });

                return (
                  <span key={`word-${groupIdx}`} className="word-wrapper">
                    {content}
                  </span>
                );
              });
            })()}
          </>
        )}
      </div>
    </div>
  );
};
