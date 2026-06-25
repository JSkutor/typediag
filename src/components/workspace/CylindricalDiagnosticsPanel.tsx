"use client";

import React, { useState } from "react";
import { KeyEvent } from "@/lib/skdm";
import { useCylindricalDiagnostics } from "@/hooks/useCylindricalDiagnostics";
import { KEYBOARD_META } from "@/lib/skdm/keyboardMeta";
import { type PiecewiseFitSuccess, type PiecewiseFitFailure } from "@/utils/piecewiseRegression";
import { PIECEWISE_FAILURE_LABEL } from "@/lib/dev/piecewiseDev";
import type { CloudTypingPhase, CloudTypingStrength, CloudTypingEffectiveness, KeystrokeDiagnostics } from "@/utils/cylindricalStats";
import { SpatialErrorOrbitViz } from "@/components/workspace/SpatialErrorOrbitViz";

interface CylindricalDiagnosticsPanelProps {
  events: KeyEvent[];
  focusKey: string;
  setFocusKey: (key: string) => void;
}

const KEY_LABEL: Record<string, string> = { space: "␣", ",": ",", ".": "." };

function formatKey(key: string) {
  return KEY_LABEL[key] ?? key.toUpperCase();
}

function isSuccess(
  outcome: PiecewiseFitSuccess | PiecewiseFitFailure,
): outcome is PiecewiseFitSuccess {
  return "result" in outcome;
}

function scaleLinear(
  value: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
) {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  const t = (value - domainMin) / (domainMax - domainMin);
  return rangeMin + t * (rangeMax - rangeMin);
}

function OptionalTag() {
  return <span className="cyl-diag__optional-tag">optional</span>;
}

function ComingSoonTag() {
  return <span className="cyl-diag__optional-tag">coming soon</span>;
}

/** 미구현 항목 전용 — 실데이터 연동 전 UI 스켈레톤 */
const PLACEHOLDER = {
  nStepTransition: [
    { step: 1, pattern: "g→b", prob: 0.18 },
    { step: 2, pattern: "g→g→b", prob: 0.09 },
    { step: 3, pattern: "b→g→b", prob: 0.05 },
  ],
  burstPair: { included: true, burstId: "#12", pairLabel: "s→k" },
} as const;

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

function buildFingerTransitionItems(focusKey: string, diagnostics: KeystrokeDiagnostics) {
  const targetMeta = KEYBOARD_META[focusKey.toLowerCase()];
  const isLeft = targetMeta ? targetMeta.hand === "L" : true;
  const { ratios } = diagnostics.fingerTransitions;

  return [
    { label: isLeft ? "오른손 전체" : "왼손 전체", value: ratios.oppositeHand, color: "var(--accent)" },
    { label: isLeft ? "왼 소지" : "오른 소지", value: ratios.sameHandPinky, color: "#a855f7" },
    { label: isLeft ? "왼 약지" : "오른 약지", value: ratios.sameHandRing, color: "#3b82f6" },
    { label: isLeft ? "왼 중지" : "오른 중지", value: ratios.sameHandMiddle, color: "#10b981" },
    { label: isLeft ? "왼 검지" : "오른 검지", value: ratios.sameHandIndex, color: "#ec4899" },
    { label: "기타 (스페이스 등)", value: ratios.other, color: "var(--text-muted)" },
  ];
}

