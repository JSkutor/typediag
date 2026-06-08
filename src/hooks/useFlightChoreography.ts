import { useState, useCallback, useRef, useEffect } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { Flight, buildFlightKeyframes, PHASE, FLIGHT_DURATION } from "@/components/workspace/flightChoreography";

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export function useFlightChoreography() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [targetKeys, setTargetKeys] = useState<Set<string>>(new Set());
  const [keyDelays, setKeyDelays] = useState<Record<string, number>>({});
  
  const keycapRectsRef = useRef<Record<string, DOMRect>>({});

  const precalculateFlights = useCallback(() => {
    const rects: Record<string, DOMRect> = {};
    document.querySelectorAll(".keycap-base").forEach((el) => {
      rects[el.id.replace("keycap-", "")] = el.getBoundingClientRect();
    });
    keycapRectsRef.current = rects;

    if (Object.keys(rects).length === 0) return;

    const targetText = useTypingStore.getState().targetText;

    // Group occurrences (indices) of each valid character
    const charIndicesMap = new Map<string, number[]>();
    const validChars = /^[a-zA-Z,.]$/;
    for (let i = 0; i < targetText.length; i++) {
      const char = targetText[i].toLowerCase();
      if (validChars.test(char)) {
        if (!charIndicesMap.has(char)) {
          charIndicesMap.set(char, []);
        }
        charIndicesMap.get(char)!.push(i);
      }
    }

    const uniqueChars = new Map<string, number>();
    for (const [char, indices] of charIndicesMap.entries()) {
      // Stable pseudo-random choice using character and string length as a seed
      const seed = char.charCodeAt(0) * 31 + targetText.length;
      const pseudoRand = Math.abs(Math.sin(seed) * 10000) % 1;
      const randIdx = Math.floor(pseudoRand * indices.length);
      const chosenIdx = indices[randIdx];
      uniqueChars.set(char, chosenIdx);
    }

    const newFlights: Flight[] = [];
    const newTargetKeys = new Set<string>();
    const newKeyDelays: Record<string, number> = {};
    let flightId = 0;

    const addFlight = (key: string, sx: number, sy: number, charLabel: string, textIdx: number) => {
      const keyRect = rects[key];
      if (!keyRect) return;

      const tx = keyRect.left + keyRect.width / 2 - 10;
      const ty = keyRect.top + keyRect.height / 2 - 15;
      const landOffset = rand(PHASE.landMin, PHASE.landMax);

      newTargetKeys.add(key);
      newKeyDelays[key] = landOffset * FLIGHT_DURATION;

      const f: Flight = {
        id: flightId++,
        char: charLabel,
        sx, sy, hx: sx, hy: sy,
        w1x: sx, w1y: sy,
        w2x: tx, w2y: ty,
        ax: tx, ay: ty,
        tx, ty,
        rotA: 0, rotB: 0, rotC: 0,
        detachStart: 0, detachEnd: 0.1,
        landOffset,
        textIdx,
      };
      f.keyframes = buildFlightKeyframes(f);
      newFlights.push(f);
    };

    const handledKeys = new Set<string>();

    const sortedUnique = Array.from(uniqueChars.entries()).sort((a, b) => a[1] - b[1]);

    sortedUnique.forEach(([key, textIdx]) => {
      const charSpan = document.getElementById(`text-char-${textIdx}`);
      if (charSpan) {
        const r = charSpan.getBoundingClientRect();
        addFlight(key, r.left, r.top, targetText[textIdx], textIdx);
        handledKeys.add(key);
      }
    });

    setFlights(newFlights);
    setTargetKeys(newTargetKeys);
    setKeyDelays(newKeyDelays);
  }, []);

  useEffect(() => {
    // Wait for initial render and layout
    const timer = setTimeout(() => requestAnimationFrame(precalculateFlights), 800);
    
    // Recalculate on resize, debounced
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => requestAnimationFrame(precalculateFlights), 400);
    };
    window.addEventListener("resize", handleResize);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [precalculateFlights]);

  return {
    flights,
    targetKeys,
    keyDelays,
    precalculateFlights
  };
}
