import { describe, expect, it } from "vitest";
import { getCloudTypingEffectivenessLabel } from "./effectivenessLabel";
import type { CloudTypingDiagnostics } from "./types";

function makeCloudTyping(overrides: Partial<CloudTypingDiagnostics> = {}): CloudTypingDiagnostics {
  return {
    effectivenessCorrelation: {
      pearsonR: 0,
      pValue: 1,
      isSignificant: false,
      sampleCount: 0,
    },
    effectiveness: "neutral",
    sessionCloudTypingRatio: 0,
    key: null,
    insufficientSample: false,
    analysisPoolCount: 0,
    ...overrides,
  };
}

describe("getCloudTypingEffectivenessLabel", () => {
  it("returns 데이터 부족 when insufficientSample or no key stats", () => {
    expect(
      getCloudTypingEffectivenessLabel(makeCloudTyping({ insufficientSample: true })).label,
    ).toBe("데이터 부족");
    expect(getCloudTypingEffectivenessLabel(makeCloudTyping()).label).toBe("데이터 부족");
  });

  it("maps effectiveness enum to Korean labels", () => {
    const key = {
      key: "f",
      holdMs: 50,
      latencyMs: 120,
      normalizedDifference: 0.1,
      cloudTypingRatio: 0.8,
      sampleCount: 20,
      level: "moderate" as const,
    };

    expect(
      getCloudTypingEffectivenessLabel(makeCloudTyping({ key, effectiveness: "effective" })).label,
    ).toBe("효과 있음");

    expect(
      getCloudTypingEffectivenessLabel(makeCloudTyping({ key, effectiveness: "counterproductive" }))
        .label,
    ).toBe("역효과");

    expect(
      getCloudTypingEffectivenessLabel(makeCloudTyping({ key, effectiveness: "neutral" })).label,
    ).toBe("효과 없음");
  });

  it("returns 관계없음 when neutral and cloud typing is barely used", () => {
    const key = {
      key: "f",
      holdMs: 50,
      latencyMs: 120,
      normalizedDifference: 0.4,
      cloudTypingRatio: 0.2,
      sampleCount: 20,
      level: "not_applied" as const,
    };

    expect(
      getCloudTypingEffectivenessLabel(makeCloudTyping({ key, effectiveness: "neutral" })).label,
    ).toBe("관계없음");
  });
});
