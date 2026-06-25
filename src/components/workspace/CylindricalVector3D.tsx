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
import { offsetHudLabelsFromAnchor } from "./cylindricalPetalGeometry";

import { KeyEvent } from "@/lib/skdm";

interface CylindricalVector3DProps {
  isActivated: boolean;
  /** Optionally pre-select a center key from the parent. */
  initialFocusKey?: string;
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
  initialFocusKey,
  events,
  disableControls = false,
  hidePanel = false,
}: CylindricalVector3DInnerProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  const [focusKey, setFocusKey] = useState(initialFocusKey ?? "");
  const [selectedFrom, setSelectedFrom] = useState("");
  const [shouldRenderThree, setShouldRenderThree] = useState(false);
  const [managerReady, setManagerReady] = useState(false);
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [toggles] = useState<CylindricalToggles>({
    grid: true,
    projections: false,
    petal: true,
    autoRotate: false,
  });

  const globalMax = useMemo(() => getGlobalCylindricalMax(events), [events]);
  const defaultSelection = useMemo(
    () => getDefaultCylindricalSelection(events, initialFocusKey),
    [events, initialFocusKey],
  );
  const vectors = useMemo(
    () => (focusKey ? buildCylindricalVectors(events, focusKey, globalMax) : []),
    [events, focusKey, globalMax],
  );

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isActivated) {
      timer = setTimeout(() => {
        setShouldRenderThree(true);
      }, 350);
    } else {
      timer = setTimeout(() => {
        setShouldRenderThree(false);
        setManagerReady(false);
      }, 0);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [isActivated]);

  useEffect(() => {
    if (!defaultSelection) return;
    const timer = setTimeout(() => {
      setFocusKey(defaultSelection.focusKey);
      setSelectedFrom(defaultSelection.fromKey);
    }, 0);
    return () => clearTimeout(timer);
  }, [defaultSelection]);

  const handleInit = useCallback(
    (mgr: Cylindrical3DManager) => {
      if (disableControls) mgr.lockControls();
      mgr.onLabelsUpdate = (proj: LabelProjection) => {
        if (!proj.vectorCoords) return;

        const labels = offsetHudLabelsFromAnchor(
          proj.vectorCoords,
          proj.originX,
          proj.originY,
        );
        labels.forEach((item) => {
          const el = labelRefs.current[item.fromKey];
          if (!el) return;

          if (item.visible) {
            el.style.display = "block";
            el.style.transform = `translate3d(-50%, -50%, 0) translate3d(${item.x}px, ${item.y}px, 0)`;
          } else {
            el.style.display = "none";
          }
        });
      };
      setManagerReady(true);
    },
    [disableControls],
  );

  const managerRef = useThreeManager(Cylindrical3DManager, mountRef, shouldRenderThree, handleInit);

  const handleDrawerShiftPx = useCallback((shiftPx: number) => {
    managerRef.current?.setDrawerShiftPx(shiftPx);
  }, [managerRef]);

  useEffect(() => {
    if (shouldRenderThree && managerReady && managerRef.current) {
      managerRef.current.updateScene(vectors, selectedFrom);
    }
  }, [vectors, selectedFrom, managerReady, shouldRenderThree, managerRef]);

  useEffect(() => {
    if (shouldRenderThree && managerRef.current) {
      managerRef.current.setToggles(toggles);
    }
  }, [toggles, shouldRenderThree, managerRef]);

  if (!isActivated) return null;

  return (
    <div className="cyl-viewport">
      {!hidePanel && (
        <CylindricalDiagnosticsPanel
          events={events}
          focusKey={focusKey}
          fromKey={selectedFrom}
          onDrawerShiftPx={handleDrawerShiftPx}
        />
      )}

      <div ref={mountRef} className="cyl-canvas" />

      <div className="cyl-labels-container">
        {vectors.map((v) => {
          const label = v.fromKey.toUpperCase();

          return (
            <div
              key={v.fromKey}
              ref={(el) => {
                labelRefs.current[v.fromKey] = el;
              }}
              className="cyl-key-label"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setSelectedFrom(v.fromKey)}
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
