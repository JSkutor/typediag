import { describe, expect, it } from "vitest";
import type { KeyEvent } from "@/lib/skdm";
import {
  FATAL_NGRAM_ERROR_RATE_THRESHOLD,
  FATAL_NGRAM_MIN_SAMPLES,
  buildDiagnosticsAccumulator,
  finalizeKeystrokeDiagnostics,
  selectFatalNgrams,
} from "./cylindricalStats";

function makeAlphaTriplet(
  prefix: [string, string],
  third: { toKey: string; isCorrect: boolean; expectedChar?: string },
  latencyMs = 100,
): KeyEvent[] {
  const [k1, k2] = prefix;
  return [
    { fromKey: null, toKey: k1, latencyMs, isCorrect: true, expectedChar: k1 },
    { fromKey: k1, toKey: k2, latencyMs, isCorrect: true, expectedChar: k2 },
    {
      fromKey: k2,
      toKey: third.toKey,
      latencyMs,
      isCorrect: third.isCorrect,
      expectedChar: third.expectedChar ?? third.toKey,
    },
  ];
}

function repeatEvents(block: KeyEvent[], times: number): KeyEvent[] {
  return Array.from({ length: times }, () => block).flat();
}

describe("selectFatalNgrams", () => {
  it("returns all patterns above error-rate threshold with minimum sample count", () => {
    const ngrams = new Map<string, { total: number; error: number }>([
      ["a→b", { total: 12, error: 3 }], // 25%
      ["c→d", { total: 10, error: 2 }], // 20% — excluded (must be > 20)
      ["e→f", { total: 9, error: 3 }],
      ["g→h", { total: 15, error: 4 }], // 26.7%
    ]);

    const result = selectFatalNgrams(ngrams, "k");

    expect(result).toEqual([
      { sequence: ["g", "h", "k"], errorRate: (4 / 15) * 100, totalCount: 15 },
      { sequence: ["a", "b", "k"], errorRate: 25, totalCount: 12 },
    ]);
  });

  it("returns empty array when no pattern meets filters", () => {
    const ngrams = new Map<string, { total: number; error: number }>([
      ["a→b", { total: 20, error: 1 }],
    ]);

    expect(selectFatalNgrams(ngrams, "k")).toEqual([]);
  });

  it("exports filter constants", () => {
    expect(FATAL_NGRAM_MIN_SAMPLES).toBe(10);
    expect(FATAL_NGRAM_ERROR_RATE_THRESHOLD).toBe(20);
  });
});

