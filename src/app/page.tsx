"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { PracticePanel } from "@/components/workspace/PracticePanel";
import { DashboardPanel } from "@/components/workspace/DashboardPanel";
import { VirtualKeyboard, DiagnosticsMode } from "@/components/workspace/VirtualKeyboard";
import { FlightAnimator } from "@/components/workspace/FlightAnimator";
import { FLIGHT_D, PHASE, LANDING_START, TILT_AT, Flight, buildFrames } from "@/components/workspace/flightChoreography";
import { useTypingStore } from "@/store/useTypingStore";
import { KeyResult, runPipeline, buildLayout } from "@/lib/skdm";

export type UiState = "practice" | "measuring" | "flying" | "diagnostics";

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export default function Workspace() {
  const [uiState, setUiState] = useState<UiState>("practice");
  const [flights, setFlights] = useState<Flight[]>([]);
  const [diagnosticMode, setDiagnosticMode] = useState<DiagnosticsMode>("surface");
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [keyStats, setKeyStats] = useState<Record<string, KeyResult>>({});
  const [targetKeys, setTargetKeys] = useState<Set<string>>(new Set());
  const [keyDelays, setKeyDelays] = useState<Record<string, number>>({});

  // Cache of flat-keyboard keycap rects, measured once on mount (and on resize)
  // so we never read layout while the DOM is mid-transition (avoids thrash).
  const keycapRectsRef = useRef<Record<string, DOMRect>>({});

  const setTarget = useTypingStore((state) => state.setTarget);
  const recordKey = useTypingStore((state) => state.recordKey);
  const setTyped = useTypingStore((state) => state.setTyped);
  const events = useTypingStore((state) => state.events);

  // Initialize practice text
  useEffect(() => {
    setTarget("The quick brown fox jumps over the lazy dog. Try typing some text to gather SKDM data, then press Tab to analyze the 3D latency surface.");
  }, [setTarget]);

  // Pre-calculate all flights, keyframes, and layout rects in the background
  // to avoid blocking the main thread when the user hits Tab.
  const precalculateFlights = useCallback(() => {
    const rects: Record<string, DOMRect> = {};
    document.querySelectorAll(".keycap-base").forEach((el) => {
      rects[el.id.replace("keycap-", "")] = el.getBoundingClientRect();
    });
    keycapRectsRef.current = rects;

    if (Object.keys(rects).length === 0) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
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
      newKeyDelays[key] = landOffset * FLIGHT_D;

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
      f.keyframes = buildFrames(f);
      newFlights.push(f);
    };

    const handledKeys = new Set<string>();

    const sortedUnique = Array.from(uniqueChars.entries()).sort((a, b) => a[1] - b[1]);
    const totalUnique = sortedUnique.length;

    sortedUnique.forEach(([key, textIdx], j) => {
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

  // Pipeline calculation moved to Tab key handler to avoid lagging the 3D tilt transition

  // Global Keybindings for transitions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle modes
      if (e.key === "Tab") {
        e.preventDefault();
        
        if (uiState === "practice") {
          // Pre-calculate SKDM pipeline NOW so it's ready and doesn't lag the tilt later
          if (events.length > 0) {
            const layout = buildLayout();
            const results = runPipeline(events, layout);
            setKeyStats(results);
          }

          // Always recalculate keycap and text positions right before transitioning
          // to guarantee absolute alignment with current window size, typed content, and loaded fonts.
          precalculateFlights();

          setUiState("flying");

          // Stage 5: tilt the completed flat keyboard back into 3D.
          setTimeout(() => {
            setUiState("diagnostics");
            setDiagnosticMode("surface");
          }, TILT_AT);
        } else if (uiState === "diagnostics") {
          setUiState("practice");
        }
        return;
      }

      if (uiState === "practice") {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        
        let keyToken = e.key.toLowerCase();
        if (keyToken === " ") keyToken = "space";
        
        const isModifier = ["backspace", "enter", "shift", "space"].includes(keyToken);
        
        if (e.key.length === 1 || isModifier) {
           const currentTyped = useTypingStore.getState().typed;
           let nextTyped = currentTyped;
           
           if (keyToken === "backspace") {
             nextTyped = currentTyped.slice(0, -1);
           } else if (e.key.length === 1) {
             nextTyped = currentTyped + e.key;
           }
           
           if (nextTyped !== currentTyped) {
             setTyped(nextTyped);
             
             const targetText = useTypingStore.getState().targetText;
             if (nextTyped.length >= targetText.length) {
               useTypingStore.getState().finish();
             }
           }
           
           recordKey(keyToken, performance.now());
        }
        return;
      }

      if (uiState === "diagnostics") {
        const key = e.key;
        if (key === "Backspace") {
          setDiagnosticMode("backspace");
        } else if (key === "Shift") {
          setDiagnosticMode("shift");
        } else if (key === " ") {
          setDiagnosticMode("space");
        } else if (key.length === 1) {
          setDiagnosticMode("cylindrical");
          setFocusedKey(key);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [uiState, recordKey]);

  // Handle virtual key clicks in diagnostics mode
  const handleKeyClick = useCallback((key: string) => {
    if (uiState !== "diagnostics") return;
    
    if (key === "Backspace") {
      setDiagnosticMode("backspace");
    } else if (key === "Shift" || key === "ShiftRight") {
      setDiagnosticMode("shift");
    } else if (key === "Space") {
      setDiagnosticMode("space");
    } else {
      setDiagnosticMode("cylindrical");
      setFocusedKey(key);
    }
  }, [uiState]);

  return (
    <div className="workspace-container" style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      
      <FlightAnimator flights={flights} isFlying={uiState === "flying"} />

      {/* Mode Toggle Button for mouse users */}
      <button 
        onClick={() => {
           if (uiState === "practice") {
             const e = new KeyboardEvent("keydown", { key: "Tab" });
             window.dispatchEvent(e);
           } else {
             setUiState("practice");
           }
        }}
        className="mode-toggle-btn"
      >
        {uiState === "practice" ? "Enter TypeDiag Lab (Tab)" : "Return to Practice (Tab)"}
      </button>

      {/* Screen: Practice Layer (Moves Down) */}
      <div className={`screen-practice ${uiState === "flying" || uiState === "diagnostics" ? "hidden-down" : ""}`}>
        <PracticePanel />
      </div>
      
      {/* Screen: Diagnostics Layer (Fades In) */}
      {/* Note: Kept strictly invisible during practice to hide all borders/shadows, but present in DOM for measuring! */}
      <div className={`screen-diagnostics ${uiState === "practice" || uiState === "measuring" ? "invisible" : ""}`}>
        <div className={`kbd-wrap ${uiState}`} style={{ transform: "scale(0.95)" }}>
          <VirtualKeyboard 
            mode={uiState === "diagnostics" ? "diagnostics" : "practice"} 
            uiState={uiState}
            targetKeys={targetKeys}
            diagnosticMode={diagnosticMode} 
            keyStats={keyStats} 
            focusedKey={focusedKey}
            onKeyClick={handleKeyClick}
            keyDelays={keyDelays}
          />
        </div>
        <DashboardPanel 
          mode={uiState === "diagnostics" ? "diagnostics" : "practice"} 
          diagnosticMode={diagnosticMode} 
          focusedKey={focusedKey} 
        />
      </div>
    </div>
  );
}
