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

const HISTOGRAM_AXIS_TICK_COUNT = 5;

function buildHistogramAxisTicks(
  upperBoundMs: number,
  count = HISTOGRAM_AXIS_TICK_COUNT,
): number[] {
  if (upperBoundMs <= 0 || count < 2) return [0];

  return Array.from({ length: count }, (_, index) =>
    Math.round((index / (count - 1)) * upperBoundMs),
  );
}

function formatHistogramTickMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;
  return String(ms);
}

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
  const axisTicks = buildHistogramAxisTicks(consistency.histogramUpperBoundMs);
  const upperBoundMs = consistency.histogramUpperBoundMs;

  return (
    <div className="cyl-diag__dist-preview">
      <div className="cyl-diag__dist-chart">
        <div className="cyl-diag__dist-bars" aria-hidden="true">
          {consistency.histogram.map((h, i) => (
            <div key={i} className="cyl-diag__dist-bar" style={{ height: `${(h / max) * 100}%` }} />
          ))}
        </div>
        <div className="cyl-diag__dist-axis" aria-hidden="true">
          {axisTicks.map((tick, index) => (
            <span
              key={tick}
              className={`cyl-diag__dist-tick${index === 0 ? " is-start" : ""}${index === axisTicks.length - 1 ? " is-end" : ""}`}
              style={{ left: `${(tick / upperBoundMs) * 100}%` }}
            >
              {formatHistogramTickMs(tick)}
            </span>
          ))}
        </div>
      </div>
      <div className="cyl-diag__dist-meta">
        <span className={`cyl-diag__dist-badge ${LATENCY_LEVEL_BADGE[consistency.level]}`}>
          {LATENCY_LEVEL_LABEL[consistency.level]}
        </span>
        <span className="cyl-diag__dist-cv">
          평균 편차: <strong>{consistency.madMs.toFixed(1)} ms</strong>
        </span>
      </div>
    </div>
  );
}
