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

import { KeyEvent } from "@/lib/skdm";

interface CylindricalVector3DProps {
  isActivated: boolean;
  /** Optionally pre-select a center key from the parent. */
  initialCenterKey?: string;
  onClose?: () => void;
  /** Override store events for testing or landing page mock data */
  mockEvents?: KeyEvent[];
  /** Lock OrbitControls — use on landing page where the view should be static */
  disableControls?: boolean;
  /** Hide the diagnostics panel — use on landing page */
  hidePanel?: boolean;
}

interface CylindricalVector3DInnerProps extends Omit<CylindricalVector3DProps, "mockEvents"> {
  events: KeyEvent[];
}

function CylindricalVector3DInner({
  isActivated,
  initialCenterKey,
  events,
  disableControls = false,
  hidePanel = false,
}: CylindricalVector3DInnerProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  const [focusKey, setFocusKey] = useState(initialCenterKey ?? "");
  const [selectedFrom, setSelectedFrom] = useState("");
  const [managerReady, setManagerReady] = useState(false);
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [toggles] = useState<CylindricalToggles>({
    cylinder: true,
    grid: true,
    projections: false,
    petal: true,
    autoRotate: false,
  });

  const globalMax = useMemo(() => getGlobalCylindricalMax(events), [events]);
  const defaultSelection = useMemo(
    () => getDefaultCylindricalSelection(events, initialCenterKey),
    [events, initialCenterKey],
  );
  const vectors = useMemo(
    () => (focusKey ? buildCylindricalVectors(events, focusKey, globalMax) : []),
    [events, focusKey, globalMax],
  );

  useEffect(() => {
    if (!defaultSelection) return;
    const timer = setTimeout(() => {
      setFocusKey(defaultSelection.toKey);
      setSelectedFrom(defaultSelection.fromKey);
    }, 0);
    return () => clearTimeout(timer);
  }, [defaultSelection]);

  const handleInit = useCallback(
    (mgr: Cylindrical3DManager) => {
      if (disableControls) mgr.lockControls();
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
      setManagerReady(true);
    },
    [disableControls],
  );

  const managerRef = useThreeManager(Cylindrical3DManager, mountRef, isActivated, handleInit);

  useEffect(() => {
    managerRef.current?.updateScene(vectors, selectedFrom);
  }, [vectors, selectedFrom, managerReady]);

  useEffect(() => {
    managerRef.current?.setToggles(toggles);
  }, [toggles]);

  if (!isActivated) return null;

  return (
    <div className="cyl-viewport">
      {!hidePanel && (
        <CylindricalDiagnosticsPanel
          events={events}
          focusKey={focusKey}
          setFocusKey={setFocusKey}
        />
      )}

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
}

function CylindricalVector3DWithStore(props: Omit<CylindricalVector3DProps, "mockEvents">) {
  const storeEvents = useWorkspaceStore((state) => state.analysisEvents);
  return <CylindricalVector3DInner {...props} events={storeEvents} />;
}

export const CylindricalVector3D: React.FC<CylindricalVector3DProps> = ({
  mockEvents,
  ...props
}) => {
  if (mockEvents) {
    return <CylindricalVector3DInner {...props} events={mockEvents} />;
  }
  return <CylindricalVector3DWithStore {...props} />;
};
