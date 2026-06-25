import type { CloudTypingEffectiveness, CloudTypingLevel, KeystrokeDiagnostics } from "@/utils/cylindricalStats";

const CLOUD_TYPING_LEVEL_LABEL: Record<CloudTypingLevel, string> = {
  not_applied: "미적용",
  weak: "약함",
  moderate: "보통",
  strong: "강함",
};

const CLOUD_TYPING_EFFECTIVENESS_LABEL: Record<CloudTypingEffectiveness, string> = {
  effective: "효과적",
  counterproductive: "역효과",
  neutral: "상관 없음",
};

export function CloudTypingView({
  cloudTyping,
}: {
  cloudTyping: KeystrokeDiagnostics["cloudTyping"];
}) {
  const { key: keyStats, effectivenessCorrelation, effectiveness, insufficientSample, analysisPoolCount } =
    cloudTyping;

  if (insufficientSample) {
    return <p className="cyl-diag__empty">데이터 부족</p>;
  }

  if (!keyStats) {
    return <p className="cyl-diag__empty">—</p>;
  }

  const barScale = Math.max(keyStats.latencyMs, keyStats.holdMs, 1);
  const latencyPct = (keyStats.latencyMs / barScale) * 100;
  const holdPct = (keyStats.holdMs / barScale) * 100;

  const ratioPct = (keyStats.cloudTypingRatio * 100).toFixed(0);
  const levelLabel = CLOUD_TYPING_LEVEL_LABEL[keyStats.level];

  const ratioClass = keyStats.level === "not_applied" ? "text-muted" : "text-success";

  const effectLabel = effectivenessCorrelation.isSignificant
    ? CLOUD_TYPING_EFFECTIVENESS_LABEL[effectiveness]
    : "상관 무의미";

  const effectClass =
    effectiveness === "effective"
      ? "text-success"
      : effectiveness === "counterproductive"
        ? "text-danger"
        : "text-muted";

  return (
    <>
      <div className="cyl-diag__cloud-dual">
        <div className={`cyl-diag__cloud-dual-col ${ratioClass}`}>
          <span className="cyl-diag__cloud-dual-val">{ratioPct}%</span>
          <span className="cyl-diag__cloud-dual-sep">·</span>
          <span className="cyl-diag__cloud-dual-lbl">{levelLabel}</span>
        </div>
        <div className={`cyl-diag__cloud-dual-col cyl-diag__cloud-dual-col--end ${effectClass}`}>
          <span className="cyl-diag__cloud-dual-val">{effectLabel}</span>
        </div>
      </div>
      {/* 
      <div className="cyl-diag__cloud-stats">
        <span>n={keyStats.sampleCount}</span>
        <span>r={effectivenessCorrelation.pearsonR.toFixed(2)}</span>
      </div>
      */}
      <div className="cyl-diag__metric-bars">
        <div className="cyl-diag__metric-bar-row">
          <span className="cyl-diag__metric-bar-label">지연</span>
          <div className="cyl-diag__metric-bar-track">
            <div
              className="cyl-diag__metric-bar-fill cyl-diag__metric-bar-fill--latency"
              style={{ width: `${latencyPct}%` }}
            />
          </div>
          <span className="cyl-diag__metric-bar-value">{keyStats.latencyMs.toFixed(1)} ms</span>
        </div>
        <div className="cyl-diag__metric-bar-row">
          <span className="cyl-diag__metric-bar-label">눌림</span>
          <div className="cyl-diag__metric-bar-track">
            <div
              className="cyl-diag__metric-bar-fill cyl-diag__metric-bar-fill--hold"
              style={{ width: `${holdPct}%` }}
            />
          </div>
          <span className="cyl-diag__metric-bar-value">{keyStats.holdMs.toFixed(1)} ms</span>
        </div>
      </div>
    </>
  );
}
