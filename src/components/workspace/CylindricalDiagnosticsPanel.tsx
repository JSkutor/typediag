"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCylindricalDiagnostics } from "@/hooks/useCylindricalDiagnostics";
import { computeDrawerContentShiftPx } from "@/components/workspace/cylindricalDrawerInset";
import { SpatialErrorOrbitViz } from "@/components/workspace/SpatialErrorOrbitViz";
import { BurstNgramViz } from "@/components/workspace/diagnostics/BurstNgramViz";
import { CloudTypingView } from "@/components/workspace/diagnostics/CloudTypingView";
import { FatalNgramViz } from "@/components/workspace/diagnostics/FatalNgramViz";
import { LatencyDistributionView } from "@/components/workspace/diagnostics/LatencyDistributionView";
import { PiecewiseChart } from "@/components/workspace/diagnostics/PiecewiseChart";
import { FingerTransitionViz } from "@/components/workspace/diagnostics/FingerTransitionViz";
import { formatKey, formatKeyJamo } from "@/components/workspace/diagnostics/formatKey";
import {
  DEV_MOCK_CHART_DATA,
  DEV_MOCK_DIAGNOSTICS,
  DEV_MOCK_OUTCOME,
} from "@/components/workspace/diagnostics/devMockData";

interface CylindricalDiagnosticsPanelProps {
  events: Parameters<typeof useCylindricalDiagnostics>[0];
  focusKey: string;
  fromKey?: string;
  onDrawerShiftPx?: (shiftPx: number) => void;
}

