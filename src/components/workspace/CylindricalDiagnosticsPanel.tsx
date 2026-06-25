"use client";

import React, { useState } from "react";
import { useCylindricalDiagnostics } from "@/hooks/useCylindricalDiagnostics";
import {
  FATAL_NGRAM_ERROR_RATE_THRESHOLD,
  FATAL_NGRAM_MIN_SAMPLES,
} from "@/utils/cylindricalStats";
import { SpatialErrorOrbitViz } from "@/components/workspace/SpatialErrorOrbitViz";
import { BurstNgramViz } from "@/components/workspace/diagnostics/BurstNgramViz";
import { CloudTypingView } from "@/components/workspace/diagnostics/CloudTypingView";
import { OptionalTag } from "@/components/workspace/diagnostics/DiagTags";
import { FatalNgramViz } from "@/components/workspace/diagnostics/FatalNgramViz";
import { LatencyDistributionView } from "@/components/workspace/diagnostics/LatencyDistributionView";
import { PiecewiseChart } from "@/components/workspace/diagnostics/PiecewiseChart";
import {
  buildFingerTransitionItems,
  TransitionBars,
} from "@/components/workspace/diagnostics/TransitionBars";
import { formatKey } from "@/components/workspace/diagnostics/formatKey";

interface CylindricalDiagnosticsPanelProps {
  events: Parameters<typeof useCylindricalDiagnostics>[0];
  focusKey: string;
  setFocusKey: (key: string) => void;
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
                  <PiecewiseChart outcome={outcome} chartData={chartData} />
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
                    오타 스트릭 시작 시 의도한 키(expectedChar → layout)가 focusKey인
                    경우의 비율입니다.
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
                      빈번한 reference transition 상위 5에 focusKey가 toKey인 쌍이 포함될 때
                      표시됩니다.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="cyl-diag__empty">진단할 타자 데이터가 존재하지 않습니다.</p>
            )}
          </section>

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
                  <span className="cyl-diag__stat-lbl">구름타법 · Hold / Latency</span>
                  <CloudTypingView cloudTyping={diagnostics.cloudTyping} />
                  <p className="cyl-diag__card-desc">
                    outgoing transition(fromKey === focusKey) 전체. D는 reference
                    transition hold,
                    |ND|≤0.25면 롤오버. 분석 풀 11회 이상일 때만 집계.
                  </p>
                </div>

                {diagnostics.fatalNgrams.length > 0 && (
                  <div className="cyl-diag__detailed-card cyl-diag__detailed-card--optional">
                    <span className="cyl-diag__stat-lbl">
                      치명적 3-Gram 오타 맥락 <OptionalTag />
                    </span>

                    {diagnostics.fatalNgrams.map((entry, index) => (
                      <FatalNgramViz key={`${entry.sequence.join("→")}-${index}`} entry={entry} />
                    ))}

                    <p className="cyl-diag__card-desc">
                      K₁·K₂ 정타 뒤 focusKey 시도(정타·오타 모두 분모) 중 오타율이{" "}
                      {FATAL_NGRAM_ERROR_RATE_THRESHOLD}% 초과이고 {FATAL_NGRAM_MIN_SAMPLES}회 이상인
                      연속 알파 3타 맥락입니다.
                    </p>
                  </div>
                )}

                {diagnostics.burstNgrams.length > 0 && (
                  <div className="cyl-diag__detailed-card cyl-diag__detailed-card--optional">
                    <span className="cyl-diag__stat-lbl">
                      버스트 (고속 연타 조합) <OptionalTag />
                    </span>
                    {diagnostics.burstNgrams.map((entry, index) => (
                      <BurstNgramViz key={`burst-${entry.sequence.join("→")}-${index}`} entry={entry} rank={index + 1} />
                    ))}
                    <p className="cyl-diag__card-desc">
                      focusKey가 포함된 키보드 입력 패턴 중 지연 시간이 연속 30ms 이하인 빠른 연타 조합 상위 3개입니다.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="cyl-diag__empty">진단할 타자 데이터가 없습니다.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
