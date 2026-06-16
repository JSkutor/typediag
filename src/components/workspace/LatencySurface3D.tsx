"use client";

import React, { useRef, useEffect, useState } from "react";
import { KeyResult } from "@/lib/skdm";

import { Surface3DManager, LATENCY_POWER } from "./Surface3DManager";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useThreeManager } from "@/hooks/useThreeManager";
import { useCallback } from "react";

interface LatencySurface3DProps {
  keyStats: Record<string, KeyResult>;
  triangles?: Uint32Array;
  width?: number;
  height?: number;

  isActivated?: boolean;
}

export const LatencySurface3D: React.FC<LatencySurface3DProps> = ({
  keyStats,
  isActivated = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelsContainerRef = useRef<HTMLDivElement>(null);
  const [keys, setKeys] = useState<KeyResult[]>([]);
  const [shouldRenderThree, setShouldRenderThree] = useState(false);
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Delay Three.js initialization until the initial heavy frames of the CSS transition complete
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isActivated) {
      // Transition is 0.55s. Starting initialization at 350ms allows the browser
      // to execute the initial rapid transition frames smoothly without GPU/main-thread blocking.
      timer = setTimeout(() => {
        setShouldRenderThree(true);
      }, 350);
    } else {
      // Use setTimeout to avoid synchronous setState inside useEffect
      timer = setTimeout(() => {
        setShouldRenderThree(false);
      }, 0);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [isActivated]);

  // Initialize and dispose manager
  const handleInit = useCallback((manager: Surface3DManager) => {
    manager.onUpdateHUD = (
      surfaceKeys,
      elevationScale,
      camera,
      opacity,
      managerWidth,
      managerHeight,
    ) => {
      if (!labelsContainerRef.current || !mountRef.current) return;
      const TARGET_ELEVATION_SCALE = 180;

      surfaceKeys.forEach((k) => {
        const vec = manager.get3DPos(k, elevationScale);
        const scaleRatio = elevationScale / TARGET_ELEVATION_SCALE;
        const amplifiedZ =
          k.key.toLowerCase() === "_dummy_comma" ? 0 : Math.pow(k.zSmoothed, LATENCY_POWER);
        vec.y += (10 + amplifiedZ * 5) * scaleRatio;

        vec.project(camera);

        const x = (vec.x * 0.5 + 0.5) * managerWidth;
        const y = (vec.y * -0.5 + 0.5) * managerHeight;

        const el = labelRefs.current[k.key];
        if (el) {
          if (vec.z > 1) {
            el.style.display = "none";
          } else {
            el.style.display = "block";
            el.style.transform = `translate3d(-50%, -50%, 0) translate3d(${x}px, ${y}px, 0)`;
            el.style.opacity = `${opacity}`;
          }
        }
      });
    };
  }, []);

  const managerRef = useThreeManager(Surface3DManager, mountRef, shouldRenderThree, handleInit);

  // Update geometry/layout when data changes or Three.js is initialized
  useEffect(() => {
    if (shouldRenderThree && managerRef.current && Object.keys(keyStats).length > 0) {
      managerRef.current.updateData(keyStats);
      setKeys(managerRef.current.getSurfaceKeys());
    }
  }, [keyStats, shouldRenderThree]);

  // Handle activation timeline
  useEffect(() => {
    if (shouldRenderThree && managerRef.current) {
      managerRef.current.setActivated(isActivated);
    }
  }, [isActivated, shouldRenderThree]);

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
              className="hud-label-btn"
              onClick={() => {
                const { setDiagnosticMode, setFocusedKey } = useWorkspaceStore.getState();
                setDiagnosticMode("cylindrical");
                setFocusedKey(k.key);
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                color: "rgba(228, 230, 235, 0.9)",
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: "bold",
                fontSize: "13px",
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                willChange: "transform, opacity",
                opacity: 0,
                cursor: "pointer",
                pointerEvents: "auto",
                background: "rgba(30, 41, 59, 0.4)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                padding: "2px 6px",
                borderRadius: "4px",
                transition: "border-color 0.2s, background-color 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.8)";
                e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.2)";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
                e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.4)";
                e.currentTarget.style.color = "rgba(228, 230, 235, 0.9)";
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
