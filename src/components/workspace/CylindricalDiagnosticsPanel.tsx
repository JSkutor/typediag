"use client";

import React, { useState } from "react";
import { KeyEvent } from "@/lib/skdm";
import { useCylindricalDiagnostics } from "@/hooks/useCylindricalDiagnostics";
import { KEYBOARD_META } from "@/lib/skdm/keyboardMeta";
import {
  type PiecewiseFitSuccess,
  type PiecewiseFitFailure,
} from "@/utils/piecewiseRegression";
import { PIECEWISE_FAILURE_LABEL } from "@/lib/dev/piecewiseDev";

interface CylindricalDiagnosticsPanelProps {
  events: KeyEvent[];
  selectedTo: string;
  setSelectedTo: (key: string) => void;
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

function scaleLinear(value: number, domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  const t = (value - domainMin) / (domainMax - domainMin);
  return rangeMin + t * (rangeMax - rangeMin);
}

export const CylindricalDiagnosticsPanel: React.FC<CylindricalDiagnosticsPanelProps> = ({
  events,
  selectedTo,
  setSelectedTo,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { toKeyOptions, outcome, chartData, additionalStats, optionalStats, detailedStats } = useCylindricalDiagnostics(events, selectedTo);

  // Render minimal SVG chart if outcome is successful
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

    const WIDTH = 410;
    const HEIGHT = 200;
    const PAD = { top: 16, right: 16, bottom: 28, left: 36 };
    const plotWidth = WIDTH - PAD.left - PAD.right;
    const plotHeight = HEIGHT - PAD.top - PAD.bottom;

    const toSvgX = (x: number) => scaleLinear(x, 0, xMax, PAD.left, PAD.left + plotWidth);
    const toSvgY = (y: number) => scaleLinear(y, domainYMin, domainYMax, PAD.top + plotHeight, PAD.top);

    const regressionPath = regressionSamples
      .map((point, index) => `${index === 0 ? "M" : "L"} ${toSvgX(point.x).toFixed(1)} ${toSvgY(point.y).toFixed(1)}`)
      .join(" ");

    return (
      <div className="cyl-diag__chart-container">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="cyl-diag__svg"
          role="img"
          aria-label="Piecewise Regression 2D Chart"
        >
          {/* Grid lines & Y Axis Labels */}
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

          {/* Minimal Axes */}
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

          {/* Scatter points */}
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

          {/* Minimal Solid Regression Line */}
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
          <section className="cyl-drawer__col cyl-drawer__col--controls">
            <header className="cyl-panel__header">
              <span className="cyl-panel__subtitle">Spatial Keystroke Dynamics Model</span>
              <h2 className="cyl-panel__title">Cylindrical Vector Diagnostics</h2>
            </header>

            <div className="cyl-drawer__controls-group">
              <div className="cyl-drawer__select-row">
                <span className="cyl-label-text">Target Key (To)</span>
                <select
                  className="cyl-select cyl-select--wide"
                  value={selectedTo}
                  onChange={(e) => setSelectedTo(e.target.value)}
                >
                  {toKeyOptions.map(([key, count]) => (
                    <option key={key} value={key}>
                      {formatKey(key)} ({count}회 입력)
                    </option>
                  ))}
                </select>
              </div>

              <div className="cyl-drawer__chart-section">
                <span className="cyl-label-text">2D Piecewise Regression</span>
                {renderChart()}

                <div className="cyl-diag__stats-grid">
                  <div className="cyl-diag__stat-item">
                    <span className="cyl-diag__stat-lbl">오타 유발율</span>
                    <span className="cyl-diag__stat-val">
                      {additionalStats.errorInducementRate.toFixed(1)}%
                    </span>
                    <span className="cyl-diag__stat-desc">
                      ({additionalStats.errorInducementCount}/{additionalStats.totalErrorStartsCount} 오타 시작)
                    </span>
                  </div>
                  <div className="cyl-diag__stat-item">
                    <span className="cyl-diag__stat-lbl">순서 뒤바뀜 오타율</span>
                    <span className="cyl-diag__stat-val">
                      {additionalStats.lateKeystrokeRate.toFixed(1)}%
                    </span>
                    <span className="cyl-diag__stat-desc">
                      ({additionalStats.lateKeystrokeCount}/{additionalStats.totalErrorsCount} 오타)
                    </span>
                  </div>
                </div>
              </div>

              {/* 추가 진단 통계 (선택) */}
              {(optionalStats.topPair !== null ||
                optionalStats.unconsciousKey !== null ||
                optionalStats.shiftPenalty !== null) && (
                <div className="cyl-drawer__optional-section">
                  <span className="cyl-label-text">추가 진단 통계 (선택)</span>
                  <div className="cyl-diag__optional-grid">
                    {/* 1. 자주 치는 순서쌍 top5 중 해당 쌍 */}
                    {optionalStats.topPair !== null && (
                      <div className="cyl-diag__optional-card">
                        <span className="cyl-diag__stat-lbl">자주 치는 순서쌍 순위</span>
                        <div className="cyl-diag__optional-item" style={{ fontSize: "0.82rem", marginTop: "4px" }}>
                          <span className="cyl-diag__rank-num" style={{ fontSize: "0.85rem", color: "var(--accent)" }}>
                            #{optionalStats.topPair.rank}
                          </span>
                          <span className="cyl-diag__pair-text" style={{ fontWeight: 600 }}>
                            {formatKey(optionalStats.topPair.from)} → {formatKey(optionalStats.topPair.to)}
                          </span>
                          <span className="cyl-diag__count" style={{ fontSize: "0.65rem" }}>
                            ({optionalStats.topPair.count}회)
                          </span>
                        </div>
                        <p style={{ fontSize: "0.62rem", color: "var(--text-muted)", margin: "4px 0 0 0", lineHeight: 1.3 }}>
                          현재 선택된 키가 전체 상위 5개 빈번한 입력 쌍에 포함되어 있습니다.
                        </p>
                      </div>
                    )}

                    {/* 2. 무의식적으로 치는 키 top3 중 해당 키 */}
                    {optionalStats.unconsciousKey !== null && (
                      <div className="cyl-diag__optional-card">
                        <span className="cyl-diag__stat-lbl">무의식적인 키 오타 순위</span>
                        <div className="cyl-diag__optional-item" style={{ fontSize: "0.82rem", marginTop: "4px" }}>
                          <span className="cyl-diag__rank-num" style={{ fontSize: "0.85rem", color: "var(--warning)" }}>
                            #{optionalStats.unconsciousKey.rank}
                          </span>
                          <span className="cyl-diag__key-text">
                            {formatKey(optionalStats.unconsciousKey.key)}
                          </span>
                          <span className="cyl-diag__error-rate text-warning" style={{ fontSize: "0.78rem" }}>
                            {optionalStats.unconsciousKey.errorRate.toFixed(1)}%
                          </span>
                        </div>
                        <p style={{ fontSize: "0.62rem", color: "var(--text-muted)", margin: "4px 0 0 0", lineHeight: 1.3 }}>
                          현재 선택된 키가 오타율이 높은 전체 상위 3개 키에 속합니다.
                        </p>
                      </div>
                    )}

                    {/* 3. 시프트 지연 패널티 */}
                    {optionalStats.shiftPenalty !== null && (
                      <div className="cyl-diag__optional-card cyl-diag__optional-card--full">
                        <span className="cyl-diag__stat-lbl">Shift 입력 지연 패널티</span>
                        <div className="cyl-diag__penalty-content">
                          <span className="cyl-diag__penalty-val">
                            +{optionalStats.shiftPenalty.differenceMs.toFixed(1)} ms
                          </span>
                          <p className="cyl-diag__penalty-desc">
                            Shift 혼용 자소 입력 반응 속도 중앙값이 일반 자소보다{" "}
                            {optionalStats.shiftPenalty.differenceMs.toFixed(1)}ms 더 지연됩니다.
                            (Shift 사용 횟수: {optionalStats.shiftPenalty.shiftCount}회)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="cyl-drawer__col cyl-drawer__col--diagnostics">
            {/* Detailed Spatial Analytics Section */}
            <header className="cyl-drawer__col-header">
              <span className="cyl-label-text">Detailed Spatial Analytics</span>
            </header>

            <div className="cyl-diag__detailed-container">
              {events.length > 0 && selectedTo ? (
                <div className="cyl-diag__detailed-content">
                  {/* Row 1: Latency/CPM and Same Hand Speed Comparison */}
                  <div className="cyl-diag__detailed-grid">
                    <div className="cyl-diag__detailed-card">
                      <span className="cyl-diag__stat-lbl">반응 속도 & CPM</span>
                      <div className="cyl-diag__median-box">
                        <span className="cyl-diag__median-val">{detailedStats.medianLatencyMs.toFixed(1)} ms</span>
                        <span className="cyl-diag__cpm-val">{detailedStats.equivalentCpm} CPM</span>
                      </div>
                      <p className="cyl-diag__card-desc">
                        해당 키 정타 입력의 대기 시간(latency) 중앙값 및 1분당 타수 환산 값입니다.
                      </p>
                    </div>

                    <div className="cyl-diag__detailed-card">
                      <span className="cyl-diag__stat-lbl">동일 손 속도 비교</span>
                      <div className="cyl-diag__relative-box">
                        {detailedStats.comparedToMedianMs > 0 ? (
                          <>
                            <span className={`cyl-diag__relative-val ${detailedStats.relativeSpeedMs <= 0 ? "text-success" : "text-warning"}`}>
                              {detailedStats.relativeSpeedMs <= 0 
                                ? `${Math.abs(detailedStats.relativeSpeedMs).toFixed(1)} ms 빠름` 
                                : `${detailedStats.relativeSpeedMs.toFixed(1)} ms 느림`}
                            </span>
                            <span className="cyl-diag__relative-sub">
                              같은 손 평균: {detailedStats.comparedToMedianMs.toFixed(1)} ms
                            </span>
                          </>
                        ) : (
                          <span className="cyl-diag__relative-val text-muted" style={{ fontSize: "0.82rem" }}>비교 대상 없음</span>
                        )}
                      </div>
                      <p className="cyl-diag__card-desc">
                        동일한 손을 사용하는 다른 키들의 중간값과 반응 속도를 비교합니다.
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Hold Duration Correlation & Hesitation Ratio */}
                  <div className="cyl-diag__detailed-grid">
                    <div className="cyl-diag__detailed-card">
                      <span className="cyl-diag__stat-lbl">Hold Duration 상관계수</span>
                      <div className="cyl-diag__correlation-box">
                        <span className="cyl-diag__correlation-val">
                          r = {detailedStats.pearsonR.toFixed(3)}
                        </span>
                        <span className={`cyl-diag__correlation-sig ${detailedStats.isCorrelationSignificant ? "text-warning" : "text-muted"}`}>
                          {detailedStats.isCorrelationSignificant ? "상관성 유의미" : "상관성 무관"}
                        </span>
                      </div>
                      <div className="cyl-diag__correlation-p">
                        p-value: {detailedStats.pValue < 0.001 ? "< 0.001" : detailedStats.pValue.toFixed(3)}
                        {detailedStats.correlationCount > 0 && ` (n=${detailedStats.correlationCount})`}
                      </div>
                      <p className="cyl-diag__card-desc">
                        키를 누르는 지속 시간(Hold Duration)과 지연 반응속도 간의 피어슨 상관계수입니다.
                        (r &gt; 0.4, p &lt; 0.05 일 때 유의미한 상관성으로 판단)
                      </p>
                    </div>

                    <div className="cyl-diag__detailed-card">
                      <span className="cyl-diag__stat-lbl">머뭇거림 비율 (IQR)</span>
                      <div className="cyl-diag__hesitation-box">
                        <span className={`cyl-diag__hesitation-val ${detailedStats.hasHesitationTendency ? "text-warning" : "text-success"}`}>
                          {detailedStats.hesitationRatio.toFixed(1)}%
                        </span>
                        <span className={`cyl-diag__hesitation-badge ${detailedStats.hasHesitationTendency ? "badge-warning" : "badge-success"}`}>
                          {detailedStats.hasHesitationTendency ? "머뭇거림 의심" : "정상"}
                        </span>
                      </div>
                      <div className="cyl-diag__hesitation-desc">
                        기준선: {detailedStats.iqrThreshold.toFixed(1)} ms 초과 (Q3 + 1.5 IQR)
                      </div>
                      <p className="cyl-diag__card-desc">
                        사분위수 범위(IQR) 기반 이상치 임계선보다 느리게 입력된 타건 비율입니다.
                        (임계선 초과 비율 5% 이상일 때 머뭇거림 경향으로 분석)
                      </p>
                    </div>
                  </div>

                  {/* Row 3: Finger Transition Percentages */}
                  <div className="cyl-diag__detailed-card cyl-diag__detailed-card--full">
                    <span className="cyl-diag__stat-lbl">어느 손가락에서 넘어오는지 비율</span>
                    <div className="cyl-diag__transition-container">
                      {(() => {
                        const targetMeta = KEYBOARD_META[selectedTo.toLowerCase()];
                        const isLeft = targetMeta ? targetMeta.hand === "L" : true;
                        
                        const items = [
                          { label: isLeft ? "오른손 전체" : "왼손 전체", value: detailedStats.transitionRatios.oppositeHand, color: "var(--accent)" },
                          { label: isLeft ? "왼 소지" : "오른 소지", value: detailedStats.transitionRatios.sameHandPinky, color: "#a855f7" },
                          { label: isLeft ? "왼 약지" : "오른 약지", value: detailedStats.transitionRatios.sameHandRing, color: "#3b82f6" },
                          { label: isLeft ? "왼 중지" : "오른 중지", value: detailedStats.transitionRatios.sameHandMiddle, color: "#10b981" },
                          { label: isLeft ? "왼 검지" : "오른 검지", value: detailedStats.transitionRatios.sameHandIndex, color: "#ec4899" },
                          { label: "기타 (스페이스 등)", value: detailedStats.transitionRatios.other, color: "var(--text-muted)" },
                        ];
                        
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
                      })()}
                    </div>
                    <p className="cyl-diag__card-desc" style={{ marginTop: "4px" }}>
                      현재 선택된 키 바로 직전에 입력한 키의 손가락 위치 분포입니다.
                      어떤 손가락 연결 패턴에서 지연 병목이 생기는지 진단할 수 있습니다.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="cyl-diag__empty">진단할 타자 데이터가 존재하지 않습니다.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

