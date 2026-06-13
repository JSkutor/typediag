"use client";

import React, { useRef, useEffect, useState } from "react";
import { KeyResult } from "@/lib/skdm";
import { Flight } from "./flightChoreography";
import { Surface3DManager } from "./Surface3DManager";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useThreeManager } from "@/hooks/useThreeManager";
import { useCallback } from "react";

interface LatencySurface3DProps {
  keyStats: Record<string, KeyResult>;
  triangles?: Uint32Array;
  width?: number;
  height?: number;
  flights?: Flight[];
  isActivated?: boolean;
}

export const LatencySurface3D: React.FC<LatencySurface3DProps> = ({
  keyStats,
  isActivated = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelsContainerRef = useRef<HTMLDivElement>(null);
  const [keys, setKeys] = useState<KeyResult[]>([]);

  // Initialize and dispose manager
  const handleInit = useCallback((manager: Surface3DManager) => {
    manager.onUpdateHUD = (surfaceKeys, elevationScale, camera, opacity) => {
      setKeys(surfaceKeys);
      
      if (!labelsContainerRef.current || !mountRef.current) return;
      const TARGET_ELEVATION_SCALE = 120;
      const currentWidth = mountRef.current.clientWidth;
      const currentHeight = mountRef.current.clientHeight;

      surfaceKeys.forEach((k) => {
        const vec = manager.get3DPos(k, elevationScale);
        const scaleRatio = elevationScale / TARGET_ELEVATION_SCALE;
        vec.y += (10 + k.zSmoothed * 5) * scaleRatio;

        vec.project(camera);

        const x = (vec.x * 0.5 + 0.5) * currentWidth;
        const y = (vec.y * -0.5 + 0.5) * currentHeight;

        const el = document.getElementById(`hud-label-${k.key}`);
        if (el) {
          if (vec.z > 1) {
            el.style.display = "none";
          } else {
            el.style.display = "block";
            el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
            el.style.opacity = `${opacity}`;
          }
        }
      });
    };
  }, []);

  const managerRef = useThreeManager(Surface3DManager, mountRef, true, handleInit);

  // Update geometry/layout when data changes
  useEffect(() => {
    if (managerRef.current && Object.keys(keyStats).length > 0) {
      managerRef.current.updateData(keyStats);
    }
  }, [keyStats]);

  // Handle activation timeline
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.setActivated(isActivated);
    }
  }, [isActivated]);

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
          let label = k.key.toUpperCase();
          if (["SPACE", "SHIFT", "ENTER", "BACKSPACE"].includes(label)) label = "";
          if (!label) return null;

          return (
            <div
              key={k.key}
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
