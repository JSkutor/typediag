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
        <span className="cyl-diag__relative-val text-muted" style={{ fontSize: "0.82rem" }}>
          정답 타건 5회 이상 필요
        </span>
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
        <span className="cyl-diag__dist-cv">
          MAD = {consistency.madMs.toFixed(1)} ms · rMAD = {consistency.relativeMad.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
