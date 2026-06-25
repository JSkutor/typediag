import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCylindricalDiagnostics } from "./useCylindricalDiagnostics";
import { KeyEvent } from "@/lib/skdm";
import { keyDistanceU } from "@/lib/skdm/geometry";

describe("useCylindricalDiagnostics diagnostics", () => {
  it("should return zeros for empty events in error metrics", () => {
    const { result } = renderHook(() => useCylindricalDiagnostics([], "a"));
    expect(result.current.diagnostics.errorInducement).toEqual({
      rate: 0,
      count: 0,
      totalErrorStartsCount: 0,
    });
    expect(result.current.diagnostics.lateKeystroke).toEqual({
      rate: 0,
      count: 0,
      totalErrorsCount: 0,
    });
  });

  it("should calculate errorInducement rate correctly (expectedChar attribution)", () => {
    // 0. x->a (correct)
    // 1. y->b (correct)
    // 2. b->g (incorrect, expected a) -> streak start, attributed to layout key "a"
    // 3. g->a (incorrect) -> not a streak start
    // 4. a->c (incorrect) -> not a streak start
    // 5. c->d (correct)
    // 6. d->x (incorrect, expected e) -> streak start, attributed to "e" (not focusKey "a")
    const events: KeyEvent[] = [
      { fromKey: "x", toKey: "a", latencyMs: 100, isCorrect: true },
      { fromKey: "y", toKey: "b", latencyMs: 100, isCorrect: true },
      {
        fromKey: "b",
        toKey: "g",
        latencyMs: 100,
        isCorrect: false,
        expectedChar: "a",
      },
      { fromKey: "g", toKey: "a", latencyMs: 100, isCorrect: false, expectedChar: "a" },
      { fromKey: "a", toKey: "c", latencyMs: 100, isCorrect: false, expectedChar: "c" },
      { fromKey: "c", toKey: "d", latencyMs: 100, isCorrect: true },
      {
        fromKey: "d",
        toKey: "x",
        latencyMs: 100,
        isCorrect: false,
        expectedChar: "e",
      },
    ];

    const { result } = renderHook(() => useCylindricalDiagnostics(events, "a"));

    expect(result.current.diagnostics.errorInducement.totalErrorStartsCount).toBe(2);
    expect(result.current.diagnostics.errorInducement.count).toBe(1);
    expect(result.current.diagnostics.errorInducement.rate).toBe(50);
  });

  it("should attribute errorInducement by expectedChar when physical toKey differs", () => {
    const events: KeyEvent[] = [
      { fromKey: null, toKey: "a", latencyMs: 0, isCorrect: true },
      { fromKey: "a", toKey: "g", latencyMs: 100, isCorrect: false, expectedChar: "f" },
    ];

    const { result } = renderHook(() => useCylindricalDiagnostics(events, "f"));

    expect(result.current.diagnostics.errorInducement.totalErrorStartsCount).toBe(1);
    expect(result.current.diagnostics.errorInducement.count).toBe(1);
    expect(result.current.diagnostics.errorInducement.rate).toBe(100);
  });

  it("should calculate lateKeystroke (key swap error) correctly", () => {
    // 원래 "abc"를 입력하려다 순서가 바뀌어 "acb"를 입력한 경우
    // 올바른 자소: a -> b -> c
    // 실제 입력: a(correct) -> c(incorrect, expected b) -> b(incorrect, expected c)
    // toKey가 "b"인 경우
    // events[k] (event): toKey "c", expectedChar "b", isCorrect false
    // events[k+1] (followingEvent): toKey "b", expectedChar "c", isCorrect false
    // precedingEvent: toKey "a", isCorrect true

    const events: KeyEvent[] = [
      { fromKey: null, toKey: "a", latencyMs: 100, isCorrect: true, expectedChar: "a" },
      { fromKey: "a", toKey: "c", latencyMs: 150, isCorrect: false, expectedChar: "b" },
      { fromKey: "c", toKey: "b", latencyMs: 120, isCorrect: false, expectedChar: "c" },
    ];

    const { result } = renderHook(() => useCylindricalDiagnostics(events, "b"));

    // toKey가 "b"인 오타 (totalErrorsCount) : c->b (isCorrect false, toKey "b") = 1개
    // swappedErrors (count):
    // k = 1 일 때, event = c, followingEvent = b
    // event.isCorrect === false, followingEvent.isCorrect === false
    // followingEvent.toKey === "b" (focusKey)
    // event.expectedChar === "b" (focusKey)
    // precedingEvent (events[0]): isCorrect === true
    // 조건 일치! count = 1개
    // 따라서 1/1 = 100%
    expect(result.current.diagnostics.lateKeystroke.totalErrorsCount).toBe(1);
    expect(result.current.diagnostics.lateKeystroke.count).toBe(1);
    expect(result.current.diagnostics.lateKeystroke.rate).toBe(100);
  });

  describe("commonPair & unconsciousKey & shiftPenalty", () => {
    it("should return empty structures for empty events", () => {
      const { result } = renderHook(() => useCylindricalDiagnostics([], "a"));
      expect(result.current.diagnostics.commonPair).toBeNull();
      expect(result.current.diagnostics.unconsciousKey).toBeNull();
      expect(result.current.diagnostics.shiftPenalty).toBeNull();
    });

    it("should calculate commonPair correctly for focusKey and filter non-alphabetic keys", () => {
      const events: KeyEvent[] = [
        { fromKey: "a", toKey: "b", latencyMs: 100, isCorrect: true },
        { fromKey: "b", toKey: "c", latencyMs: 100, isCorrect: true },
        { fromKey: "c", toKey: "shift_l", latencyMs: 100, isCorrect: true }, // shift_l is excluded
        { fromKey: "shift_l", toKey: "d", latencyMs: 100, isCorrect: true }, // shift_l is excluded
        { fromKey: "d", toKey: "a", latencyMs: 100, isCorrect: false }, // incorrect, excluded
        { fromKey: "a", toKey: "space", latencyMs: 100, isCorrect: true }, // space is non-alphabetic, excluded
        { fromKey: "a", toKey: "b", latencyMs: 100, isCorrect: true }, // repeated a->b
      ];

      // focusKey "b" → a→b (Rank #1)
      const { result: resB } = renderHook(() => useCylindricalDiagnostics(events, "b"));
      expect(resB.current.diagnostics.commonPair).toEqual({
        rank: 1,
        from: "a",
        to: "b",
        count: 2,
      });

      // focusKey "c" → b→c (Rank #2)
      const { result: resC } = renderHook(() => useCylindricalDiagnostics(events, "c"));
      expect(resC.current.diagnostics.commonPair).toEqual({
        rank: 2,
        from: "b",
        to: "c",
        count: 1,
      });

      // focusKey "d" (not in top pairs) → null
      const { result: resD } = renderHook(() => useCylindricalDiagnostics(events, "d"));
      expect(resD.current.diagnostics.commonPair).toBeNull();
    });

    it("should calculate unconsciousKey correctly for focusKey and exclude 0% error keys", () => {
      const events: KeyEvent[] = [
        { fromKey: "a", toKey: "b", latencyMs: 100, isCorrect: false }, // error rate 100%
        { fromKey: "b", toKey: "c", latencyMs: 100, isCorrect: false },
        { fromKey: "c", toKey: "c", latencyMs: 100, isCorrect: true }, // error rate 50%
        { fromKey: "c", toKey: "d", latencyMs: 100, isCorrect: false },
        { fromKey: "d", toKey: "d", latencyMs: 100, isCorrect: false }, // error rate 100% (2 total, 2 incorrect)
      ];

      // focusKey "d" → Rank #1
      const { result: resD } = renderHook(() => useCylindricalDiagnostics(events, "d"));
      expect(resD.current.diagnostics.unconsciousKey).toEqual({
        rank: 1,
        key: "d",
        errorRate: 100,
        errorCount: 2,
        totalCount: 2,
      });

      // focusKey "b" → Rank #2
      const { result: resB } = renderHook(() => useCylindricalDiagnostics(events, "b"));
      expect(resB.current.diagnostics.unconsciousKey).toEqual({
        rank: 2,
        key: "b",
        errorRate: 100,
        errorCount: 1,
        totalCount: 1,
      });

      // focusKey "a" (errorRate 0%) → null
      const { result: resA } = renderHook(() => useCylindricalDiagnostics(events, "a"));
      expect(resA.current.diagnostics.unconsciousKey).toBeNull();
    });

    it("should calculate shiftPenalty when shift count >= 10 and difference is positive", () => {
      const events: KeyEvent[] = [];

      // 1. Difference is positive (+150ms)
      for (let i = 0; i < 10; i++) {
        events.push({
          fromKey: "a",
          toKey: "g",
          latencyMs: 100,
          isCorrect: true,
          expectedChar: "ㅇ",
        });
        events.push({
          fromKey: "a",
          toKey: "q",
          latencyMs: 250,
          isCorrect: true,
          expectedChar: "ㅃ",
        });
      }
      const { result: resPositive } = renderHook(() => useCylindricalDiagnostics(events, "a"));
      expect(resPositive.current.diagnostics.shiftPenalty).toEqual({
        shiftMedianMs: 250,
        nonShiftMedianMs: 100,
        differenceMs: 150,
        shiftCount: 10,
      });

      // 2. Difference is negative (-50ms) -> should suppress and return null
      const negativeEvents: KeyEvent[] = [];
      for (let i = 0; i < 10; i++) {
        negativeEvents.push({
          fromKey: "a",
          toKey: "g",
          latencyMs: 200,
          isCorrect: true,
          expectedChar: "ㅇ",
        });
        negativeEvents.push({
          fromKey: "a",
          toKey: "q",
          latencyMs: 150,
          isCorrect: true,
          expectedChar: "ㅃ",
        });
      }
      const { result: resNegative } = renderHook(() =>
        useCylindricalDiagnostics(negativeEvents, "a"),
      );
      expect(resNegative.current.diagnostics.shiftPenalty).toBeNull();
    });
  });

  describe("speed & correlation & transitions & relative", () => {
    it("should return default stats when events are empty", () => {
      const { result } = renderHook(() => useCylindricalDiagnostics([], "f"));
      expect(result.current.diagnostics.speedMetrics.medianLatencyMs).toBe(0);
      expect(result.current.diagnostics.speedMetrics.equivalentCpm).toBe(0);
      expect(result.current.diagnostics.hesitation.ratio).toBe(0);
    });

    it("should calculate median latency and CPM correctly", () => {
      const events: KeyEvent[] = [
        { fromKey: "a", toKey: "f", latencyMs: 150, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 250, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 200, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 500, isCorrect: false }, // incorrect should be ignored
      ];
      // Median latency of [150, 200, 250] is 200ms
      // CPM is 60000 / 200 = 300 CPM
      const { result } = renderHook(() => useCylindricalDiagnostics(events, "f"));
      expect(result.current.diagnostics.speedMetrics.medianLatencyMs).toBe(200);
      expect(result.current.diagnostics.speedMetrics.equivalentCpm).toBe(300);
    });

    it("should calculate hesitation ratio based on IQR threshold", () => {
      // 10 samples: [100, 110, 120, 130, 140, 150, 160, 170, 180, 500 (outlier)]
      const events: KeyEvent[] = [
        { fromKey: "a", toKey: "f", latencyMs: 100, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 110, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 120, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 130, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 140, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 150, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 160, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 170, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 180, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 500, isCorrect: true }, // Outlier
      ];

      const { result } = renderHook(() => useCylindricalDiagnostics(events, "f"));
      // 500 should be detected as an outlier since IQR is around 45ms and Q3 + 1.5 * IQR is around 235ms.
      expect(result.current.diagnostics.hesitation.ratio).toBe(10); // 1 out of 10
      expect(result.current.diagnostics.hesitation.hasTendency).toBe(true);
    });

    it("should compute finger transition ratios correctly for focusKey", () => {
      // focusKey "f" (Left hand, Index finger)
      // fromKeys:
      // - "y" (Right hand, Index finger) -> oppositeHand
      // - "a" (Left hand, Pinky) -> sameHandPinky
      // - "s" (Left hand, Ring) -> sameHandRing
      // - "d" (Left hand, Middle) -> sameHandMiddle
      // - "g" (Left hand, Index) -> sameHandIndex
      // - "space" (No meta/non-alphabetic) -> other
      const events: KeyEvent[] = [
        { fromKey: "y", toKey: "f", latencyMs: 100, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 100, isCorrect: true },
        { fromKey: "s", toKey: "f", latencyMs: 100, isCorrect: true },
        { fromKey: "d", toKey: "f", latencyMs: 100, isCorrect: true },
        { fromKey: "g", toKey: "f", latencyMs: 100, isCorrect: true },
        { fromKey: "space", toKey: "f", latencyMs: 100, isCorrect: true },
      ];

      const { result } = renderHook(() => useCylindricalDiagnostics(events, "f"));
      const ratios = result.current.diagnostics.fingerTransitions.ratios;

      // Total transitions = 6. Each counts for ~16.67%
      expect(ratios.oppositeHand).toBeCloseTo(16.67, 1);
      expect(ratios.sameHandPinky).toBeCloseTo(16.67, 1);
      expect(ratios.sameHandRing).toBeCloseTo(16.67, 1);
      expect(ratios.sameHandMiddle).toBeCloseTo(16.67, 1);
      expect(ratios.sameHandIndex).toBeCloseTo(16.67, 1);
      expect(ratios.other).toBeCloseTo(16.67, 1);
    });

    it("should calculate relative speed compared to the same hand", () => {
      // Target key "f" is on Left hand
      // Other keys on Left hand: "d" and "s"
      const events: KeyEvent[] = [
        { fromKey: "a", toKey: "f", latencyMs: 200, isCorrect: true }, // Target median is 200ms
        { fromKey: "a", toKey: "d", latencyMs: 150, isCorrect: true },
        { fromKey: "a", toKey: "s", latencyMs: 170, isCorrect: true },
        { fromKey: "a", toKey: "j", latencyMs: 100, isCorrect: true }, // Right hand (should be ignored)
      ];

      const { result } = renderHook(() => useCylindricalDiagnostics(events, "f"));
      // Other left hand keys: [150, 170], median is 160ms.
      // relativeSpeedMs = 200 - 160 = +40ms
      expect(result.current.diagnostics.relativeSpeed.handMedianMs).toBe(160);
      expect(result.current.diagnostics.relativeSpeed.speedDiffMs).toBe(40);
    });
  });

  describe("latencyConsistency (MAD)", () => {
    it("returns null when fewer than 5 correct samples", () => {
      const events: KeyEvent[] = [
        { fromKey: "a", toKey: "f", latencyMs: 100, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 110, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 105, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 95, isCorrect: true },
      ];

      const { result } = renderHook(() => useCylindricalDiagnostics(events, "f"));
      expect(result.current.diagnostics.latencyConsistency).toBeNull();
    });

    it("classifies steady typing with low relative MAD", () => {
      const events: KeyEvent[] = Array.from({ length: 8 }, (_, i) => ({
        fromKey: "a",
        toKey: "f",
        latencyMs: 100 + (i % 2 === 0 ? 5 : -5),
        isCorrect: true as const,
      }));

      const { result } = renderHook(() => useCylindricalDiagnostics(events, "f"));
      const consistency = result.current.diagnostics.latencyConsistency;

      expect(consistency).not.toBeNull();
      expect(consistency!.level).toBe("steady");
      expect(consistency!.madMs).toBe(5);
      expect(consistency!.relativeMad).toBeCloseTo(0.05, 2);
      expect(consistency!.histogram).toHaveLength(12);
    });

    it("classifies erratic typing with high relative MAD", () => {
      const events: KeyEvent[] = [
        { fromKey: "a", toKey: "f", latencyMs: 20, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 50, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 80, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 110, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 140, isCorrect: true },
        { fromKey: "a", toKey: "f", latencyMs: 200, isCorrect: true },
      ];

      const { result } = renderHook(() => useCylindricalDiagnostics(events, "f"));
      const consistency = result.current.diagnostics.latencyConsistency;

      expect(consistency).not.toBeNull();
      expect(consistency!.level).toBe("erratic");
      expect(consistency!.relativeMad).toBeGreaterThan(0.35);
    });
  });

  describe("spatialErrorDistance", () => {
    it("is exposed via useCylindricalDiagnostics", () => {
      const events: KeyEvent[] = [
        { fromKey: "a", toKey: "f", latencyMs: 100, isCorrect: true, expectedChar: null },
        { fromKey: "a", toKey: "g", latencyMs: 100, isCorrect: false, expectedChar: "f" },
      ];

      const { result } = renderHook(() => useCylindricalDiagnostics(events, "f"));

      expect(result.current.diagnostics.spatialErrorDistance).not.toBeNull();
      expect(result.current.diagnostics.spatialErrorDistance!.sampleCount).toBe(1);
      expect(result.current.diagnostics.spatialErrorDistance!.quartilesU.q2).toBeCloseTo(
        keyDistanceU("f", "g")!,
        5,
      );
    });
  });
});
