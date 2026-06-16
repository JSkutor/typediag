"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useThreeManager } from "@/hooks/useThreeManager";
import {
  buildCylindricalVectors,
  getAvailableCenterKeys,
  getGlobalCylindricalMax,
} from "@/lib/skdm/cylindrical";
import {
  Cylindrical3DManager,
  LabelProjection,
  CylindricalToggles,
} from "./Cylindrical3DManager";
import {
  getShiftOverhead,
  getFirstErrorStats,
  getPhysicalVariance,
  getSlowestFromKeys,
  type ShiftOverheadResult,
  type FirstErrorResult,
  type PhysicalVarianceResult,
  type SlowestFromKey,
} from "@/lib/skdm/diagnostics";
import { isShiftCombinable, KEYBOARD_META } from "@/lib/skdm/keyboardMeta";

interface CylindricalVector3DProps {
  isActivated: boolean;
  /** Optionally pre-select a center key from the parent. */
  initialCenterKey?: string;
  onClose?: () => void;
}

export const CylindricalVector3D: React.FC<CylindricalVector3DProps> = ({
  isActivated,
  initialCenterKey,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const events = useWorkspaceStore((state) => state.analysisEvents);

  // --- Local state ---
  const [selectedTo, setSelectedTo] = useState(initialCenterKey ?? "");
  const [selectedFrom, setSelectedFrom] = useState("");
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [toggles, setToggles] = useState<CylindricalToggles>({
    cylinder: true,
    grid: true,
    projections: false,
    petal: true,
    autoRotate: false,
  });

  // --- Derived data ---
  const centerKeys = useMemo(() => getAvailableCenterKeys(events), [events]);
  const globalMax = useMemo(() => getGlobalCylindricalMax(events), [events]);
  const vectors = useMemo(
    () => (selectedTo ? buildCylindricalVectors(events, selectedTo, globalMax) : []),
    [events, selectedTo, globalMax],
  );
  const fromKeys = useMemo(() => vectors.map((v) => v.fromKey), [vectors]);

  // --- Diagnostics data ---
  const shiftData = useMemo<ShiftOverheadResult>(
    () => getShiftOverhead(events, selectedTo),
    [events, selectedTo],
  );
  const errorData = useMemo<FirstErrorResult>(
    () => getFirstErrorStats(events, selectedTo),
    [events, selectedTo],
  );
  const physicalData = useMemo<PhysicalVarianceResult>(
    () => getPhysicalVariance(events, selectedTo),
    [events, selectedTo],
  );
  const slowestKeys = useMemo<SlowestFromKey[]>(
    () => getSlowestFromKeys(vectors, 5),
    [vectors],
  );

  // Auto-select first center key when data becomes available
  useEffect(() => {
    if (!selectedTo && centerKeys.length > 0) {
      setSelectedTo(centerKeys[0]);
    }
  }, [centerKeys, selectedTo]);

  // Auto-select first from key when center key changes
  useEffect(() => {
    if (fromKeys.length > 0 && !fromKeys.includes(selectedFrom)) {
      setSelectedFrom(fromKeys[0]);
    }
  }, [fromKeys, selectedFrom]);

  // --- Manager lifecycle ---
  const handleInit = useCallback((mgr: Cylindrical3DManager) => {
    mgr.onLabelsUpdate = (proj: LabelProjection) => {
      if (proj.vectorCoords) {
        proj.vectorCoords.forEach((item) => {
          const el = labelRefs.current[item.fromKey];
          if (el) {
            if (item.visible) {
              el.style.display = "block";
              el.style.transform = `translate3d(-50%, -50%, 0) translate3d(${item.x}px, ${item.y}px, 0)`;
            } else {
              el.style.display = "none";
            }
          }
        });
      }
    };
  }, []);

  const managerRef = useThreeManager(Cylindrical3DManager, mountRef, isActivated, handleInit);

  // Update scene when data or selection changes
  useEffect(() => {
    managerRef.current?.updateScene(vectors, selectedFrom);
  }, [vectors, selectedFrom]);

  // Update toggles
  useEffect(() => {
    managerRef.current?.setToggles(toggles);
  }, [toggles]);

  if (!isActivated) return null;

  const meta = KEYBOARD_META[selectedTo.toLowerCase()];
  const handLabel = meta ? (meta.hand === "L" ? "왼손" : "오른손") : "-";
  const fingerLabel = meta
    ? ({ pinky: "새끼", ring: "약지", middle: "중지", index: "검지" }[meta.finger])
    : "-";

  return (
    <div className="cyl-viewport">
      {/* Three.js mount point */}
      <div ref={mountRef} className="cyl-canvas" />

      <div
        className="cyl-labels-container"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "hidden"
        }}
      >
        {vectors.map((v) => {
          const label = v.fromKey.toUpperCase();
          const isSelected = v.fromKey === selectedFrom;
          
          return (
            <div
              key={v.fromKey}
              ref={(el) => {
                labelRefs.current[v.fromKey] = el;
              }}
              className={`hud-label-btn ${isSelected ? "hud-label-btn--selected" : ""}`}
              onClick={() => setSelectedFrom(v.fromKey)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                color: isSelected ? "#ffffff" : "rgba(228, 230, 235, 0.9)",
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: "bold",
                fontSize: "12px",
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                willChange: "transform, opacity",
                display: "none",
                cursor: "pointer",
                pointerEvents: "auto",
                background: isSelected ? "rgba(99, 102, 241, 0.85)" : "rgba(30, 41, 59, 0.4)",
                border: isSelected ? "1px solid #6366f1" : "1px solid rgba(99, 102, 241, 0.3)",
                padding: "1px 4px",
                borderRadius: "3px",
                transition: "border-color 0.2s, background-color 0.2s, color 0.2s",
                boxShadow: isSelected ? "0 0 8px rgba(99, 102, 241, 0.5)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.8)";
                  e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.2)";
                  e.currentTarget.style.color = "#ffffff";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
                  e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.4)";
                  e.currentTarget.style.color = "rgba(228, 230, 235, 0.9)";
                }
              }}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Dashboard panel */}
      <div className="cyl-panel glass-panel">
        {/* Header */}
        <div className="cyl-panel__header">
          {onClose && (
            <button 
              onClick={onClose}
              className="cyl-back-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "none",
                border: "none",
                color: "var(--accent, #3861fb)",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: "pointer",
                padding: "0 0 12px 0",
                transition: "color 0.2s ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back to Keyboard
            </button>
          )}
          <span className="cyl-panel__subtitle">
            Spatial Keystroke Dynamics Model
          </span>
          <h2 className="cyl-panel__title">Cylindrical Vector Diagnostics</h2>
        </div>

        {/* Key pair selectors */}
        <div className="cyl-control-group">
          <span className="cyl-label-text">Transition Pair</span>
          <div className="cyl-selectors">
            <div>
              <span className="cyl-label-text cyl-label-text--pink">
                To Key (원점)
              </span>
              <select
                className="cyl-select"
                value={selectedTo}
                onChange={(e) => setSelectedTo(e.target.value)}
              >
                {centerKeys.map((k) => (
                  <option key={k} value={k}>
                    {k.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="cyl-label-text cyl-label-text--cyan">
                From Key (방향)
              </span>
              <select
                className="cyl-select"
                value={selectedFrom}
                onChange={(e) => setSelectedFrom(e.target.value)}
              >
                {fromKeys.map((k) => (
                  <option key={k} value={k}>
                    {k.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Key info badge */}
        <div className="cyl-key-badge">
          <span className="cyl-key-badge__letter">{selectedTo.toUpperCase()}</span>
          <div className="cyl-key-badge__meta">
            <span>{handLabel} · {fingerLabel}</span>
            <span>Row {meta?.row ?? "-"}</span>
          </div>
        </div>

        {/* ── Diagnostics sections ── */}

        {/* 1. Rhythm Breaker (First Error Incidence) */}
        <DiagSection
          title="Rhythm Breaker"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          }
        >
          {errorData.totalBreaks === 0 ? (
            <span className="cyl-diag__empty">데이터 부족</span>
          ) : (
            <>
              <div className="cyl-diag__row">
                <span className="cyl-diag__label">최초 오타 유발</span>
                <span className="cyl-diag__value cyl-diag__value--error">
                  {errorData.breakCount}회
                </span>
              </div>
              <div className="cyl-diag__row">
                <span className="cyl-diag__label">전체 리듬 브레이크 중</span>
                <span className="cyl-diag__value">
                  {errorData.totalBreaks > 0
                    ? `${((errorData.breakCount / errorData.totalBreaks) * 100).toFixed(1)}%`
                    : "-"}
                </span>
              </div>
              {errorData.breakCount > 0 && (
                <>
                  <div className="cyl-diag__row">
                    <span className="cyl-diag__label">연쇄 수정 비용</span>
                    <span className="cyl-diag__value">
                      평균 {errorData.avgCascade.toFixed(1)}타
                    </span>
                  </div>
                  <div className="cyl-diag__row">
                    <span className="cyl-diag__label">즉시 인지율</span>
                    <span className={`cyl-diag__value ${errorData.immediateCorrectionRate >= 0.7 ? "cyl-diag__value--success" : "cyl-diag__value--warning"}`}>
                      {(errorData.immediateCorrectionRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </DiagSection>

        {/* 2. Slowest From Keys (Top 5) */}
        <DiagSection
          title="가장 느린 진입"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        >
          {slowestKeys.length === 0 ? (
            <span className="cyl-diag__empty">데이터 부족</span>
          ) : (
            <div className="cyl-diag__rank-list">
              {slowestKeys.map((sk, idx) => (
                <div key={sk.fromKey} className="cyl-diag__rank-item">
                  <span className="cyl-diag__rank-num">{idx + 1}</span>
                  <span className="cyl-diag__rank-key">{sk.fromKey.toUpperCase()}</span>
                  <span className="cyl-diag__rank-bar">
                    <span
                      className="cyl-diag__rank-fill"
                      style={{
                        width: `${Math.min(100, (sk.avgLatencyMs / (slowestKeys[0]?.avgLatencyMs || 1)) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="cyl-diag__rank-ms">{Math.round(sk.avgLatencyMs)}ms</span>
                </div>
              ))}
            </div>
          )}
        </DiagSection>

        {/* 3. Physical Variance */}
        <DiagSection
          title="동선 분석"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="6" r="3" />
              <path d="M18 6L6 18" />
            </svg>
          }
        >
          {physicalData.altHandCount + physicalData.sameHandCount === 0 ? (
            <span className="cyl-diag__empty">데이터 부족</span>
          ) : (
            <>
              <PhysicalCompare
                labelA="교차 타건"
                labelB="같은 손"
                avgA={physicalData.altHandAvgMs}
                avgB={physicalData.sameHandAvgMs}
                countA={physicalData.altHandCount}
                countB={physicalData.sameHandCount}
              />
              <PhysicalCompare
                labelA="같은 행"
                labelB="다른 행"
                avgA={physicalData.sameRowAvgMs}
                avgB={physicalData.diffRowAvgMs}
                countA={physicalData.sameRowCount}
                countB={physicalData.diffRowCount}
              />
              <PhysicalCompare
                labelA="같은 손가락"
                labelB="다른 손가락"
                avgA={physicalData.sameFingerAvgMs}
                avgB={physicalData.diffFingerAvgMs}
                countA={physicalData.sameFingerCount}
                countB={physicalData.diffFingerCount}
              />
            </>
          )}
        </DiagSection>

        {/* 4. Shift Overhead (conditional) */}
        {shiftData.applicable && (
          <DiagSection
            title="Shift 오버헤드"
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 14h6v6h4v-6h6L12 4 4 14z" />
              </svg>
            }
          >
            {shiftData.shiftCount === 0 && shiftData.directCount === 0 ? (
              <span className="cyl-diag__empty">데이터 부족</span>
            ) : (
              <>
                {shiftData.shiftCount > 0 && shiftData.directCount > 0 && (
                  <div className="cyl-diag__row">
                    <span className="cyl-diag__label">추가 지연</span>
                    <span className={`cyl-diag__value ${shiftData.overheadMs > 0 ? "cyl-diag__value--error" : "cyl-diag__value--success"}`}>
                      {shiftData.overheadMs > 0 ? "+" : ""}
                      {Math.round(shiftData.overheadMs)}ms
                    </span>
                  </div>
                )}
                <div className="cyl-diag__row">
                  <span className="cyl-diag__label">일반 진입</span>
                  <span className="cyl-diag__value">
                    {shiftData.directCount > 0 ? `${Math.round(shiftData.directAvgMs)}ms` : "-"}
                    <span className="cyl-diag__count">({shiftData.directCount})</span>
                  </span>
                </div>
                <div className="cyl-diag__row">
                  <span className="cyl-diag__label">Shift 진입</span>
                  <span className="cyl-diag__value">
                    {shiftData.shiftCount > 0 ? `${Math.round(shiftData.shiftAvgMs)}ms` : "-"}
                    <span className="cyl-diag__count">({shiftData.shiftCount})</span>
                  </span>
                </div>
                {shiftData.shiftCount > 0 && (
                  <div className="cyl-diag__shift-ratio">
                    <div className="cyl-diag__shift-bar">
                      <span
                        className="cyl-diag__shift-left"
                        style={{ width: `${shiftData.leftShiftRatio * 100}%` }}
                      />
                      <span
                        className="cyl-diag__shift-right"
                        style={{ width: `${shiftData.rightShiftRatio * 100}%` }}
                      />
                    </div>
                    <div className="cyl-diag__shift-labels">
                      <span>L {(shiftData.leftShiftRatio * 100).toFixed(0)}%</span>
                      <span>R {(shiftData.rightShiftRatio * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </DiagSection>
        )}

        {/* Footer guide */}
        <div className="cyl-footer-guide">
          💡 Drag to <strong>rotate</strong>, right-click drag to{" "}
          <strong>pan</strong>, scroll to <strong>zoom</strong>.
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Collapsible diagnostics section. */
const DiagSection: React.FC<{
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div className="cyl-diag-section">
    <div className="cyl-diag-section__header">
      {icon && <span className="cyl-diag-section__icon">{icon}</span>}
      <span className="cyl-diag-section__title">{title}</span>
    </div>
    <div className="cyl-diag-section__body">{children}</div>
  </div>
);

/** Physical comparison row: A vs B with inline diff. */
const PhysicalCompare: React.FC<{
  labelA: string;
  labelB: string;
  avgA: number;
  avgB: number;
  countA: number;
  countB: number;
}> = ({ labelA, labelB, avgA, avgB, countA, countB }) => {
  if (countA === 0 && countB === 0) return null;

  const diff = avgA - avgB;
  const hasBoth = countA > 0 && countB > 0;

  return (
    <div className="cyl-diag__compare">
      <div className="cyl-diag__compare-row">
        <span className="cyl-diag__compare-label">{labelA}</span>
        <span className="cyl-diag__compare-val">
          {countA > 0 ? `${Math.round(avgA)}ms` : "-"}
        </span>
      </div>
      <div className="cyl-diag__compare-row">
        <span className="cyl-diag__compare-label">{labelB}</span>
        <span className="cyl-diag__compare-val">
          {countB > 0 ? `${Math.round(avgB)}ms` : "-"}
        </span>
      </div>
      {hasBoth && (
        <div className="cyl-diag__compare-diff">
          <span className={diff < 0 ? "cyl-diag__value--success" : diff > 0 ? "cyl-diag__value--warning" : ""}>
            {diff > 0 ? "+" : ""}{Math.round(diff)}ms
          </span>
        </div>
      )}
    </div>
  );
};
