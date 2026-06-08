"use client";

import React, { useEffect, useRef } from "react";
import { KeyResult } from "@/lib/skdm";
import { LANDING_START } from "./flightChoreography";

export type DiagnosticsMode =
  | "surface"
  | "cylindrical"
  | "backspace"
  | "shift"
  | "space"
  | "finger";

interface VirtualKeyboardProps {
  mode: "practice" | "diagnostics";
  uiState?: string;
  targetKeys?: Set<string>;
  diagnosticMode?: DiagnosticsMode;
  keyStats?: Record<string, KeyResult>;
  focusedKey?: string | null;
  onKeyClick?: (key: string) => void;
  triangles?: Uint32Array; // For Delaunay mesh
  keyDelays?: Record<string, number>; // Delays for staggered assemble animation
}

const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "backspace"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", "enter"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", ",", "."],
  ["space"],
];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  mode,
  uiState = "diagnostics",
  diagnosticMode = "surface",
  keyStats = {},
  focusedKey,
  onKeyClick,
  triangles,
  keyDelays = {},
}) => {
  const is3D = mode === "diagnostics";
  const isFlying = uiState === "flying";
  const sceneRef = useRef<HTMLDivElement>(null);

  // Each keycap pops in (WAAPI, compositor-friendly) exactly as its flying glyph
  // settles into the slot. Concrete keyframes + will-change only while animating.
  useEffect(() => {
    if (!isFlying) return;
    const root = sceneRef.current;
    if (!root) return;

    const animations: Animation[] = [];
    root.querySelectorAll<HTMLElement>(".keycap-base").forEach((el) => {
      const key = el.id.replace("keycap-", "");
      const landMs = keyDelays[key] ?? LANDING_START;
      el.style.opacity = "0";
      el.style.willChange = "transform, opacity";
      const anim = el.animate(
        [
          { transform: "translate3d(0, 0, 0) scale(0.55)", opacity: 0 },
          { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1, offset: 1 },
        ],
        {
          duration: 460,
          delay: Math.max(0, landMs - 130),
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          fill: "both",
        },
      );
      anim.onfinish = () => {
        anim.commitStyles();
        anim.cancel();
        el.style.willChange = "";
      };
      animations.push(anim);
    });

    return () => {
      animations.forEach((a) => a.cancel());
    };
  }, [isFlying, keyDelays]);

  const renderKey = (keyLabel: string) => {
    // 3D latency elevation is intentionally disabled for now (per spec).
    // The keyboard tilts into 3D but keeps a flat surface — no per-key z lift.
    const zOffset = 0;

    // Determine highlights based on diagnostic mode
    let highlightClass = "";
    if (is3D) {
      if (focusedKey === keyLabel) {
        highlightClass = "key-highlight-shift"; // Reusing blue for focused
      }
    }

    const lowerKey = keyLabel.toLowerCase();
    const isModifier = ["backspace", "enter", "shift", "space"].includes(lowerKey);
    const keyClass = isModifier ? "keycap-mod" : "keycap-alpha";
    
    let label = keyLabel;
    if (lowerKey === "backspace") label = "Backspace ⌫";
    if (lowerKey === "enter") label = "Enter ↵";
    if (lowerKey === "shift") label = "Shift";
    if (lowerKey === "space") label = " ";

    let keyWidth = "3rem";
    if (lowerKey === "space") keyWidth = "15rem";
    else if (isModifier) keyWidth = "5rem";

    // The keycap pop-in (and the invisible-until-landed start state) is driven
    // imperatively via WAAPI in the effect above. Here we only set resting style.
    const inlineStyle: React.CSSProperties = {
      width: keyWidth,
      height: "3rem",
      boxShadow: is3D ? "var(--shadow-key)" : "var(--shadow-key-active)",
      transform: `translateZ(${zOffset}px)`,
    };

    return (
      <div
        key={keyLabel}
        id={`keycap-${lowerKey}`}
        className={`keycap-3d keycap-base ${keyClass} ${highlightClass}`}
        style={inlineStyle}
        onClick={() => onKeyClick?.(keyLabel)}
      >
        <span style={{ transform: "translateZ(1px)" }}>
          {label}
        </span>
      </div>
    );
  };

  // Optional: render Delaunay mesh base if we have triangles and are in surface mode
  const renderMesh = () => {
    if (!is3D || diagnosticMode !== "surface" || !triangles || Object.keys(keyStats).length === 0) return null;
    return (
      <svg className="delaunay-mesh">
        {/* Triangles would be rendered here via SVG lines connecting key DOM centers */}
      </svg>
    );
  };

  return (
    <div className="scene-3d" ref={sceneRef}>
      <div className={`keyboard-container keyboard-layout ${mode === "practice" ? "mode-practice" : "mode-diagnostics"}`}>
        {renderMesh()}
        {KEYBOARD_ROWS.map((row, rIdx) => {
          // Centering the spacebar row
          const isSpaceRow = row.length === 1 && row[0] === "space";
          const rowMargin = isSpaceRow ? "10rem" : `${rIdx * 1.5}rem`;
          
          return (
            <div key={rIdx} className="keyboard-row" style={{ marginLeft: rowMargin }}>
              {row.map(renderKey)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
