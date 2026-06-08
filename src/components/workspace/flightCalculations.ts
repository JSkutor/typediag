import { Flight, PHASE, FLIGHT_DURATION } from "./flightChoreography";

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export interface CharRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function calculateFlights(
  targetText: string,
  keycapRects: Record<string, DOMRect | CharRect>,
  charRects: Record<number, CharRect>,
  winW: number,
  winH: number
): { flights: Flight[]; targetKeys: Set<string>; keyDelays: Record<string, number> } {
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

  const addFlight = (key: string, isFromText: boolean, sx: number, sy: number, charLabel: string, textIdx?: number) => {
    const keyRect = keycapRects[key];
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

  Array.from(uniqueCharsInText.entries()).forEach(([key, textIdx]) => {
    const r = charRects[textIdx];
    if (r) {
      addFlight(key, true, r.left + r.width / 2, r.top + r.height / 2, targetText[textIdx], textIdx);
    }
  });

  return { flights: newFlights, targetKeys: newTargetKeys, keyDelays: newKeyDelays };
}
