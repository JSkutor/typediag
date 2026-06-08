"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { Flight, TRANSITION_TIMING } from "./flightChoreography";
import gsap from "gsap";

interface FlightAnimatorProps {
  flights: Flight[];
  isFlying: boolean;
  onComplete?: () => void;
}

export const FlightAnimator: React.FC<FlightAnimatorProps> = ({ flights, isFlying, onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // We don't use refs array here, we can just select by class using GSAP within the container.
  // Using memo to create the stable pool
  const pool = useMemo(() => {
    return flights.length > 0 ? flights : [];
  }, [flights]);

  useEffect(() => {
    if (!isFlying || flights.length === 0 || !containerRef.current) return;

    const container = containerRef.current;
    const textKeys = container.querySelectorAll('.flying-char.from-text');
    const spawnedKeys = container.querySelectorAll('.flying-char.from-spawn');
    const allKeys = container.querySelectorAll('.flying-char');

    // Initialize starting positions and make everything visible.
    // This explicitly overrides any leftover GSAP cache if DOM nodes were re-used.
    gsap.set(allKeys, { 
      opacity: 1,
      scale: 1,
      xPercent: -50,
      yPercent: -50,
      x: (i, el) => {
        const id = Number(el.getAttribute('data-id'));
        return flights.find(f => f.id === id)?.sx || 0;
      },
      y: (i, el) => {
        const id = Number(el.getAttribute('data-id'));
        return flights.find(f => f.id === id)?.sy || 0;
      }
    });

    const tl = gsap.timeline();

    // 1. Detachment: text keys float up slightly
    tl.to(allKeys, {
      y: "-=30",
      scale: 1.1,
      duration: TRANSITION_TIMING.detachmentDuration,
      ease: "power2.out",
      stagger: 0.01,
    });

    // 2. Target Landing: straight flight
    tl.to(allKeys, {
      x: (i, el) => {
        const id = Number(el.getAttribute('data-id'));
        return flights.find(f => f.id === id)?.tx || 0;
      },
      y: (i, el) => {
        const id = Number(el.getAttribute('data-id'));
        return flights.find(f => f.id === id)?.ty || 0;
      },
      scale: 0.4, // Match keycap text size
      duration: TRANSITION_TIMING.landingDuration, // Slightly longer to compensate for removed swarm phase
      ease: "power3.inOut",
      stagger: { amount: 0.2, from: "start" }
    }, "landing");

    // 4. Assembly Completion: Hand off to solid keycap (slow fade-out)
    tl.to(allKeys, {
      opacity: 0,
      duration: TRANSITION_TIMING.handoffDuration,
      ease: "power2.out",
    }, "handoff");

    // Call onComplete at the start of the handoff to begin the 3D cross-fade concurrently
    tl.call(() => {
      if (onComplete) {
        onComplete();
      }
    }, [], "handoff");

    return () => {
      tl.kill();
      gsap.set(allKeys, { opacity: 0 });
    };
  }, [isFlying, flights]);

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
      {pool.map((f) => (
        <span
          key={f.id}
          data-id={f.id}
          className={`flying-char ${f.isFromText ? 'from-text' : 'from-spawn'}`}
          style={{
            opacity: 0,
          }}
        >
          {f.char}
        </span>
      ))}
    </div>
  );
};
