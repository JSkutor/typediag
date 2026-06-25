import type { CloudTypingEffectiveness, CloudTypingLevel, KeystrokeDiagnostics } from "@/utils/cylindricalStats";
import { formatKey } from "./formatKey";

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
    return (
      <p className="cyl-diag__empty">
        표본 부족 (나가는 전이 n={analysisPoolCount}, 11회 이상 필요)
      </p>
    );
  }

  if (!keyStats) {
    return <p className="cyl-diag__empty">이 키에서 나가는 전이 데이터가 없습니다.</p>;
  }

  const barScale = Math.max(keyStats.latencyMs, keyStats.dwellMs, 1);
  const latencyPct = (keyStats.latencyMs / barScale) * 100;
  const dwellPct = (keyStats.dwellMs / barScale) * 100;

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
      <div className="cyl-diag__cloud-pair-meta">
        {formatKey(keyStats.key)} 키 · 나가는 전이 n={keyStats.sampleCount}
        {` · 상관 n=${effectivenessCorrelation.sampleCount} r=${effectivenessCorrelation.pearsonR.toFixed(2)}`}
      </div>
      {effectivenessCorrelation.sampleCount < 5 && (
        <div className="cyl-diag__correlation-p text-muted">
          상관 분석에 나가는 전이 5회 이상 필요 (키 홀드 기록 포함)
        </div>
      )}
      <div className="cyl-diag__metric-bars">
        <div className="cyl-diag__metric-bar-row">
          <span className="cyl-diag__metric-bar-label">Latency</span>
          <div className="cyl-diag__metric-bar-track">
            <div
              className="cyl-diag__metric-bar-fill cyl-diag__metric-bar-fill--latency"
              style={{ width: `${latencyPct}%` }}
            />
          </div>
          <span className="cyl-diag__metric-bar-value">{keyStats.latencyMs.toFixed(1)} ms</span>
        </div>
        <div className="cyl-diag__metric-bar-row">
          <span className="cyl-diag__metric-bar-label">Dwell</span>
          <div className="cyl-diag__metric-bar-track">
            <div
              className="cyl-diag__metric-bar-fill cyl-diag__metric-bar-fill--dwell"
              style={{ width: `${dwellPct}%` }}
            />
          </div>
          <span className="cyl-diag__metric-bar-value">{keyStats.dwellMs.toFixed(1)} ms</span>
        </div>
      </div>
    </>
  );
}
