"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AlignResult } from "@/utils/mvsa";
import {
  computeCursorJumpIndex,
  findLineStartSpaceIndices,
  isAlignmentSpace,
  lineStartIndicesEqual,
} from "./practiceTextLayout";

export const TYPING_TEXT_CONTAINER_ID = "typing-text-container";

type LayoutCache = {
  tops: number[];
  lefts: number[];
  isSpace: boolean[];
  length: number;
};

function measureCharRect(index: number, containerLeft: number): { top: number; left: number } {
  const el = document.getElementById(`text-char-${index}`);
  const rect = el?.getBoundingClientRect();
  return {
    top: rect?.top ?? 0,
    left: (rect?.left ?? 0) - containerLeft,
  };
}

function syncIsSpace(diffResult: readonly AlignResult[], isSpace: boolean[]) {
  for (let i = 0; i < diffResult.length; i++) {
    isSpace[i] = isAlignmentSpace(diffResult[i]);
  }
}

function resizeLayoutArrays(cache: LayoutCache, len: number) {
  cache.tops.length = len;
  cache.lefts.length = len;
  cache.isSpace.length = len;
}

export function usePracticeTextLayout(diffResult: readonly AlignResult[], lastInputIndex: number) {
  const cacheRef = useRef<LayoutCache>({ tops: [], lefts: [], isSpace: [], length: 0 });
  const lineStartRef = useRef<ReadonlySet<number>>(new Set());

  const [lineStartSpaceIndices, setLineStartSpaceIndices] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [cursorJumpIndex, setCursorJumpIndex] = useState<number | null>(null);

  const applyLayout = useCallback(
    (tops: number[], lefts: number[], isSpace: boolean[], activeInputIndex: number) => {
      const nextLineStarts = findLineStartSpaceIndices(tops, lefts, isSpace);
      if (!lineStartIndicesEqual(lineStartRef.current, nextLineStarts)) {
        const nextSet = new Set(nextLineStarts);
        lineStartRef.current = nextSet;
        setLineStartSpaceIndices(nextSet);
      }

      const nextJump =
        activeInputIndex === -1
          ? null
          : computeCursorJumpIndex(activeInputIndex, tops, lefts, isSpace);
      setCursorJumpIndex((prev) => (prev === nextJump ? prev : nextJump));
    },
    [],
  );

  const measureTextLayout = useCallback(
    (fullRemeasure: boolean) => {
      const len = diffResult.length;
      const cache = cacheRef.current;

      if (len === 0) {
        cache.tops = [];
        cache.lefts = [];
        cache.isSpace = [];
        cache.length = 0;
        if (lineStartRef.current.size > 0) {
          const empty = new Set<number>();
          lineStartRef.current = empty;
          setLineStartSpaceIndices(empty);
        }
        setCursorJumpIndex((prev) => (prev === null ? prev : null));
        return;
      }

      const container = document.getElementById(TYPING_TEXT_CONTAINER_ID);
      const containerLeft = container?.getBoundingClientRect().left ?? 0;

      const shouldMeasureAll =
        fullRemeasure || cache.length === 0 || (len !== cache.length && lastInputIndex === -1);

      if (shouldMeasureAll) {
        resizeLayoutArrays(cache, len);
        for (let i = 0; i < len; i++) {
          const { top, left } = measureCharRect(i, containerLeft);
          cache.tops[i] = top;
          cache.lefts[i] = left;
        }
      } else {
        if (len !== cache.length) {
          resizeLayoutArrays(cache, len);
        }
        const start = Math.max(0, lastInputIndex - 1);
        for (let i = start; i < len; i++) {
          const { top, left } = measureCharRect(i, containerLeft);
          cache.tops[i] = top;
          cache.lefts[i] = left;
        }
      }

      cache.length = len;
      syncIsSpace(diffResult, cache.isSpace);
      applyLayout(cache.tops, cache.lefts, cache.isSpace, lastInputIndex);
    },
    [applyLayout, diffResult, lastInputIndex],
  );

  useLayoutEffect(() => {
    const handle = requestAnimationFrame(() => {
      measureTextLayout(false);
    });
    return () => cancelAnimationFrame(handle);
  }, [measureTextLayout]);

  const resizeRafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current);
      }
      resizeRafRef.current = requestAnimationFrame(() => {
        measureTextLayout(true);
      });
    };

    window.addEventListener("resize", handleResize);

    const container = document.getElementById(TYPING_TEXT_CONTAINER_ID);
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && container ? new ResizeObserver(handleResize) : null;
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

  return { lineStartSpaceIndices, cursorJumpIndex };
}
