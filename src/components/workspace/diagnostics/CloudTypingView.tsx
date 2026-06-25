import {
  cloudTypingEffectivenessToneClass,
  getCloudTypingEffectivenessLabel,
  type KeystrokeDiagnostics,
} from "@/utils/cylindricalStats";

export function CloudTypingView({
  cloudTyping,
}: {
  cloudTyping: KeystrokeDiagnostics["cloudTyping"];
}) {
  const { key: keyStats } = cloudTyping;
  const { label: effectLabel, tone: effectTone } =
    getCloudTypingEffectivenessLabel(cloudTyping);

  if (cloudTyping.insufficientSample || !keyStats) {
    return <p className="cyl-diag__empty">{effectLabel}</p>;
  }

  const barScale = Math.max(keyStats.latencyMs, keyStats.holdMs, 1);
  const latencyPct = (keyStats.latencyMs / barScale) * 100;
  const holdPct = (keyStats.holdMs / barScale) * 100;

  const ratioPct = (keyStats.cloudTypingRatio * 100).toFixed(0);

  const ratioClass = keyStats.level === "not_applied" ? "text-muted" : "text-success";

  const effectClass = cloudTypingEffectivenessToneClass(effectTone);

  return (
    <>
      <div className="cyl-diag__cloud-dual">
        <div className={`cyl-diag__cloud-dual-col ${ratioClass}`}>
          <span className="cyl-diag__cloud-dual-val">{ratioPct}%</span>
          <span className="cyl-diag__cloud-dual-lbl">적용</span>
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
          <span className="cyl-diag__metric-bar-label">이동시간</span>
          <div className="cyl-diag__metric-bar-body">
            <div className="cyl-diag__metric-bar-track">
              <div
                className="cyl-diag__metric-bar-fill cyl-diag__metric-bar-fill--latency"
                style={{ width: `${latencyPct}%` }}
              />
            </div>
            <span className="cyl-diag__metric-bar-value">{keyStats.latencyMs.toFixed(1)} ms</span>
          </div>
        </div>
        <div className="cyl-diag__metric-bar-row">
          <span className="cyl-diag__metric-bar-label">눌림 유지</span>
          <div className="cyl-diag__metric-bar-body">
            <div className="cyl-diag__metric-bar-track">
              <div
                className="cyl-diag__metric-bar-fill cyl-diag__metric-bar-fill--hold"
                style={{ width: `${holdPct}%` }}
              />
            </div>
            <span className="cyl-diag__metric-bar-value">{keyStats.holdMs.toFixed(1)} ms</span>
          </div>
        </div>
      </div>
    </>
  );
}
