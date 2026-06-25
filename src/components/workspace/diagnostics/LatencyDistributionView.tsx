import type { KeystrokeDiagnostics } from "@/utils/cylindricalStats";

const LATENCY_LEVEL_LABEL: Record<
  NonNullable<KeystrokeDiagnostics["latencyConsistency"]>["level"],
  string
> = {
  steady: "일정",
  moderate: "보통",
  erratic: "오락가락",
};

const LATENCY_LEVEL_BADGE: Record<
  NonNullable<KeystrokeDiagnostics["latencyConsistency"]>["level"],
  string
> = {
  steady: "badge-success",
  moderate: "badge-warning",
  erratic: "badge-warning",
};

export function LatencyDistributionView({
  consistency,
}: {
  consistency: KeystrokeDiagnostics["latencyConsistency"];
}) {
  if (!consistency) {
    return (
      <div className="cyl-diag__dist-preview">
        <span className="cyl-diag__relative-val text-muted">—</span>
      </div>
    );
  }

  const max = Math.max(...consistency.histogram, 1);

  return (
    <div className="cyl-diag__dist-preview">
      <div className="cyl-diag__dist-bars" aria-hidden="true">
        {consistency.histogram.map((h, i) => (
          <div key={i} className="cyl-diag__dist-bar" style={{ height: `${(h / max) * 100}%` }} />
        ))}
      </div>
      <div className="cyl-diag__dist-meta">
        <span className={`cyl-diag__dist-badge ${LATENCY_LEVEL_BADGE[consistency.level]}`}>
          {LATENCY_LEVEL_LABEL[consistency.level]}
        </span>
        <span className="cyl-diag__dist-cv" style={{ color: "var(--text-secondary)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
          평균 편차: <strong>{consistency.madMs.toFixed(1)} ms</strong>
        </span>
      </div>
    </div>
  );
}
