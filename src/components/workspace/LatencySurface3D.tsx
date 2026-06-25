"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { KeyResult } from "@/lib/skdm";

import { Surface3DManager } from "./Surface3DManager";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useThreeManager } from "@/hooks/useThreeManager";
import { offsetHudLabelsFromAnchor } from "./cylindricalPetalGeometry";

interface LatencySurface3DProps {
  keyStats: Record<string, KeyResult>;
  triangles?: Uint32Array;
  width?: number;
  height?: number;

  isActivated?: boolean;
  /** Lock OrbitControls — use on landing page where the surface should be static */
  disableControls?: boolean;
  isLanding?: boolean;
}

export const LatencySurface3D: React.FC<LatencySurface3DProps> = ({
  keyStats,
  isActivated = false,
  disableControls = false,
  isLanding = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelsContainerRef = useRef<HTMLDivElement>(null);
  const [keys, setKeys] = useState<KeyResult[]>([]);
  const [shouldRenderThree, setShouldRenderThree] = useState(false);
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isActivated) {
      timer = setTimeout(() => {
        setShouldRenderThree(true);
      }, 350);
    } else {
      timer = setTimeout(() => {
        setShouldRenderThree(false);
      }, 0);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [isActivated]);

  const handleInit = useCallback(
    (manager: Surface3DManager) => {
      manager.isLanding = isLanding;
      if (disableControls) manager.lockControls();
      manager.onLabelsUpdate = (projected, opacity, anchorX, anchorY) => {
        if (!labelsContainerRef.current) return;

        const labels = offsetHudLabelsFromAnchor(
          projected.map((p) => ({
            fromKey: p.key,
            x: p.x,
            y: p.y,
            visible: p.visible,
          })),
          anchorX,
          anchorY,
          22,
        );

        for (const item of labels) {
          const el = labelRefs.current[item.fromKey];
          if (!el) continue;

          if (!item.visible) {
            el.style.display = "none";
            continue;
          }

          el.style.display = "block";
          el.style.transform = `translate3d(-50%, -50%, 0) translate3d(${item.x}px, ${item.y}px, 0)`;
          el.style.opacity = `${opacity}`;
        }
      };
    },
    [disableControls, isLanding],
  );

  const managerRef = useThreeManager(Surface3DManager, mountRef, shouldRenderThree, handleInit);

  useEffect(() => {
    if (shouldRenderThree && managerRef.current && Object.keys(keyStats).length > 0) {
      managerRef.current.updateData(keyStats);
      setKeys(managerRef.current.getSurfaceKeys());
    }
  }, [keyStats, shouldRenderThree, managerRef]);

  useEffect(() => {
    if (shouldRenderThree && managerRef.current) {
      managerRef.current.setActivated(isActivated);
    }
  }, [isActivated, shouldRenderThree, managerRef]);

  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault();
  };

  return (
    <div
      style={{ position: "relative", width: "100%", height: "100%", overflow: "visible" }}
      onTouchStart={handleTouch}
      onTouchMove={handleTouch}
    >
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height: "100%",
          outline: "none",
          cursor: "grab",
        }}
      />
      <div
        ref={labelsContainerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {keys.map((k) => {
          if (k.key === "_dummy_comma") return null;
          let label = k.key.toUpperCase();
          if (["SPACE", "SHIFT", "ENTER", "BACKSPACE"].includes(label)) label = "";
          if (!label) return null;

          return (
            <div
              key={k.key}
              ref={(el) => {
                labelRefs.current[k.key] = el;
              }}
              id={`hud-label-${k.key}`}
              className="cyl-key-label"
              onClick={
                isLanding
                  ? undefined
                  : () => {
                      const { setDiagnosticMode, setFocusedKey } = useWorkspaceStore.getState();
                      setDiagnosticMode("cylindrical");
                      setFocusedKey(k.key);
                    }
              }
              onMouseDown={(e) => e.preventDefault()}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                willChange: "transform, opacity",
                opacity: 0,
                cursor: isLanding ? "default" : "pointer",
                pointerEvents: isLanding ? "none" : "auto",
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
