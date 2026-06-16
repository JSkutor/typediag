import { describe, it, expect } from "vitest";
import { filterInterruptedTransitions, filterOutliers } from "./model";
import type { KeyEvent } from "./types";

describe("model unit tests", () => {
  describe("filterInterruptedTransitions", () => {
    it("should drop transitions broken by backspace", () => {
      const events: KeyEvent[] = [
        { fromKey: null, toKey: "a", latencyMs: 0 },
        { fromKey: "a", toKey: "b", latencyMs: 100 },
        { fromKey: "b", toKey: "backspace", latencyMs: 200 },
        { fromKey: "backspace", toKey: "c", latencyMs: 300 }
      ];

      const cleaned = filterInterruptedTransitions(events);
      // 'backspace' itself is dropped. 'backspace' -> 'c' is dropped.
      // 'b' is popped because of the backspace.
      // So only null->'a' remains.
      expect(cleaned.length).toBe(1);
      expect(cleaned[0].toKey).toBe("a");
    });

    it("should drop transitions broken by control keys like ShiftLeft or Enter", () => {
      const events: KeyEvent[] = [
        { fromKey: null, toKey: "a", latencyMs: 0 },
        { fromKey: "a", toKey: "shift_l", latencyMs: 150 },
        { fromKey: "shift_l", toKey: "A", latencyMs: 200 },
        { fromKey: "A", toKey: "b", latencyMs: 100 },
        { fromKey: "b", toKey: "enter", latencyMs: 100 }
      ];

      const cleaned = filterInterruptedTransitions(events);
      // 'shift_l' drops the transition.
      // 'A' to 'b' is clean.
      // 'enter' drops the transition.
      const toKeys = cleaned.map(e => e.toKey);
      expect(toKeys).not.toContain("shift_l");
      expect(toKeys).not.toContain("A"); // The transition shift->A is dropped
      expect(toKeys).toContain("b");
    });
  });

  describe("filterOutliers", () => {
    it("should apply hard cutoff (2000ms)", () => {
      const events: KeyEvent[] = [
        { fromKey: "a", toKey: "b", latencyMs: 100 },
        { fromKey: "b", toKey: "c", latencyMs: 2500 } // Exceeds 2000ms hard cutoff
      ];

      const [valid] = filterOutliers(events);
      expect(valid.length).toBe(1);
      expect(valid[0].toKey).toBe("b");
    });

    it("should apply dynamic log-IQR filtering if event count is sufficient", () => {
      // Create many events around 100ms, and one at 1500ms
      const events: KeyEvent[] = Array.from({ length: 1600 }).map((_, i) => ({
        fromKey: "a",
        toKey: "b",
        latencyMs: 100 + (Math.random() * 20 - 10) // 90~110ms
      }));
      
      events.push({
        fromKey: "b",
        toKey: "c",
        latencyMs: 1500 // Sub 2000ms, but an outlier compared to IQR
      });

      const [valid, maxObserved] = filterOutliers(events);
      expect(valid.length).toBe(1600); // 1500ms event is filtered out by IQR
      expect(maxObserved).toBeLessThan(1500);
    });
  });
});