describe("buildDiagnosticsAccumulator · 3-Gram", () => {
  it("attributes K₃ typo to expected layout key", () => {
    const events = makeAlphaTriplet(["s", "d"], { toKey: "j", isCorrect: false, expectedChar: "k" });
    const acc = buildDiagnosticsAccumulator(events);
    const ngrams = acc.perKey.get("k")?.contextualTypos.ngrams;

    expect(ngrams?.get("s→d")).toEqual({ total: 1, error: 1 });
    expect(acc.perKey.get("j")?.contextualTypos.ngrams.size ?? 0).toBe(0);
  });

  it("counts K₃ correct toward total only", () => {
    const events = makeAlphaTriplet(["s", "d"], { toKey: "k", isCorrect: true });
    const acc = buildDiagnosticsAccumulator(events);

    expect(acc.perKey.get("k")?.contextualTypos.ngrams.get("s→d")).toEqual({ total: 1, error: 0 });
  });

  it("computes error rate from K₃ correct + incorrect attempts", () => {
    const events = [
      ...repeatEvents(makeAlphaTriplet(["s", "d"], { toKey: "k", isCorrect: true }), 7),
      ...repeatEvents(
        makeAlphaTriplet(["s", "d"], { toKey: "j", isCorrect: false, expectedChar: "k" }),
        3,
      ),
    ];
    const acc = buildDiagnosticsAccumulator(events);

    expect(acc.perKey.get("k")?.contextualTypos.ngrams.get("s→d")).toEqual({ total: 10, error: 3 });
  });

  it("does not count when K₁ or K₂ is incorrect", () => {
    const wrongK1: KeyEvent[] = [
      { fromKey: null, toKey: "s", latencyMs: 100, isCorrect: false, expectedChar: "s" },
      { fromKey: "s", toKey: "d", latencyMs: 100, isCorrect: true, expectedChar: "d" },
      { fromKey: "d", toKey: "j", latencyMs: 100, isCorrect: false, expectedChar: "k" },
    ];
    const wrongK2: KeyEvent[] = [
      { fromKey: null, toKey: "s", latencyMs: 100, isCorrect: true, expectedChar: "s" },
      { fromKey: "s", toKey: "d", latencyMs: 100, isCorrect: false, expectedChar: "d" },
      { fromKey: "d", toKey: "j", latencyMs: 100, isCorrect: false, expectedChar: "k" },
    ];

    expect(
      buildDiagnosticsAccumulator(wrongK1).perKey.get("k")?.contextualTypos.ngrams.get("s→d"),
    ).toBeUndefined();
    expect(
      buildDiagnosticsAccumulator(wrongK2).perKey.get("k")?.contextualTypos.ngrams.get("s→d"),
    ).toBeUndefined();
  });

  it("breaks prefix window when a non-alpha or special key appears between strokes", () => {
    const events: KeyEvent[] = [
      { fromKey: null, toKey: "s", latencyMs: 100, isCorrect: true },
      { fromKey: "s", toKey: "d", latencyMs: 100, isCorrect: true },
      { fromKey: "d", toKey: "space", latencyMs: 80, isCorrect: true },
      { fromKey: "space", toKey: "k", latencyMs: 100, isCorrect: false, expectedChar: "k" },
    ];
    const acc = buildDiagnosticsAccumulator(events);

    expect(acc.perKey.get("k")?.contextualTypos.ngrams.get("s→d")).toBeUndefined();
  });

  it("clears prefix window on backspace and enter", () => {
    const beforeBackspace: KeyEvent[] = [
      ...makeAlphaTriplet(["s", "d"], { toKey: "f", isCorrect: true }),
      { fromKey: "f", toKey: "backspace", latencyMs: 80, isCorrect: true },
      ...makeAlphaTriplet(["s", "d"], { toKey: "k", isCorrect: false, expectedChar: "k" }),
    ];
    const beforeEnter: KeyEvent[] = [
      ...makeAlphaTriplet(["s", "d"], { toKey: "f", isCorrect: true }),
      { fromKey: "f", toKey: "enter", latencyMs: 80, isCorrect: true },
      ...makeAlphaTriplet(["s", "d"], { toKey: "j", isCorrect: false, expectedChar: "k" }),
    ];

    expect(
      buildDiagnosticsAccumulator(beforeBackspace).perKey.get("k")?.contextualTypos.ngrams.get("s→d"),
    ).toEqual({ total: 1, error: 1 });
    expect(
      buildDiagnosticsAccumulator(beforeEnter).perKey.get("k")?.contextualTypos.ngrams.get("s→d"),
    ).toEqual({ total: 1, error: 1 });
  });

  it("finalizeKeystrokeDiagnostics surfaces patterns above thresholds", () => {
    const events = [
      ...repeatEvents(makeAlphaTriplet(["s", "d"], { toKey: "k", isCorrect: true }), 7),
      ...repeatEvents(
        makeAlphaTriplet(["s", "d"], { toKey: "j", isCorrect: false, expectedChar: "k" }),
        3,
      ),
      ...repeatEvents(makeAlphaTriplet(["f", "j"], { toKey: "k", isCorrect: true }), 8),
      ...repeatEvents(
        makeAlphaTriplet(["f", "j"], { toKey: "l", isCorrect: false, expectedChar: "k" }),
        4,
      ),
    ];

    const diagnostics = finalizeKeystrokeDiagnostics(buildDiagnosticsAccumulator(events), "k");

    expect(diagnostics.fatalNgrams).toEqual([
      { sequence: ["f", "j", "k"], errorRate: (4 / 12) * 100, totalCount: 12 },
      { sequence: ["s", "d", "k"], errorRate: 30, totalCount: 10 },
    ]);
  });

  it("excludes patterns below sample or error-rate thresholds", () => {
    const events = [
      ...repeatEvents(makeAlphaTriplet(["s", "d"], { toKey: "k", isCorrect: true }), 9),
      ...makeAlphaTriplet(["s", "d"], { toKey: "j", isCorrect: false, expectedChar: "k" }),
      ...repeatEvents(makeAlphaTriplet(["a", "b"], { toKey: "k", isCorrect: true }), 10),
      ...makeAlphaTriplet(["a", "b"], { toKey: "j", isCorrect: false, expectedChar: "k" }),
    ];

    const diagnostics = finalizeKeystrokeDiagnostics(buildDiagnosticsAccumulator(events), "k");

    expect(diagnostics.fatalNgrams).toEqual([]);
  });
});