export const CylindricalDiagnosticsPanel: React.FC<CylindricalDiagnosticsPanelProps> = ({
  events,
  focusKey,
  fromKey,
  onDrawerShiftPx,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const drawerBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;

      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || target.isContentEditable) {
          return;
        }
      }

      e.preventDefault();
      setIsOpen((prev) => !prev);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!onDrawerShiftPx) return;

    let rafId = 0;

    const reportShift = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const bodyWidth = drawerBodyRef.current?.getBoundingClientRect().width ?? 0;
        onDrawerShiftPx(computeDrawerContentShiftPx(bodyWidth));
      });
    };

    reportShift();

    const body = drawerBodyRef.current;
    if (!body) return;

    const observer = new ResizeObserver(reportShift);
    observer.observe(body);
    window.addEventListener("resize", reportShift);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("resize", reportShift);
    };
  }, [onDrawerShiftPx]);

  const {
    outcome: realOutcome,
    chartData: realChartData,
    diagnostics: realDiagnostics,
  } = useCylindricalDiagnostics(events, focusKey, fromKey);

  const outcome = isDevMode ? DEV_MOCK_OUTCOME : realOutcome;
  const chartData = isDevMode ? DEV_MOCK_CHART_DATA : realChartData;
  const diagnostics = isDevMode ? DEV_MOCK_DIAGNOSTICS : realDiagnostics;

  const hasData = isDevMode || (events.length > 0 && focusKey);
  const displayFocusKey = isDevMode && !focusKey ? "ㅇ" : focusKey;
  const displayFromKey = isDevMode && !fromKey ? "ㅏ" : fromKey;

  return (
    <div
      className={`cyl-drawer ${isOpen ? "cyl-drawer--open" : ""}`}
      style={{ position: "relative" }}
    >
      {isOpen && (
        <span
          style={{
            position: "absolute",
            top: "-28px",
            left: "68px",
            fontSize: "14px",
            fontWeight: "bold",
            color: "#ff6b6b",
            zIndex: 100,
            whiteSpace: "nowrap",
          }}
        >
          Beta Free
        </span>
      )}
      <button
        type="button"
        className="cyl-drawer__toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="cyl-drawer-panel"
        aria-label={isOpen ? "진단 패널 닫기 (Space)" : "진단 패널 열기 (Space)"}
      >
        <span className="cyl-drawer__chevron" aria-hidden="true">
          ›
        </span>
      </button>

      <div
        id="cyl-drawer-panel"
        ref={drawerBodyRef}
        className="cyl-drawer__body"
        aria-hidden={!isOpen}
      >
        <div className="cyl-drawer__grid">
          <section className="cyl-drawer__col cyl-drawer__col--controls">
            <header className="cyl-drawer__col-header">
              <div className="cyl-drawer__header-main">
                <span className="cyl-panel__subtitle">Key</span>
                <div className="cyl-panel__focus-key-display">
                  {displayFocusKey ? formatKey(displayFocusKey).toUpperCase() : "-"}
                </div>
              </div>
              <button
                type="button"
                className={`cyl-diag__dev-toggle ${isDevMode ? "cyl-diag__dev-toggle--active" : ""}`}
                onClick={() => setIsDevMode(!isDevMode)}
              >
                <span className="cyl-diag__dev-toggle-dot" />
                {isDevMode ? "DEV ON" : "DEV OFF"}
              </button>
            </header>

            {hasData ? (
              <div className="cyl-diag__detailed-content">
                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">지연시간 추이</span>
                  <PiecewiseChart outcome={outcome} chartData={chartData} />
                </div>

                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">속도 일관성</span>
                  <LatencyDistributionView consistency={diagnostics.latencyConsistency} />
                </div>

                <div className="cyl-diag__detailed-card cyl-diag__detailed-card--split">
                  <div className="cyl-diag__split-stat">
                    <span className="cyl-diag__stat-lbl">오타 유발 비율</span>
                    <span className="cyl-diag__median-val">
                      {diagnostics.errorInducement.rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="cyl-diag__split-stat">
                    <span className="cyl-diag__stat-lbl">같은 손가락 다른 키와 비교</span>
                    {diagnostics.relativeSpeed.handMedianMs > 0 ? (
                      <span
                        className={`cyl-diag__relative-val ${diagnostics.relativeSpeed.speedDiffMs <= 0 ? "text-success" : "text-warning"}`}
                      >
                        {diagnostics.relativeSpeed.speedDiffMs <= 0 ? "" : "+"}
                        {diagnostics.relativeSpeed.speedDiffMs.toFixed(1)} ms
                      </span>
                    ) : (
                      <span className="cyl-diag__relative-val text-muted">—</span>
                    )}
                  </div>
                </div>

                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">이전 타건 손가락 위치</span>
                  <FingerTransitionViz focusKey={displayFocusKey} diagnostics={diagnostics} />
                </div>

                {diagnostics.unconsciousKey !== null && (
                  <div className="cyl-diag__detailed-card cyl-diag__detailed-card--optional">
                    <span className="cyl-diag__stat-lbl">무의식적으로 많이 치는 키</span>
                    <div className="cyl-diag__penalty-content">
                      <span className="cyl-diag__penalty-count text-warning">
                        #{diagnostics.unconsciousKey.rank}
                      </span>
                      <span className="cyl-diag__median-val cyl-diag__key-text">
                        {formatKey(diagnostics.unconsciousKey.key)}
                      </span>
                      <span className="cyl-diag__cpm-val text-warning">
                        {diagnostics.unconsciousKey.errorRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                {diagnostics.shiftPenalty !== null && (
                  <div className="cyl-diag__detailed-card cyl-diag__detailed-card--optional">
                    <span className="cyl-diag__stat-lbl">시프트로 생기는 추가 지연</span>
                    <div className="cyl-diag__penalty-content">
                      <span className="cyl-diag__penalty-val">
                        +{diagnostics.shiftPenalty.differenceMs.toFixed(1)} ms
                      </span>
                      <span className="cyl-diag__penalty-count">
                        {diagnostics.shiftPenalty.shiftCount}회
                      </span>
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
              <span className="cyl-panel__subtitle">Flow</span>
              <div className="cyl-panel__transition-display">
                <span>{displayFocusKey ? formatKey(displayFocusKey).toUpperCase() : "-"}</span>
                <span className="cyl-panel__transition-arrow">←</span>
                <span>{displayFromKey ? formatKey(displayFromKey).toUpperCase() : "-"}</span>
              </div>
            </header>

            {hasData ? (
              <div className="cyl-diag__detailed-content">
                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">연결 속도</span>
                  <div className="cyl-diag__median-box">
                    <span className="cyl-diag__median-val">
                      {diagnostics.speedMetrics.medianLatencyMs.toFixed(1)} ms
                    </span>
                    <span className="cyl-diag__cpm-val">
                      {diagnostics.speedMetrics.equivalentCpm} CPM
                    </span>
                  </div>
                </div>

                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">머뭇거림</span>
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
                </div>

                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">타자 순서 반대</span>
                  <div className="cyl-diag__median-box">
                    <span className="cyl-diag__median-val">
                      {diagnostics.lateKeystroke.rate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {diagnostics.commonPair !== null && (
                  <div className="cyl-diag__detailed-card cyl-diag__detailed-card--optional">
                    <span className="cyl-diag__stat-lbl">가장 많이 사용한 연결</span>
                    <div className="cyl-diag__penalty-content">
                      <span className="cyl-diag__penalty-count text-accent">
                        #{diagnostics.commonPair.rank}
                      </span>
                      <span className="cyl-diag__median-val">
                        {formatKeyJamo(diagnostics.commonPair.from)} →{" "}
                        {formatKeyJamo(diagnostics.commonPair.to)}
                      </span>
                      <span className="cyl-diag__penalty-count">
                        {diagnostics.commonPair.count}회
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="cyl-diag__empty">진단할 타자 데이터가 존재하지 않습니다.</p>
            )}
          </section>

          <section className="cyl-drawer__col cyl-drawer__col--diagnostics">
            <header className="cyl-drawer__col-header">
              <span className="cyl-panel__subtitle">Pro</span>
            </header>

            {hasData ? (
              <div className="cyl-diag__detailed-content">
                <div className="cyl-diag__detailed-card cyl-diag__detailed-card--optional">
                  <span className="cyl-diag__stat-lbl">오타 위치</span>
                  {diagnostics.spatialErrorDistance ? (
                    <SpatialErrorOrbitViz
                      focusKey={displayFocusKey}
                      data={diagnostics.spatialErrorDistance}
                    />
                  ) : (
                    <p className="cyl-diag__empty">오타 샘플이 없습니다.</p>
                  )}
                </div>

                <div className="cyl-diag__detailed-card">
                  <span className="cyl-diag__stat-lbl">구름타법</span>
                  <CloudTypingView cloudTyping={diagnostics.cloudTyping} />
                </div>

                {diagnostics.fatalNgrams.length > 0 && (
                  <div className="cyl-diag__detailed-card cyl-diag__detailed-card--optional">
                    <span className="cyl-diag__stat-lbl">취약한 흐름</span>

                    {diagnostics.fatalNgrams.map((entry, index) => (
                      <FatalNgramViz key={`${entry.sequence.join("→")}-${index}`} entry={entry} />
                    ))}
                  </div>
                )}

                {diagnostics.burstNgrams.length > 0 && (
                  <div className="cyl-diag__detailed-card cyl-diag__detailed-card--optional">
                    <span className="cyl-diag__stat-lbl">초고속 구간</span>
                    {diagnostics.burstNgrams.map((entry, index) => (
                      <BurstNgramViz
                        key={`burst-${entry.sequence.join("→")}-${index}`}
                        entry={entry}
                        rank={index + 1}
                      />
                    ))}
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
