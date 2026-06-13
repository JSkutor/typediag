"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { useThreeManager } from "@/hooks/useThreeManager";
import {
  buildCylindricalVectors,
  getAvailableCenterKeys,
} from "@/lib/skdm/cylindrical";
import {
  Cylindrical3DManager,
  LabelProjection,
  CylindricalToggles,
} from "./Cylindrical3DManager";

interface CylindricalVector3DProps {
  isActivated: boolean;
  /** Optionally pre-select a center key from the parent. */
  initialCenterKey?: string;
  onClose?: () => void;
}

const SCALE_R = 0.3;
const SCALE_Z = 0.015;

export const CylindricalVector3D: React.FC<CylindricalVector3DProps> = ({
  isActivated,
  initialCenterKey,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const events = useTypingStore((state) => state.events);

  // --- Local state ---
  const [selectedTo, setSelectedTo] = useState(initialCenterKey ?? "");
  const [selectedFrom, setSelectedFrom] = useState("");
  const [labels, setLabels] = useState<LabelProjection | null>(null);
  const [toggles, setToggles] = useState<CylindricalToggles>({
    cylinder: true,
    grid: true,
    projections: true,
    petal: true,
    autoRotate: false,
  });

  // --- Derived data ---
  const centerKeys = useMemo(() => getAvailableCenterKeys(events), [events]);
  const vectors = useMemo(
    () => (selectedTo ? buildCylindricalVectors(events, selectedTo) : []),
    [events, selectedTo],
  );
  const fromKeys = useMemo(() => vectors.map((v) => v.fromKey), [vectors]);
  const currentVector = useMemo(
    () => vectors.find((v) => v.fromKey === selectedFrom) ?? null,
    [vectors, selectedFrom],
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
    mgr.onLabelsUpdate = setLabels;
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

  // --- Toggle helpers ---
  const toggle = useCallback(
    (key: keyof CylindricalToggles) =>
      setToggles((prev) => ({ ...prev, [key]: !prev[key] })),
    [],
  );

  // --- Computed display values ---
  const display = useMemo(() => {
    if (!currentVector) {
      return {
        r: "-",
        theta: "-",
        z: "-",
        x: "-",
        y: "-",
        zCart: "-",
        formulaX: "X = r × cos(θ)",
        formulaZ: "Z = r × sin(θ)",
      };
    }
    const v = currentVector;
    const thetaRad = v.theta;
    const vx = v.r * SCALE_R * Math.cos(thetaRad);
    const vy = v.z * SCALE_Z;
    const vz = v.r * SCALE_R * Math.sin(thetaRad);

    return {
      r: `${v.r}`,
      theta: `${v.thetaDeg.toFixed(1)}° (${thetaRad.toFixed(3)} rad)`,
      z: `${v.z.toFixed(1)} ms`,
      x: vx.toFixed(3),
      y: vy.toFixed(3),
      zCart: vz.toFixed(3),
      formulaX: `X = ${v.r} × cos(${v.thetaDeg.toFixed(1)}°) = ${vx.toFixed(3)}`,
      formulaZ: `Z = ${v.r} × sin(${v.thetaDeg.toFixed(1)}°) = ${vz.toFixed(3)}`,
    };
  }, [currentVector]);

  if (!isActivated) return null;

  return (
    <div className="cyl-viewport">
      {/* Three.js mount point */}
      <div ref={mountRef} className="cyl-canvas" />

      {/* 2D floating labels */}
      {labels?.originVisible && (
        <div
          className="cyl-label cyl-label--origin"
          style={{ left: labels.originX, top: labels.originY - 18 }}
        >
          Origin (To): {selectedTo.toUpperCase()} [0, 0, 0]
        </div>
      )}
      {labels?.targetVisible && currentVector && (
        <div
          className="cyl-label cyl-label--target"
          style={{ left: labels.targetX, top: labels.targetY - 18 }}
        >
          Vector (From): {selectedFrom.toUpperCase()} [{display.x}, {display.y},{" "}
          {display.zCart}]
        </div>
      )}

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

        {/* Key pair display */}
        <div className="cyl-info-card">
          <div className="cyl-pair-header">
            <span className="cyl-badge cyl-badge--from">
              {selectedFrom.toUpperCase() || "-"}
            </span>
            <span className="cyl-arrow">──▸──</span>
            <span className="cyl-badge cyl-badge--to">
              {selectedTo.toUpperCase() || "-"}
            </span>
          </div>

          {/* Cylindrical coordinates */}
          <div className="cyl-control-group">
            <span className="cyl-label-text">
              Cylindrical Coordinates
            </span>
            <table className="cyl-table">
              <thead>
                <tr>
                  <th>Axis</th>
                  <th>Property</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="cyl-td--label">r</td>
                  <td>Frequency</td>
                  <td className="cyl-td--accent">{display.r}</td>
                </tr>
                <tr>
                  <td className="cyl-td--label">θ</td>
                  <td>Angle</td>
                  <td className="cyl-td--warning">{display.theta}</td>
                </tr>
                <tr>
                  <td className="cyl-td--label">z</td>
                  <td>Latency</td>
                  <td className="cyl-td--success">{display.z}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cartesian coordinates */}
          <div
            className="cyl-control-group"
            style={{
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: 10,
            }}
          >
            <span className="cyl-label-text">
              Three.js Cartesian
            </span>
            <table className="cyl-table">
              <thead>
                <tr>
                  <th>Axis</th>
                  <th>Formula</th>
                  <th>Scaled</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="cyl-td--label">X</td>
                  <td>r × cos(θ)</td>
                  <td className="cyl-td--error">{display.x}</td>
                </tr>
                <tr>
                  <td className="cyl-td--label">Y</td>
                  <td>z_latency</td>
                  <td className="cyl-td--success">{display.y}</td>
                </tr>
                <tr>
                  <td className="cyl-td--label">Z</td>
                  <td>r × sin(θ)</td>
                  <td className="cyl-td--accent">{display.zCart}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Formula box */}
        <div className="cyl-formula-box">
          <div className="cyl-formula-title">Coordinate Transform</div>
          <div className="cyl-formula-content">
            θ(rad) = θ(deg) × π / 180
            <br />
            <code className="cyl-formula">{display.formulaX}</code>
            <br />
            <code className="cyl-formula">{display.formulaZ}</code>
            <br />
            <span className="cyl-formula-note">
              ※ Scale: R × 0.3, Z × 0.015 (1 unit ≈ freq 3.3 or 66.7ms)
            </span>
          </div>
        </div>

        {/* Toggles */}
        <div className="cyl-control-group">
          <span className="cyl-label-text">Viewport Settings</span>
          <div className="cyl-toggles">
            <ToggleItem
              label="Cylinder Grid"
              checked={toggles.cylinder}
              onChange={() => toggle("cylinder")}
            />
            <ToggleItem
              label="Ground Grid"
              checked={toggles.grid}
              onChange={() => toggle("grid")}
            />
            <ToggleItem
              label="Projections"
              checked={toggles.projections}
              onChange={() => toggle("projections")}
            />
            <ToggleItem
              label="Petal Surface"
              checked={toggles.petal}
              onChange={() => toggle("petal")}
            />
            <ToggleItem
              label="Auto Orbit"
              checked={toggles.autoRotate}
              onChange={() => toggle("autoRotate")}
            />
          </div>
        </div>

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
// Toggle sub-component
// ---------------------------------------------------------------------------

const ToggleItem: React.FC<{
  label: string;
  checked: boolean;
  onChange: () => void;
}> = ({ label, checked, onChange }) => (
  <div className="cyl-toggle-item">
    <span>{label}</span>
    <label className="cyl-switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="cyl-slider" />
    </label>
  </div>
);
