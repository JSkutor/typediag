import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCylindricalDiagnostics } from "./useCylindricalDiagnostics";
import { KeyEvent } from "@/lib/skdm";

describe("useCylindricalDiagnostics additionalStats", () => {
  it("should return zeros for empty events", () => {
    const { result } = renderHook(() => useCylindricalDiagnostics([], "a"));
    expect(result.current.additionalStats).toEqual({
      errorInducementRate: 0,
      errorInducementCount: 0,
      totalErrorStartsCount: 0,
      lateKeystrokeRate: 0,
      lateKeystrokeCount: 0,
      totalErrorsCount: 0,
    });
  });

  it("should calculate errorInducementRate correctly", () => {
    // 0. x->a (isCorrect: true) -> 정타
    // 1. y->b (isCorrect: true) -> 정타
    // 2. b->a (isCorrect: false) -> 오타 시작점! (이전 y->b가 정타이므로). toKey가 "a"이므로 오타 유발 대상.
    // 3. a->a (isCorrect: false) -> 오타 시작점 아님! (이전 b->a가 오타이므로).
    // 4. a->c (isCorrect: false) -> 오타 시작점 아님! (이전 a->a가 오타이므로).
    // 5. c->d (isCorrect: true) -> 정타
    // 6. d->e (isCorrect: false) -> 오타 시작점! (이전 c->d가 정타이므로). toKey가 "e"이므로 "a"와 매칭되지 않음.
    const events: KeyEvent[] = [
      { fromKey: "x", toKey: "a", latencyMs: 100, isCorrect: true },
      { fromKey: "y", toKey: "b", latencyMs: 100, isCorrect: true },
      { fromKey: "b", toKey: "a", latencyMs: 100, isCorrect: false }, // 오타 시작점 (1) - toKey: "a"
      { fromKey: "a", toKey: "a", latencyMs: 100, isCorrect: false },
      { fromKey: "a", toKey: "c", latencyMs: 100, isCorrect: false },
      { fromKey: "c", toKey: "d", latencyMs: 100, isCorrect: true },
      { fromKey: "d", toKey: "e", latencyMs: 100, isCorrect: false }, // 오타 시작점 (2) - toKey: "e"
    ];

    const { result } = renderHook(() => useCylindricalDiagnostics(events, "a"));
    
    // totalErrorStartsCount: 2개 (b->a, d->e)
    // errorInducementCount: 1개 (b->a)
    // 따라서 1/2 = 50%
    expect(result.current.additionalStats.totalErrorStartsCount).toBe(2);
    expect(result.current.additionalStats.errorInducementCount).toBe(1);
    expect(result.current.additionalStats.errorInducementRate).toBe(50);
  });

  it("should calculate lateKeystrokeRate (key swap error) correctly", () => {
    // 원래 "abc"를 입력하려다 순서가 바뀌어 "acb"를 입력한 경우
    // 올바른 자소: a -> b -> c
    // 실제 입력: a(correct) -> c(incorrect, expected b) -> b(incorrect, expected c)
    // toKey가 "b"인 경우
    // events[k] (curr): toKey "c", expectedChar "b", isCorrect false
    // events[k+1] (next): toKey "b", expectedChar "c", isCorrect false
    // prev: toKey "a", isCorrect true
    
    const events: KeyEvent[] = [
      { fromKey: null, toKey: "a", latencyMs: 100, isCorrect: true, expectedChar: "a" },
      { fromKey: "a", toKey: "c", latencyMs: 150, isCorrect: false, expectedChar: "b" },
      { fromKey: "c", toKey: "b", latencyMs: 120, isCorrect: false, expectedChar: "c" },
    ];

    const { result } = renderHook(() => useCylindricalDiagnostics(events, "b"));

    // toKey가 "b"인 오타 (totalErrorsCount) : c->b (isCorrect false, toKey "b") = 1개
    // swappedErrors (lateKeystrokeCount):
    // k = 1 일 때, curr = c, next = b
    // curr.isCorrect === false, next.isCorrect === false
    // next.toKey === "b" (selectedTo)
    // curr.expectedChar === "b" (selectedTo)
    // prev (events[0]): isCorrect === true
    // 조건 일치! lateKeystrokeCount = 1개
    // 따라서 1/1 = 100%
    expect(result.current.additionalStats.totalErrorsCount).toBe(1);
    expect(result.current.additionalStats.lateKeystrokeCount).toBe(1);
    expect(result.current.additionalStats.lateKeystrokeRate).toBe(100);
  });
});