function TransitionBars({
  items,
}: {
  items: ReadonlyArray<{ label: string; value: number; color: string }>;
}) {
  return (
    <div className="cyl-diag__transition-list">
      {items.map((item) => (
        <div key={item.label} className="cyl-diag__transition-item">
          <div className="cyl-diag__transition-meta">
            <span className="cyl-diag__transition-lbl">{item.label}</span>
            <span className="cyl-diag__transition-val">{item.value.toFixed(1)}%</span>
          </div>
          <div className="cyl-diag__transition-bar-bg">
            <div
              className="cyl-diag__transition-bar-fill"
              style={{ width: `${item.value}%`, backgroundColor: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const CLOUD_TYPING_PHASE_LABEL: Record<CloudTypingPhase, string> = {
  skilled: "구름타법 숙달",
  not_applied: "미적용",
};

const CLOUD_TYPING_EFFECTIVENESS_LABEL: Record<CloudTypingEffectiveness, string> = {
  effective: "구름타법 효과적 (속도 향상)",
  counterproductive: "구름타법 역효과 (타건 꼬임)",
  neutral: "상관 없음",
};

const CLOUD_TYPING_STRENGTH_LABEL: Record<CloudTypingStrength, string> = {
  strong: "구름타법 강함",
  moderate: "구름타법 보통",
  weak: "구름타법 약함",
};

function CloudTypingView({
  cloudTyping,
}: {
  cloudTyping: KeystrokeDiagnostics["cloudTyping"];
}) {
  const { key: keyStats, effectivenessCorrelation, effectiveness } = cloudTyping;

  if (!keyStats) {
    return <p className="cyl-diag__empty">이 키에서 나가는 전이 데이터가 없습니다.</p>;
  }

  const totalMs = keyStats.latencyMs > 0 ? keyStats.latencyMs : keyStats.dwellMs + keyStats.flightMs;
  const dwellPct = totalMs > 0 ? (keyStats.dwellMs / totalMs) * 100 : 50;
  const flightPct = 100 - dwellPct;

  const statusLabel = CLOUD_TYPING_PHASE_LABEL[keyStats.phase];

  const statusClass =
    keyStats.phase === "skilled"
      ? "text-success"
      : "text-muted";

  const strengthLabel =
    keyStats.phase === "skilled" && keyStats.strength
      ? CLOUD_TYPING_STRENGTH_LABEL[keyStats.strength]
      : null;

  const effectLabel = effectivenessCorrelation.isSignificant 
    ? CLOUD_TYPING_EFFECTIVENESS_LABEL[effectiveness]
    : "구름타법 상관 무의미";
    
  const effectClass = 
    effectiveness === "effective" ? "text-success" : 
    effectiveness === "counterproductive" ? "text-danger" : "text-muted";

  return (
    <>
      <div className="cyl-diag__correlation-box">
        <span className="cyl-diag__correlation-val">{(keyStats.cloudTypingRatio * 100).toFixed(0)}%</span>
        <span className={`cyl-diag__correlation-sig ${statusClass}`}>{statusLabel}</span>
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
      {strengthLabel && <div className="cyl-diag__correlation-p">{strengthLabel}</div>}
      <div className={`cyl-diag__correlation-p ${effectClass}`}>{effectLabel}</div>
      <div className="cyl-diag__dwell-flight">
        <div className="cyl-diag__dwell-flight-bar">
          <div className="cyl-diag__dwell-segment" style={{ width: `${dwellPct}%` }} />
          <div className="cyl-diag__flight-segment" style={{ width: `${flightPct}%` }} />
        </div>
        <div className="cyl-diag__dwell-flight-labels">
          <span>Dwell {keyStats.dwellMs.toFixed(1)} ms</span>
          <span>Flight {keyStats.flightMs.toFixed(1)} ms</span>
        </div>
      </div>
    </>
  );
}

function LatencyDistributionView({
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

export const CylindricalDiagnosticsPanel: React.FC<CylindricalDiagnosticsPanelProps> = ({
  events,
  focusKey,
  setFocusKey,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { focusKeyOptions, outcome, chartData, diagnostics } = useCylindricalDiagnostics(
    events,
    focusKey,
  );

  const hasData = events.length > 0 && focusKey;

  const renderChart = () => {
    if (!outcome) {
      return <p className="cyl-diag__empty">데이터가 로드되지 않았습니다.</p>;
    }
    if (!isSuccess(outcome)) {
      return (
        <div className="cyl-diag__failure-box">
          <p className="cyl-diag__empty cyl-diag__empty--fail">
            {PIECEWISE_FAILURE_LABEL[outcome.reason] ?? outcome.reason}
          </p>
          <div className="cyl-diag__stats-sub">
            <span>정답 n = {outcome.rawCorrectCount}</span>
            <span>필터 후 = {outcome.filteredCount}</span>
          </div>
        </div>
      );
    }

    if (!chartData || chartData.points.length === 0) {
      return <p className="cyl-diag__empty">시각화할 수 있는 데이터 포인트가 없습니다.</p>;
    }

    const { points, regressionSamples, xMax, domainYMin, domainYMax, yTickValues } = chartData;

    const WIDTH = 320;
    const HEIGHT = 180;
    const PAD = { top: 16, right: 12, bottom: 24, left: 32 };
    const plotWidth = WIDTH - PAD.left - PAD.right;
    const plotHeight = HEIGHT - PAD.top - PAD.bottom;

    const toSvgX = (x: number) => scaleLinear(x, 0, xMax, PAD.left, PAD.left + plotWidth);
    const toSvgY = (y: number) =>
      scaleLinear(y, domainYMin, domainYMax, PAD.top + plotHeight, PAD.top);

    const regressionPath = regressionSamples
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${toSvgX(point.x).toFixed(1)} ${toSvgY(point.y).toFixed(1)}`,
      )
      .join(" ");

    return (
      <div className="cyl-diag__chart-container">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="cyl-diag__svg"
          role="img"
          aria-label="모래시계 분절회귀 차트"
        >
          {yTickValues.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotWidth}
                y1={toSvgY(tick)}
                y2={toSvgY(tick)}
                stroke="rgba(255, 255, 255, 0.03)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={toSvgY(tick) + 3}
                textAnchor="end"
                fill="var(--text-muted)"
                fontSize={9}
                fontFamily="var(--font-mono)"
                opacity={0.8}
              >
                {Math.round(tick)}
              </text>
            </g>
          ))}
          <line
            x1={PAD.left}
            x2={PAD.left + plotWidth}
            y1={PAD.top + plotHeight}
            y2={PAD.top + plotHeight}
            stroke="var(--border-subtle)"
            opacity={0.3}
            strokeWidth={1}
          />
          <line
            x1={PAD.left}
            x2={PAD.left}
            y1={PAD.top}
            y2={PAD.top + plotHeight}
            stroke="var(--border-subtle)"
            opacity={0.3}
            strokeWidth={1}
          />
          {points.map((point, index) => (
            <circle
              key={index}
              cx={toSvgX(point.x)}
              cy={toSvgY(point.y)}
              r={1.8}
              fill="var(--text-secondary)"
              opacity={0.45}
            />
          ))}
          <path
            d={regressionPath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  };

  return (
    <div className={`cyl-drawer ${isOpen ? "cyl-drawer--open" : ""}`}>
      <button
        type="button"
        className="cyl-drawer__toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="cyl-drawer-panel"
        aria-label={isOpen ? "진단 패널 닫기" : "진단 패널 열기"}
      >
        <span className="cyl-drawer__chevron" aria-hidden="true">
          ›
        </span>
      </button>

      <div id="cyl-drawer-panel" className="cyl-drawer__body" aria-hidden={!isOpen}>
        <div className="cyl-drawer__grid">
          {/* Panel 1: 키 진입 Dynamics */}
          <section className="cyl-drawer__col cyl-drawer__col--controls">
            <header className="cyl-panel__header">
              <span className="cyl-panel__subtitle">Panel 1 · Focus Key</span>
              <h2 className="cyl-panel__title">키 진입 Dynamics</h2>
            </header>

            <div className="cyl-drawer__select-row">
              <span className="cyl-label-text">Focus Key</span>
              <select
                className="cyl-select cyl-select--wide"
                value={focusKey}
                onChange={(e) => setFocusKey(e.target.value)}
              >
                {focusKeyOptions.map(([key, count]) => (
                  <option key={key} value={key}>
                    {formatKey(key)} ({count}회 입력)
                  </option>
                ))}
              </select>
            </div>

            {hasData ? (
              <div className="cyl-diag__detailed-content">
                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">모래시계 분절회귀</span>
                  {renderChart()}
                  <p className="cyl-diag__card-desc">
                    정답(g)→정답 / 오타(b) 구간별 기울기. breakpoint 전후 개선·악화 추세를
                    분절회귀로 추정합니다.
                  </p>
                </div>

                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">Latency 분포 · 일관성</span>
                  <LatencyDistributionView consistency={diagnostics.latencyConsistency} />
                  <p className="cyl-diag__card-desc">
                    정답 타건 latency의 MAD(중앙값 절대편차)로 일정함 vs 오락가락을 판별합니다.
                    rMAD = MAD ÷ 중앙값.
                  </p>
                </div>

                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">오타 유발율</span>
                  <div className="cyl-diag__median-box">
                    <span className="cyl-diag__median-val">
                      {diagnostics.errorInducement.rate.toFixed(1)}%
                    </span>
                    <span className="cyl-diag__stat-desc">
                      ({diagnostics.errorInducement.count}/
                      {diagnostics.errorInducement.totalErrorStartsCount} 오타 시작)
                    </span>
                  </div>
                  <p className="cyl-diag__card-desc">
                    오타 스트릭 시작 중 focusKey(reference transition) 직전이 정답이던
                    경우의 기여 비율입니다.
                  </p>
                </div>

                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">동일 손 속도 비교</span>
                  <div className="cyl-diag__relative-box">
                    {diagnostics.relativeSpeed.handMedianMs > 0 ? (
                      <>
                        <span
                          className={`cyl-diag__relative-val ${diagnostics.relativeSpeed.speedDiffMs <= 0 ? "text-success" : "text-warning"}`}
                        >
                          {diagnostics.relativeSpeed.speedDiffMs <= 0
                            ? `${Math.abs(diagnostics.relativeSpeed.speedDiffMs).toFixed(1)} ms 빠름`
                            : `${diagnostics.relativeSpeed.speedDiffMs.toFixed(1)} ms 느림`}
                        </span>
                        <span className="cyl-diag__relative-sub">
                          같은 손 평균: {diagnostics.relativeSpeed.handMedianMs.toFixed(1)} ms
                        </span>
                      </>
                    ) : (
                      <span className="cyl-diag__relative-val text-muted" style={{ fontSize: "0.82rem" }}>
                        비교 대상 없음
                      </span>
                    )}
                  </div>
                  <p className="cyl-diag__card-desc">
                    같은 손의 다른 손가락 키들 중앙값과 반응 속도를 비교합니다.
                  </p>
                </div>

                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">어느 손가락에서 넘어오는지</span>
                  <TransitionBars items={buildFingerTransitionItems(focusKey, diagnostics)} />
                </div>

                {diagnostics.unconsciousKey !== null && (
                  <div className="cyl-diag__detailed-card cyl-diag__detailed-card--optional">
                    <span className="cyl-diag__stat-lbl">
                      무의식적 incorrect 키 TopN <OptionalTag />
                    </span>
                    <div className="cyl-diag__optional-item" style={{ fontSize: "0.82rem", marginTop: "4px" }}>
                      <span className="cyl-diag__rank-num" style={{ color: "var(--warning)" }}>
                        #{diagnostics.unconsciousKey.rank}
                      </span>
                      <span className="cyl-diag__key-text">
                        {formatKey(diagnostics.unconsciousKey.key)}
                      </span>
                      <span className="cyl-diag__error-rate text-warning">
                        {diagnostics.unconsciousKey.errorRate.toFixed(1)}%
                      </span>
                    </div>
                    <p className="cyl-diag__card-desc">
                      키별 오타율 상위 3에 focusKey가 포함될 때 표시됩니다.
                    </p>
                  </div>
                )}

                {diagnostics.shiftPenalty !== null && (
                  <div className="cyl-diag__detailed-card cyl-diag__detailed-card--optional">
                    <span className="cyl-diag__stat-lbl">
                      Shift 지연 패널티 <OptionalTag />
                    </span>
                    <div className="cyl-diag__penalty-content">
                      <span className="cyl-diag__penalty-val">
                        +{diagnostics.shiftPenalty.differenceMs.toFixed(1)} ms
                      </span>
                      <p className="cyl-diag__penalty-desc">
                        Shift 혼용 자소 입력 반응 속도 중앙값이 일반 자소보다{" "}
                        {diagnostics.shiftPenalty.differenceMs.toFixed(1)}ms 더 지연됩니다.
                        (Shift 사용 횟수: {diagnostics.shiftPenalty.shiftCount}회)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="cyl-diag__empty">진단할 타자 데이터가 존재하지 않습니다.</p>
            )}
          </section>

          {/* Panel 2: 타이밍 & 오타 */}
          <section className="cyl-drawer__col cyl-drawer__col--regression">
            <header className="cyl-drawer__col-header">
              <span className="cyl-label-text">Panel 2 · Timing</span>
              <h2 className="cyl-panel__title cyl-panel__title--compact">타이밍 &amp; 오타</h2>
            </header>

            {hasData ? (
              <div className="cyl-diag__detailed-content">
                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">Latency 중앙값 · CPM</span>
                  <div className="cyl-diag__median-box">
                    <span className="cyl-diag__median-val">
                      {diagnostics.speedMetrics.medianLatencyMs.toFixed(1)} ms
                    </span>
                    <span className="cyl-diag__cpm-val">
                      {diagnostics.speedMetrics.equivalentCpm} CPM
                    </span>
                  </div>
                  <p className="cyl-diag__card-desc">
                    해당 focusKey reference transition(toKey === focusKey) 정타 latency만으로
                    산출한 중앙값과 분당 타수입니다.
                  </p>
                </div>

                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">IQR 기반 머뭇거림</span>
                  <div className="cyl-diag__hesitation-box">
                    <span
                      className={`cyl-diag__hesitation-val ${diagnostics.hesitation.hasTendency ? "text-warning" : "text-success"}`}
                    >
                      {diagnostics.hesitation.ratio.toFixed(1)}%
                    </span>
                    <span
                      className={`cyl-diag__hesitation-badge ${diagnostics.hesitation.hasTendency ? "badge-warning" : "badge-success"}`}
                    >
                      {diagnostics.hesitation.hasTendency ? "머뭇거림 의심" : "정상"}
                    </span>
                  </div>
                  <div className="cyl-diag__hesitation-desc">
                    기준선: {diagnostics.hesitation.thresholdMs.toFixed(1)} ms 초과 (Q3 + 1.5 IQR)
                  </div>
                  <p className="cyl-diag__card-desc">
                    이상치 임계선을 넘는 타건 비율. 5% 이상이면 머뭇거림 경향.
                  </p>
                </div>

                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">순서 뒤바뀜 오타율</span>
                  <div className="cyl-diag__median-box">
                    <span className="cyl-diag__median-val">
                      {diagnostics.lateKeystroke.rate.toFixed(1)}%
                    </span>
                    <span className="cyl-diag__stat-desc">
                      ({diagnostics.lateKeystroke.count}/{diagnostics.lateKeystroke.totalErrorsCount}{" "}
                      오타)
                    </span>
                  </div>
                  <p className="cyl-diag__card-desc">
                    오타 쌍 중 이 키를 늦게 눌러 앞 키가 먼저 입력된 순서 바뀜 비율입니다.
                  </p>
                </div>

                {diagnostics.commonPair !== null && (
                  <div className="cyl-diag__detailed-card cyl-diag__detailed-card--optional">
                    <span className="cyl-diag__stat-lbl">
                      자주 쓰는 순서쌍 TopN <OptionalTag />
                    </span>
                    <div className="cyl-diag__optional-item" style={{ fontSize: "0.82rem", marginTop: "4px" }}>
                      <span className="cyl-diag__rank-num" style={{ color: "var(--accent)" }}>
                        #{diagnostics.commonPair.rank}
                      </span>
                      <span className="cyl-diag__pair-text" style={{ fontWeight: 600 }}>
                        {formatKey(diagnostics.commonPair.from)} → {formatKey(diagnostics.commonPair.to)}
                      </span>
                      <span className="cyl-diag__count">({diagnostics.commonPair.count}회)</span>
                    </div>
                    <p className="cyl-diag__card-desc">
                      빈번한 transition 상위 5에 focusKey가 toKey인 쌍이 포함될 때
                      표시됩니다.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="cyl-diag__empty">진단할 타자 데이터가 존재하지 않습니다.</p>
            )}
          </section>

          {/* Panel 3: 공간 & 패턴 */}
          <section className="cyl-drawer__col cyl-drawer__col--diagnostics">
            <header className="cyl-drawer__col-header">
              <span className="cyl-label-text">Panel 3 · Spatial</span>
              <h2 className="cyl-panel__title cyl-panel__title--compact">공간 &amp; 패턴</h2>
            </header>

            {hasData ? (
              <div className="cyl-diag__detailed-content">
                <div className="cyl-diag__detailed-card cyl-diag__detailed-card--optional">
                  <span className="cyl-diag__stat-lbl">공간적 오타 거리</span>
                  {diagnostics.spatialErrorDistance ? (
                    <SpatialErrorOrbitViz
                      focusKey={focusKey}
                      data={diagnostics.spatialErrorDistance}
                    />
                  ) : (
                    <p className="cyl-diag__empty">오타 샘플이 없습니다.</p>
                  )}
                </div>

                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">구름타법 · Dwell / Flight</span>
                  <CloudTypingView cloudTyping={diagnostics.cloudTyping} />
                  <p className="cyl-diag__card-desc">
                    outgoing transition(fromKey === focusKey) 전체. dwell은 reference
                    transition 홀드,
                    ND≤0.3면 롤오버. 비율은 숙달/미적용, r은 효과성(양의 상관=속도와 맞물림).
                  </p>
                </div>

                <div className="cyl-diag__detailed-card cyl-diag__detailed-card--optional">
                  <span className="cyl-diag__stat-lbl">
                    N단계 전이 오타 패턴 <OptionalTag /> <ComingSoonTag />
                  </span>
                  <div className="cyl-diag__nstep-list">
                    {PLACEHOLDER.nStepTransition.map((row) => (
                      <div key={row.step} className="cyl-diag__nstep-row">
                        <span className="cyl-diag__rank-num">{row.step}-step</span>
                        <span className="cyl-diag__pair-text">{row.pattern}</span>
                        <span className="cyl-diag__transition-val">{(row.prob * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="cyl-diag__detailed-card cyl-diag__detailed-card--optional">
                  <span className="cyl-diag__stat-lbl">
                    버스트 쌍 포함 여부 <OptionalTag /> <ComingSoonTag />
                  </span>
                  <div className="cyl-diag__burst-box">
                    <span
                      className={`cyl-diag__hesitation-badge ${PLACEHOLDER.burstPair.included ? "badge-success" : "badge-warning"}`}
                    >
                      {PLACEHOLDER.burstPair.included ? "포함됨" : "미포함"}
                    </span>
                    {PLACEHOLDER.burstPair.included && (
                      <p className="cyl-diag__penalty-desc">
                        Burst {PLACEHOLDER.burstPair.burstId} · {PLACEHOLDER.burstPair.pairLabel}{" "}
                        쌍이 고속 연타 구간에 속합니다.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="cyl-diag__empty">진단할 타자 데이터가 존재하지 않습니다.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
