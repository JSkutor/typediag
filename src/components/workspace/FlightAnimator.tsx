"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { FLIGHT_DURATION, Flight } from "./flightChoreography";

interface FlightAnimatorProps {
  flights: Flight[];
  isFlying: boolean;
}

export const FlightAnimator: React.FC<FlightAnimatorProps> = ({ flights, isFlying }) => {
  const refs = useRef<Array<HTMLSpanElement | null>>([]);
  
  // Pool sized to the max number of unique keyboard keys + buffer.
  // Smaller than 250 to avoid pre-promoting hundreds of unnecessary GPU layers.
  const poolSize = 64;
  const pool = useMemo(() => Array.from({ length: poolSize }), []);

  // Effect 1: pre-promote layers as soon as flights are calculated (~800ms after
  // mount, well before the user presses Tab). By the time the animation starts,
  // all GPU layers already exist — zero layer-creation cost at t=0.
  useEffect(() => {
    if (flights.length === 0) return;
    const els: HTMLSpanElement[] = [];
    for (let i = 0; i < flights.length; i++) {
      const el = refs.current[i];
      if (el) {
        el.style.willChange = "transform, opacity";
        els.push(el);
      }
    }
    return () => els.forEach((el) => { el.style.willChange = ""; });
  }, [flights]);

  // Effect 2: start animations when Tab is pressed. Layers are already promoted
  // so this frame only kicks off compositor work — no paint or layer creation.
  useEffect(() => {
    if (!isFlying || flights.length === 0) return;

    const animations: Animation[] = [];
    const currentRefs = refs.current;

    const rafId = requestAnimationFrame(() => {
      for (let i = 0; i < flights.length; i++) {
        const f = flights[i];
        const el = currentRefs[i];
        if (!el || !f.keyframes) continue;

        el.style.opacity = "1";

        const anim = el.animate(f.keyframes, {
          duration: FLIGHT_DURATION,
          easing: "linear",
          fill: "both",
        });
        animations.push(anim);
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      animations.forEach((a) => a.cancel());
      for (let i = 0; i < flights.length; i++) {
        const el = currentRefs[i];
        if (el) el.style.opacity = "0";
      }
    };
  }, [isFlying, flights]);

  // We always render the pool to avoid DOM Mount/Unmount overhead.
  // By referencing flights[i].char here, React updates the text node and triggers layout
  // in the background *before* the user presses Tab, skipping text shaping lag at t=0.
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
      {pool.map((_, i) => {
        const f = flights[i];
        return (
          <span
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="flying-char"
            style={{ opacity: 0 }}
          >
            {f ? f.char : ""}
          </span>
        );
      })}
    </div>
  );
};
