"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useThreeManager } from "@/hooks/useThreeManager";
import {
  buildCylindricalVectors,
  getDefaultCylindricalSelection,
  getGlobalCylindricalMax,
} from "@/lib/skdm/cylindrical";
import { Cylindrical3DManager, LabelProjection, CylindricalToggles } from "./Cylindrical3DManager";
import { CylindricalDiagnosticsPanel } from "./CylindricalDiagnosticsPanel";

interface CylindricalVector3DProps {
  isActivated: boolean;
  /** Optionally pre-select a center key from the parent. */
  initialCenterKey?: string;
  onClose?: () => void;
}

export const CylindricalVector3D: React.FC<CylindricalVector3DProps> = ({
  isActivated,
  initialCenterKey,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const events = useWorkspaceStore((state) => state.analysisEvents);

  // --- Local state ---
  const [selectedTo, setSelectedTo] = useState(initialCenterKey ?? "");
  const [selectedFrom, setSelectedFrom] = useState("");
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [toggles] = useState<CylindricalToggles>({
    cylinder: true,
    grid: true,
    projections: false,
    petal: true,
    autoRotate: false,
  });

  // --- Derived data ---
  const globalMax = useMemo(() => getGlobalCylindricalMax(events), [events]);
  const defaultSelection = useMemo(
    () => getDefaultCylindricalSelection(events, initialCenterKey),
    [events, initialCenterKey],
  );
  const vectors = useMemo(
    () => (selectedTo ? buildCylindricalVectors(events, selectedTo, globalMax) : []),
    [events, selectedTo, globalMax],
  );

  // Initial view: richest To key and its richest From transition
  useEffect(() => {
    if (!defaultSelection) return;
    const timer = setTimeout(() => {
      setSelectedTo(defaultSelection.toKey);
      setSelectedFrom(defaultSelection.fromKey);
    }, 0);
    return () => clearTimeout(timer);
  }, [defaultSelection]);

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

  return (
    <div className="cyl-viewport">
      <CylindricalDiagnosticsPanel
        events={events}
        selectedTo={selectedTo}
        setSelectedTo={setSelectedTo}
      />

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
          overflow: "hidden",
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
    </div>
  );
};
