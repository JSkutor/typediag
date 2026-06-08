"use client";

import React, { useEffect, useRef } from "react";
import { FLIGHT_D, PHASE } from "./flightChoreography";

export interface Flight {
  id: number;
  char: string;
  /** Start position (text glyph origin, or just below the screen). */
  sx: number;
  sy: number;
  /** Hover position at the end of the detach phase. */
  hx: number;
  hy: number;
  /** Two mid-air swarm waypoints. */
  w1x: number;
  w1y: number;
  w2x: number;
  w2y: number;
  /** Approach point, just above the target keycap slot. */
  ax: number;
  ay: number;
  /** Final target (keycap slot centre). */
  tx: number;
  ty: number;
  rotA: number;
  rotB: number;
  rotC: number;
  /** When this glyph reaches its slot, as a fraction of FLIGHT_D (landMin..landMax). */
  landOffset: number;
}

interface FlightAnimatorProps {
  flights: Flight[];
  isFlying: boolean;
}

const tf = (x: number, y: number, s: number, r: number) =>
  `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s}) rotate(${r.toFixed(1)}deg)`;

/**
 * Build a fully-resolved keyframe array (no CSS vars / calc) so the browser can
 * run the animation entirely on the compositor thread — the key fix for jank.
 */
function buildFrames(f: Flight): Keyframe[] {
  const land = f.landOffset;
  const swarmMid = (PHASE.holdEnd + PHASE.swarmEnd) / 2;
  const settle = Math.max(land - 0.05, PHASE.swarmEnd + 0.02);
  const fade = Math.min(land + 0.05, 0.999);

  return [
    // Stage 1 — detach / rise, ease out into the hover.
    { offset: 0, transform: tf(f.sx, f.sy, 1, 0), opacity: 1, easing: "cubic-bezier(0.33, 0, 0.2, 1)" },
    { offset: PHASE.detachEnd, transform: tf(f.hx, f.hy, 1.12, f.rotA), opacity: 1, easing: "linear" },
    // Hover hold — everything waits here until all glyphs have detached.
    { offset: PHASE.holdEnd, transform: tf(f.hx, f.hy, 1.12, f.rotA), opacity: 1, easing: "cubic-bezier(0.45, 0, 0.55, 1)" },
    // Stage 2 — pure swarm through two waypoints.
    { offset: swarmMid, transform: tf(f.w1x, f.w1y, 1.3, f.rotB), opacity: 1, easing: "cubic-bezier(0.45, 0, 0.55, 1)" },
    { offset: PHASE.swarmEnd, transform: tf(f.w2x, f.w2y, 1.34, f.rotC), opacity: 1, easing: "cubic-bezier(0.5, 0, 0.7, 0.4)" },
    // Stage 3 — descend onto the slot and settle.
    { offset: settle, transform: tf(f.ax, f.ay, 1.12, f.rotC * 0.3), opacity: 1, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    { offset: land, transform: tf(f.tx, f.ty, 1, 0), opacity: 1, easing: "ease-out" },
    // Hand off to the solid keycap.
    { offset: fade, transform: tf(f.tx, f.ty, 0.85, 0), opacity: 0, easing: "linear" },
    { offset: 1, transform: tf(f.tx, f.ty, 0.85, 0), opacity: 0 },
  ];
}

export const FlightAnimator: React.FC<FlightAnimatorProps> = ({ flights, isFlying }) => {
  const refs = useRef<Map<number, HTMLSpanElement>>(new Map());

  useEffect(() => {
    if (!isFlying || flights.length === 0) return;

    const animations: Animation[] = [];
    for (const f of flights) {
      const el = refs.current.get(f.id);
      if (!el) continue;
      // Promote to a compositor layer only while it is actually moving.
      el.style.willChange = "transform, opacity";
      const anim = el.animate(buildFrames(f), {
        duration: FLIGHT_D,
        easing: "linear",
        fill: "both",
      });
      anim.onfinish = () => {
        el.style.willChange = "";
      };
      animations.push(anim);
    }

    return () => {
      animations.forEach((a) => a.cancel());
    };
  }, [isFlying, flights]);

  if (!isFlying || flights.length === 0) return null;

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
      {flights.map((f) => (
        <span
          key={f.id}
          ref={(el) => {
            if (el) refs.current.set(f.id, el);
            else refs.current.delete(f.id);
          }}
          className="flying-char"
          style={{ transform: tf(f.sx, f.sy, 1, 0), opacity: 1 }}
        >
          {f.char}
        </span>
      ))}
    </div>
  );
};
