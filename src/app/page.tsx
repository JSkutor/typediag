"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { PracticePanel } from "@/components/workspace/PracticePanel";
import { DashboardPanel } from "@/components/workspace/DashboardPanel";
import { VirtualKeyboard, DiagnosticsMode } from "@/components/workspace/VirtualKeyboard";
import { FlightAnimator, Flight } from "@/components/workspace/FlightAnimator";
import { FLIGHT_D, PHASE, LANDING_START, TILT_AT } from "@/components/workspace/flightChoreography";
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
  const [frameRevealed, setFrameRevealed] = useState(false);

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

  // Measure the (static, flat) keycap layout once after mount and on resize.
  useEffect(() => {
    const measure = () => {
      const rects: Record<string, DOMRect> = {};
      document.querySelectorAll(".keycap-base").forEach((el) => {
        rects[el.id.replace("keycap-", "")] = el.getBoundingClientRect();
      });
      keycapRectsRef.current = rects;
    };
    const raf = requestAnimationFrame(() => requestAnimationFrame(measure));
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Generate KeyStats when diagnostics mode starts
  useEffect(() => {
    if (uiState === "diagnostics" && events.length > 0) {
      const layout = buildLayout();
      const results = runPipeline(events, layout);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKeyStats(results);
    }
  }, [uiState, events]);

  // Global Keybindings for transitions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle modes
      if (e.key === "Tab") {
        e.preventDefault();
        
        if (uiState === "practice") {
          // Read all layout up-front (cached keycaps + live sentence rects),
          // BEFORE any state change dirties the DOM — no interleaved writes.
          let keycapRects = keycapRectsRef.current;
          if (Object.keys(keycapRects).length === 0) {
            keycapRects = {};
            document.querySelectorAll(".keycap-base").forEach((el) => {
              keycapRects[el.id.replace("keycap-", "")] = el.getBoundingClientRect();
            });
          }

          const W = window.innerWidth;
          const H = window.innerHeight;
          const targetText = useTypingStore.getState().targetText;

          // One source instance per unique target character.
          const uniqueChars = new Map<string, number>();
          const validChars = /^[a-zA-Z,.]$/;
          for (let i = 0; i < targetText.length; i++) {
            const char = targetText[i].toLowerCase();
            if (validChars.test(char) && !uniqueChars.has(char)) {
              uniqueChars.set(char, i);
            }
          }

          const newFlights: Flight[] = [];
          const newTargetKeys = new Set<string>();
          const newKeyDelays: Record<string, number> = {};
          let flightId = 0;

          // Mid-screen band the swarm tangles within.
          const swarmPt = () => ({ x: rand(W * 0.18, W * 0.82), y: rand(H * 0.22, H * 0.62) });

          const addFlight = (
            key: string,
            sx: number,
            sy: number,
            hx: number,
            hy: number,
            charLabel: string,
          ) => {
            const keyRect = keycapRects[key];
            if (!keyRect) return;

            const tx = keyRect.left + keyRect.width / 2 - 10;
            const ty = keyRect.top + keyRect.height / 2 - 15;
            const landOffset = rand(PHASE.landMin, PHASE.landMax);
            const w1 = swarmPt();
            const w2 = swarmPt();

            newTargetKeys.add(key);
            // Keycap assembly time (ms) = exact moment this glyph reaches its slot.
            newKeyDelays[key] = landOffset * FLIGHT_D;

            newFlights.push({
              id: flightId++,
              char: charLabel,
              sx,
              sy,
              hx,
              hy,
              w1x: w1.x,
              w1y: w1.y,
              w2x: w2.x,
              w2y: w2.y,
              ax: tx + rand(-22, 22),
              ay: ty - rand(55, 95),
              tx,
              ty,
              rotA: rand(-50, 50),
              rotB: rand(-200, 200),
              rotC: rand(-160, 160),
              landOffset,
            });
          };

          const handledKeys = new Set<string>();

          // 1. Unique sentence keys detach in place, then hover just above the text.
          for (const [key, textIdx] of uniqueChars.entries()) {
            const charSpan = document.getElementById(`text-char-${textIdx}`);
            if (charSpan) {
              const r = charSpan.getBoundingClientRect();
              addFlight(key, r.left, r.top, r.left + rand(-45, 45), r.top - rand(45, 110), targetText[textIdx]);
              handledKeys.add(key);
            }
          }

          // 2. Keys not in the sentence spawn from below the screen and rise into the swarm.
          for (const key of Object.keys(keycapRects)) {
            if (handledKeys.has(key)) continue;
            const destX = keycapRects[key].left;
            let label = key;
            if (key === "backspace") label = "⌫";
            else if (key === "enter") label = "↵";
            else if (key === "shift") label = "Shift";
            else if (key === "space") label = "␣";

            addFlight(key, destX, H + 80, rand(W * 0.2, W * 0.8), rand(H * 0.4, H * 0.62), label);
          }

          setFlights(newFlights);
          setTargetKeys(newTargetKeys);
          setKeyDelays(newKeyDelays);
          setFrameRevealed(false);
          setUiState("flying");

          // Reveal the empty keyboard frame just before the first glyph lands.
          setTimeout(() => setFrameRevealed(true), LANDING_START);
          // Stage 5: tilt the completed flat keyboard back into 3D.
          setTimeout(() => {
            setUiState("diagnostics");
            setDiagnosticMode("surface");
          }, TILT_AT);
        } else if (uiState === "diagnostics") {
          setFrameRevealed(false);
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
        <div className={`kbd-wrap ${uiState === "flying" && !frameRevealed ? "frame-hidden" : ""}`} style={{ transform: "scale(0.95)" }}>
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
