import { useState, useCallback, useRef, useEffect } from "react";
import { useTypingStore } from "@/store/useTypingStore";
import { Flight } from "@/components/workspace/flightChoreography";
import { calculateFlights } from "@/components/workspace/flightCalculations";
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

  useEffect(() => {
    uiStateRef.current = uiState;
  }, [uiState]);

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

    const charRects: Record<number, { left: number; top: number; width: number; height: number }> = {};
    for (let i = 0; i < targetText.length; i++) {
      const charSpan = document.getElementById(`text-char-${i}`);
      if (charSpan) {
        charRects[i] = charSpan.getBoundingClientRect();
      }
    }

    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const { flights: newFlights, targetKeys: newTargetKeys, keyDelays: newKeyDelays } = calculateFlights(
      targetText,
      rects,
      charRects,
      winW,
      winH
    );

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
