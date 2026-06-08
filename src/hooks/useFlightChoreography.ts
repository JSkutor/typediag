import { useState, useCallback, useRef, useEffect } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { Flight, PHASE, FLIGHT_DURATION } from "@/components/workspace/flightChoreography";
import { UiState } from "@/app/page";

const rand = (min: number, max: number) => min + Math.random() * (max - min);

interface LocalRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function useFlightChoreography(uiState: UiState, dynamicScale: number) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [targetKeys, setTargetKeys] = useState<Set<string>>(new Set());
  const [keyDelays, setKeyDelays] = useState<Record<string, number>>({});
  const [keycapRects, setKeycapRects] = useState<Record<string, DOMRect>>({});
  
  const localRectsRef = useRef<Record<string, LocalRect>>({});
  const uiStateRef = useRef(uiState);
  uiStateRef.current = uiState;

  const precalculateFlights = useCallback(() => {
    const isFlat = uiStateRef.current === "practice" || uiStateRef.current === "measuring";
    const wrapEl = document.querySelector(".kbd-wrap");
    if (!wrapEl) return;
    const wrapRect = wrapEl.getBoundingClientRect();

    const rects: Record<string, DOMRect> = {};

    const shouldMeasureDOM = isFlat || Object.keys(localRectsRef.current).length === 0;

    if (shouldMeasureDOM) {
      const localRects: Record<string, LocalRect> = {};
      document.querySelectorAll(".keycap-base").forEach((el) => {
        const r = el.getBoundingClientRect();
        const keyName = el.id.replace("keycap-", "");
        // Filter out invalid/zero sizes during mount/resize
        if (r.width > 15 && r.height > 15) {
          localRects[keyName] = {
            left: (r.left - wrapRect.left) / dynamicScale,
            top: (r.top - wrapRect.top) / dynamicScale,
            width: r.width / dynamicScale,
            height: r.height / dynamicScale,
          };
        }
      });
      if (Object.keys(localRects).length > 0) {
        localRectsRef.current = localRects;
      }
    }

    Object.entries(localRectsRef.current).forEach(([keyName, lr]) => {
      rects[keyName] = {
        left: wrapRect.left + lr.left * dynamicScale,
        top: wrapRect.top + lr.top * dynamicScale,
        width: lr.width * dynamicScale,
        height: lr.height * dynamicScale,
        right: wrapRect.left + (lr.left + lr.width) * dynamicScale,
        bottom: wrapRect.top + (lr.top + lr.height) * dynamicScale,
        x: wrapRect.left + lr.left * dynamicScale,
        y: wrapRect.top + lr.top * dynamicScale,
        toJSON: () => {},
      } as DOMRect;
    });

    setKeycapRects(rects);

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

    const uniqueCharsInText = new Map<string, number>();
    for (const [char, indices] of charIndicesMap.entries()) {
      // Stable pseudo-random choice using character and string length as a seed
      const seed = char.charCodeAt(0) * 31 + targetText.length;
      const pseudoRand = Math.abs(Math.sin(seed) * 10000) % 1;
      const randIdx = Math.floor(pseudoRand * indices.length);
      const chosenIdx = indices[randIdx];
      uniqueCharsInText.set(char, chosenIdx);
    }

    const newFlights: Flight[] = [];
    const newTargetKeys = new Set<string>();
    const newKeyDelays: Record<string, number> = {};
    let flightId = 0;

    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const addFlight = (key: string, isFromText: boolean, sx: number, sy: number, charLabel: string, textIdx?: number) => {
      const keyRect = rects[key];
      if (!keyRect) return;

      const tx = keyRect.left + keyRect.width / 2;
      const ty = keyRect.top + keyRect.height / 2;
      const landOffset = rand(PHASE.landMin, PHASE.landMax);

      newTargetKeys.add(key);
      newKeyDelays[key] = landOffset * FLIGHT_DURATION;

      // Random swarm waypoints
      const w1x = sx + rand(-150, 150);
      const w1y = Math.min(sy, winH / 2) + rand(-100, 50);

      const w2x = tx + rand(-100, 100);
      const w2y = ty - rand(50, 200);

      const f: Flight = {
        id: flightId++,
        char: charLabel,
        isFromText,
        sx, sy, hx: sx, hy: sy,
        w1x, w1y,
        w2x, w2y,
        ax: tx, ay: ty,
        tx, ty,
        rotA: rand(-15, 15), rotB: rand(-30, 30), rotC: rand(-10, 10),
        landOffset,
        textIdx,
      };
      newFlights.push(f);
    };

    // 1. Process keys that are in the text
    const handledKeys = new Set<string>();
    Array.from(uniqueCharsInText.entries()).forEach(([key, textIdx]) => {
      const charSpan = document.getElementById(`text-char-${textIdx}`);
      if (charSpan) {
        const r = charSpan.getBoundingClientRect();
        addFlight(key, true, r.left + r.width / 2, r.top + r.height / 2, targetText[textIdx], textIdx);
        handledKeys.add(key);
      }
    });

    setFlights(newFlights);
    setTargetKeys(newTargetKeys);
    setKeyDelays(newKeyDelays);
  }, [dynamicScale]);

  // 1. Initial mount timer (only in practice/measuring mode)
  useEffect(() => {
    if (uiState !== "practice" && uiState !== "measuring") return;
    
    // Wait for initial render and layout
    const timer = setTimeout(() => requestAnimationFrame(precalculateFlights), 800);
    
    return () => clearTimeout(timer);
  }, [precalculateFlights, uiState]);

  // 2. Window resize listener to handle position/scale changes
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => requestAnimationFrame(precalculateFlights), 150);
    };
    window.addEventListener("resize", handleResize);
    
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [precalculateFlights]);

  // 3. Immediate update when dynamicScale changes
  useEffect(() => {
    precalculateFlights();
  }, [dynamicScale, precalculateFlights]);

  return {
    flights,
    targetKeys,
    keyDelays,
    keycapRects,
    precalculateFlights
  };
}
