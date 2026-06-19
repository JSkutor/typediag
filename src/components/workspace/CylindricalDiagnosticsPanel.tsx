"use client";

import React, { useState } from "react";
import { KeyEvent } from "@/lib/skdm";
import { useCylindricalDiagnostics } from "@/hooks/useCylindricalDiagnostics";
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

  const { toKeyOptions, outcome, chartData, additionalStats } = useCylindricalDiagnostics(events, selectedTo);

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
            </div>
          </section>

          <section className="cyl-drawer__col cyl-drawer__col--diagnostics">
            <header className="cyl-drawer__col-header">
              <span className="cyl-label-text">Diagnostics Summary</span>
            </header>

            <div className="cyl-drawer__placeholder">
              {outcome && isSuccess(outcome) ? (
                <div className="cyl-drawer__summary-content">
                  <div className="cyl-drawer__summary-row">
                    <span className="cyl-drawer__summary-label">분절 이전 추세</span>
                    <span className={`cyl-drawer__summary-val ${outcome.result.slopeBefore < 0 ? "text-success" : "text-warning"}`}>
                      {outcome.result.slopeBefore < 0 ? "학습/안정화" : "지연 증가"}
                    </span>
                  </div>
                  <div className="cyl-drawer__summary-row">
                    <span className="cyl-drawer__summary-label">분절 이후 추세</span>
                    <span className={`cyl-drawer__summary-val ${outcome.result.slopeAfter < 0 ? "text-success" : "text-warning"}`}>
                      {outcome.result.slopeAfter < 0 ? "안정화 지속" : "후반 피로/지연"}
                    </span>
                  </div>
                  <div className="cyl-drawer__summary-row">
                    <span className="cyl-drawer__summary-label">성능 변화율</span>
                    <span className="cyl-drawer__summary-val">
                      {(outcome.result.slopeAfter - outcome.result.slopeBefore).toFixed(2)} ms/idx
                    </span>
                  </div>
                  <p className="cyl-drawer__desc-text">
                    선택된 키 입력의 누적 회수에 따른 경과 지연(latency) 변화를 나타냅니다.
                    분절점(c)은 타이핑 속도가 안정화되거나 피로 임계점에 도달해 패턴이 급격히 변화하는 지점입니다.
                  </p>
                </div>
              ) : (
                <p className="cyl-diag__empty">정상적으로 분석이 완료된 키에 한해 요약 리포트가 표시됩니다.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

