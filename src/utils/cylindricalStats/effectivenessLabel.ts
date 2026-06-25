import type { CloudTypingDiagnostics, CloudTypingEffectiveness } from "./types";

export type CloudTypingEffectivenessLabel =
  | "효과 있음"
  | "효과 없음"
  | "역효과"
  | "관계없음"
  | "데이터 부족";

export type CloudTypingEffectivenessTone = "success" | "warning" | "muted";

const EFFECTIVENESS_LABEL: Record<
  Exclude<CloudTypingEffectiveness, "neutral">,
  CloudTypingEffectivenessLabel
> = {
  effective: "효과 있음",
  counterproductive: "역효과",
};

const EFFECTIVENESS_TONE: Record<
  Exclude<CloudTypingEffectiveness, "neutral">,
  CloudTypingEffectivenessTone
> = {
  effective: "success",
  counterproductive: "warning",
};

export function getCloudTypingEffectivenessLabel(
  cloudTyping: Pick<CloudTypingDiagnostics, "effectiveness" | "insufficientSample" | "key">,
): { label: CloudTypingEffectivenessLabel; tone: CloudTypingEffectivenessTone } {
  if (cloudTyping.insufficientSample || !cloudTyping.key) {
    return { label: "데이터 부족", tone: "muted" };
  }

  if (cloudTyping.effectiveness === "neutral") {
    // 구름 stroke 비율이 낮으면 ND↔L 효과 판정 자체가 성립하지 않음
    if (cloudTyping.key.level === "not_applied") {
      return { label: "관계없음", tone: "muted" };
    }
    return { label: "효과 없음", tone: "muted" };
  }

  return {
    label: EFFECTIVENESS_LABEL[cloudTyping.effectiveness],
    tone: EFFECTIVENESS_TONE[cloudTyping.effectiveness],
  };
}

export function cloudTypingEffectivenessToneClass(
  tone: CloudTypingEffectivenessTone,
): string {
  switch (tone) {
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    case "muted":
      return "text-muted";
  }
}
